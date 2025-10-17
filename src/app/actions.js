// src/app/actions.js
'use server'; // This directive marks all functions in this file as Server Actions

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { emitServerEvent } from '@/lib/socket/serverEmitter';

export async function signOutUser() {
    const supabase = await getServerSupabaseClient();
    await supabase.auth.signOut();
    redirect('/login');
}

// Helper function to shuffle an array
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export async function submitPlayerAction(formData) {
    const supabase = await getServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You are not authenticated.' };

    const roundId = formData.get('roundId');
    const actionType = formData.get('actionType');
    const solveAttempt = formData.get('solveAttempt');
    const delegatedToId = formData.get('delegatedToId');

    const { data: existingAction, error: existingActionError } = await supabase
        .from('player_actions')
        .select('id')
        .eq('round_id', roundId)
        .eq('profile_id', user.id)
        .maybeSingle();

    if (existingActionError) {
        return { error: existingActionError.message };
    }

    if (existingAction) {
        return { error: 'You already submitted an action for this round.' };
    }

    if (actionType === 'delegate') {
        if (!delegatedToId) {
            return { error: 'Select a teammate before delegating.' };
        }

        const { data: lobbyMemberships, error: lobbyLookupError } = await supabase
            .from('lobby_participants')
            .select('profile_id, lobby_id')
            .in('profile_id', [user.id, delegatedToId]);

        if (lobbyLookupError) {
            return { error: lobbyLookupError.message };
        }

        const membershipMap = new Map((lobbyMemberships || []).map((row) => [row.profile_id, row.lobby_id]));

        const playerLobbyId = membershipMap.get(user.id);
        const delegateLobbyId = membershipMap.get(delegatedToId);

        if (!playerLobbyId || !delegateLobbyId || playerLobbyId !== delegateLobbyId) {
            return { error: 'You can only delegate to someone in your lobby.' };
        }

        if (delegatedToId === user.id) {
            return { error: 'You cannot delegate to yourself.' };
        }
    }

    const actionData = {
        round_id: roundId,
        profile_id: user.id,
        action_type: actionType,
        solve_attempt: actionType === 'solve' ? solveAttempt : null,
        delegated_to_id: actionType === 'delegate' ? delegatedToId : null,
    };

    const { error } = await supabase
        .from('player_actions')
        .insert(actionData);

    if (error) {
        return { error: `Database error: ${error.message}` };
    }

    return { success: true, message: `Your action '${actionType}' has been recorded!` };
}

export async function startGame(gameId) {
    const supabase = await getServerSupabaseClient();

    const { data: firstRound, error: firstRoundError } = await supabase
        .from('rounds')
        .select('*, domains(name)')
        .eq('game_id', gameId)
        .order('round_number', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (firstRoundError) {
        return { error: firstRoundError.message };
    }

    const { error } = await supabase
        .from('games')
        .update({
            status: 'active',
            current_round_number: firstRound?.round_number ?? null,
        })
        .eq('id', gameId);

    if (error) return { error: error.message };

    // Revalidate both the admin and player paths
    revalidatePath(`/admin/play/${gameId}`);
    revalidatePath(`/play/${gameId}`);
    revalidatePath(`/admin/manage/${gameId}`);

    return {
        success: true,
        firstRound: firstRound ? {
            ...firstRound,
            domains: firstRound.domains || { name: 'Uncategorized' },
        } : null,
    };
}

export async function assignPlayersRandomly(gameId, unassignedPlayerIds, lobbySize) {
    const supabase = await getServerSupabaseClient();

    if (!gameId || unassignedPlayerIds.length === 0 || lobbySize <= 0) {
        return { error: 'Invalid input for random assignment.' };
    }

    const shuffledPlayers = shuffleArray([...unassignedPlayerIds]);
    const numLobbies = Math.floor(shuffledPlayers.length / lobbySize);

    for (let i = 0; i < numLobbies; i++) {
        // 1. Create a new lobby
        const { data: newLobby, error: lobbyError } = await supabase
            .from('lobbies')
            .insert({ game_id: gameId, name: `Lobby ${i + 1}` })
            .select()
            .single();

        if (lobbyError) return { error: lobbyError.message };

        // 2. Assign players to this new lobby
        const playersForLobby = shuffledPlayers.slice(i * lobbySize, (i + 1) * lobbySize);
        const participants = playersForLobby.map(playerId => ({
            lobby_id: newLobby.id,
            profile_id: playerId,
        }));

        const { error: assignError } = await supabase
            .from('lobby_participants')
            .insert(participants);

        if (assignError) return { error: assignError.message };
    }

    revalidatePath(`/admin/manage/${gameId}`); // Refresh the data on the page
    return { success: true };
}

export async function manualAssignPlayer(gameId, lobbyId, profileId) {
    const supabase = await getServerSupabaseClient();

    const { error: cleanupError } = await supabase
        .from('lobby_participants')
        .delete()
        .eq('profile_id', profileId);

    if (cleanupError) {
        return { error: cleanupError.message };
    }

    const { error: insertError } = await supabase
        .from('lobby_participants')
        .insert({ lobby_id: lobbyId, profile_id: profileId });

    if (insertError) {
        return { error: insertError.message };
    }

    const { data: lobbyRecord } = await supabase
        .from('lobbies')
        .select('id, name')
        .eq('id', lobbyId)
        .maybeSingle();

    try {
        await emitServerEvent('admin:lobby_assigned', {
            gameId,
            profileId,
            lobbyId,
            lobbyName: lobbyRecord?.name || 'Lobby',
        });
    } catch (socketError) {
        console.error('Failed to emit lobby assignment', socketError);
    }

    revalidatePath(`/admin/manage/${gameId}`);
    revalidatePath(`/admin/play/${gameId}`);
    revalidatePath(`/play/${gameId}`);
    return { success: true };
}

export async function createLobby(gameId, name) {
    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
        .from('lobbies')
        .insert({ game_id: gameId, name })
        .select()
        .single();

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/admin/manage/${gameId}`);

    return { success: true, lobby: data };
}

export async function movePlayerToLobby(gameId, profileId, lobbyId) {
    return manualAssignPlayer(gameId, lobbyId, profileId);
}

export async function upsertPlayerRatings(profileId, ratings) {
    const supabase = await getServerSupabaseClient();

    const payload = ratings
        .filter((entry) => entry && typeof entry.domain_id === 'number')
        .map((entry) => ({
            profile_id: profileId,
            domain_id: entry.domain_id,
            rating: typeof entry.rating === 'number' ? entry.rating : 0,
            justification: entry.justification ?? '',
        }));

    if (payload.length === 0) {
        return { error: 'No ratings provided.' };
    }

    const { error } = await supabase
        .from('player_ratings')
        .upsert(payload, { onConflict: 'profile_id,domain_id' });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/rate-domains');

    return { success: true };
}

async function calculateScoresForRound(gameId, roundNumber) {
    console.log(`Starting score calculation for game ${gameId}, round ${roundNumber}`);
    const supabase = await getServerSupabaseClient();

    const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('id, correct_answer')
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .single();
    if (roundError || !roundData) {
        throw new Error('Failed to retrieve round metadata for scoring.');
    }

    const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('lambda, beta')
        .eq('id', gameId)
        .single();
    if (gameError || !gameData) {
        throw new Error('Missing game configuration for scoring.');
    }

    const { data: actions, error: actionsError } = await supabase
        .from('player_actions')
        .select('profile_id, action_type, solve_attempt, delegated_to_id')
        .eq('round_id', roundData.id);
    if (actionsError) {
        throw new Error('Failed to fetch player actions for scoring.');
    }

    const { error: clearScoresError } = await supabase
        .from('round_scores')
        .delete()
        .eq('round_id', roundData.id);

    if (clearScoresError) {
        throw new Error(`Failed to reset prior scores for this round: ${clearScoresError.message}`);
    }

    const lambdaRaw = Number(gameData.lambda);
    const betaRaw = Number(gameData.beta);
    const lambda = Number.isFinite(lambdaRaw) && lambdaRaw !== 0 ? lambdaRaw : 1;
    const beta = Number.isFinite(betaRaw) ? betaRaw : 0;

    const roundScores = new Map();
    const delegations = [];
    const correctSolvers = new Set();
    const trustCounts = new Map();

    // Seed baseline scores and capture actions
    for (const action of actions) {
        if (!roundScores.has(action.profile_id)) {
            roundScores.set(action.profile_id, 0);
        }

        if (action.action_type === 'solve') {
            if (action.solve_attempt === roundData.correct_answer) {
                roundScores.set(action.profile_id, 1);
                correctSolvers.add(action.profile_id);
            } else {
                roundScores.set(action.profile_id, -1);
            }
        } else if (action.action_type === 'pass') {
            roundScores.set(action.profile_id, 0);
        } else if (action.action_type === 'delegate' && action.delegated_to_id) {
            delegations.push({ delegatorId: action.profile_id, delegateeId: action.delegated_to_id });
            trustCounts.set(action.delegated_to_id, (trustCounts.get(action.delegated_to_id) || 0) + 1);
            if (!roundScores.has(action.delegated_to_id)) {
                roundScores.set(action.delegated_to_id, 0);
            }
        }
    }

    // Resolve delegation chains according to round-only points
    const maxIterations = delegations.length === 0 ? 0 : delegations.length * 2;
    for (let i = 0; i < maxIterations; i++) {
        let updated = false;
        for (const { delegatorId, delegateeId } of delegations) {
            const delegateeScore = roundScores.get(delegateeId) ?? 0;
            let newScore = 0;

            if (delegateeScore > 0) {
                newScore = lambda * delegateeScore;
            } else if (delegateeScore < 0) {
                newScore = delegateeScore / lambda;
            } else {
                newScore = -1;
            }

            if (roundScores.get(delegatorId) !== newScore) {
                roundScores.set(delegatorId, newScore);
                updated = true;
            }
        }
        if (!updated) break;
    }

    // Reputation bonus is applied after base scoring and delegation propagation
    for (const [playerId, trustedCount] of trustCounts.entries()) {
        if (trustedCount > 0) {
            const current = roundScores.get(playerId) ?? 0;
            if (current > 0) {
                roundScores.set(playerId, current + (beta * trustedCount));
            }
        }
    }

    // Cycle detection for delegate chains without solvers
    const delegationGraph = new Map(delegations.map(({ delegatorId, delegateeId }) => [delegatorId, delegateeId]));
    const cycleMembers = new Set();
    const visited = new Set();

    const findCycles = (startNode, path) => {
        visited.add(startNode);
        path.add(startNode);

        const delegatee = delegationGraph.get(startNode);
        if (!delegatee) return;

        if (path.has(delegatee)) {
            const cycle = [];
            let inCycle = false;
            for (const node of path) {
                if (node === delegatee) inCycle = true;
                if (inCycle) cycle.push(node);
            }
            const solverInCycle = cycle.some(id => correctSolvers.has(id));
            if (!solverInCycle) {
                cycle.forEach(member => cycleMembers.add(member));
            }
            return;
        }

        if (!visited.has(delegatee)) {
            findCycles(delegatee, new Set(path));
        }
    };

    for (const delegatorId of delegationGraph.keys()) {
        if (!visited.has(delegatorId)) {
            findCycles(delegatorId, new Set());
        }
    }

    if (cycleMembers.size > 0) {
        for (const memberId of cycleMembers) {
            roundScores.set(memberId, -1);
        }

        for (const { delegatorId, delegateeId } of delegations) {
            if (cycleMembers.has(delegateeId) && !cycleMembers.has(delegatorId)) {
                const current = roundScores.get(delegatorId) ?? 0;
                roundScores.set(delegatorId, current - (1 / lambda));
            }
        }
    }

    const participantIds = Array.from(roundScores.keys());
    let lastScores = [];

    if (participantIds.length > 0) {
        const { data: lastScoreRows, error: lastScoresError } = await supabase
            .from('round_scores')
            .select('profile_id, final_score_after_round')
            .in('profile_id', participantIds)
            .order('id', { ascending: false });

        if (lastScoresError) {
            throw new Error(`Failed to fetch previous scores: ${lastScoresError.message}`);
        }

        lastScores = lastScoreRows || [];
    }

    const finalScoresMap = new Map();
    for (const score of lastScores) {
        if (!finalScoresMap.has(score.profile_id)) {
            finalScoresMap.set(score.profile_id, score.final_score_after_round);
        }
    }

    const scoresToInsert = participantIds.map((profileId) => {
        const change = roundScores.get(profileId) ?? 0;
        const lastFinalScore = finalScoresMap.get(profileId) || 0;
        return {
            round_id: roundData.id,
            profile_id: profileId,
            score_change: change,
            final_score_after_round: lastFinalScore + change,
        };
    });

    if (scoresToInsert.length === 0) {
        console.log('No scores to record for this round.');
        return;
    }

    const { error: insertError } = await supabase.from('round_scores').insert(scoresToInsert);
    if (insertError) {
        throw new Error(`Failed to save scores: ${insertError.message}`);
    }

    console.log('Score calculation completed successfully.');
}

export async function deleteRoundAndUndoScores(gameId, roundNumber) {
    const supabase = await getServerSupabaseClient();

    try {
        // --- Step A: Find the round to be deleted ---
        const { data: roundToDelete, error: roundError } = await supabase
            .from('rounds')
            .select('id')
            .eq('game_id', gameId)
            .eq('round_number', roundNumber)
            .single();

        if (roundError || !roundToDelete) {
            return { error: 'Round not found.' };
        }
        const roundId = roundToDelete.id;

        // --- Step B: Get the score changes from this round to reverse them ---
        const { data: scoreChanges, error: scoresError } = await supabase
            .from('round_scores')
            .select('profile_id, score_change')
            .eq('round_id', roundId);

        if (scoresError) throw scoresError;

        // --- Step C: Delete all data associated with this round ---
        await Promise.all([
            supabase.from('player_actions').delete().eq('round_id', roundId),
            supabase.from('round_scores').delete().eq('round_id', roundId)
        ]);

        // --- Step D: Update the final scores of all SUBSEQUENT rounds ---
        if (scoreChanges.length > 0) {
            for (const change of scoreChanges) {
                await supabase.rpc('subtract_from_subsequent_scores', {
                    p_game_id: gameId,
                    p_start_round_number: roundNumber,
                    p_profile_id: change.profile_id,
                    p_value_to_subtract: change.score_change
                });
            }
        }

        // --- Step E: Delete the round itself ---
        await supabase.from('rounds').delete().eq('id', roundId);

        // --- Step F: Renumber all subsequent rounds ---
        const { error: renumberError } = await supabase.rpc('renumber_rounds_after_delete', {
            p_game_id: gameId,
            p_deleted_round_number: roundNumber,
        });

        if (renumberError) {
            return { error: renumberError.message };
        }

        // --- Step G: Update the game's current round pointer ---
        const { count: remainingRounds, error: remainingError } = await supabase
            .from('rounds')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId);

        if (remainingError) {
            return { error: remainingError.message };
        }

        const { data: nextPendingRound, error: pendingRoundError } = await supabase
            .from('rounds')
            .select('round_number')
            .eq('game_id', gameId)
            .eq('status', 'pending')
            .order('round_number', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (pendingRoundError) {
            return { error: pendingRoundError.message };
        }

        let currentRoundPointer;

        if (nextPendingRound) {
            currentRoundPointer = nextPendingRound.round_number;
        } else {
            const { data: lastRoundRecord, error: lastRoundError } = await supabase
                .from('rounds')
                .select('round_number')
                .eq('game_id', gameId)
                .order('round_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastRoundError) {
                return { error: lastRoundError.message };
            }

            const lastRoundNumber = lastRoundRecord?.round_number ?? 0;
            currentRoundPointer = lastRoundNumber + 1;
        }

        await supabase
            .from('games')
            .update({
                current_round_number: currentRoundPointer,
                status: remainingRounds === 0 ? 'pending' : 'active',
            })
            .eq('id', gameId);

        revalidatePath(`/admin/manage/${gameId}`);
        return { success: true };

    } catch (error) {
        return { error: `An error occurred: ${error.message}` };
    }
}

export async function endGame(gameId) {
    const supabase = await getServerSupabaseClient();
    const { error } = await supabase
        .from('games')
        .update({ status: 'completed', current_round_number: null })
        .eq('id', gameId);

    if (error) return { error: error.message };

    revalidatePath(`/admin/play/${gameId}`);
    revalidatePath(`/play/${gameId}`);
    revalidatePath(`/leaderboard/${gameId}`);
    revalidatePath(`/admin/manage/${gameId}`);
    return { success: true };
}

export async function processAndAdvanceRound(gameId, currentRoundNumber) {
    const supabase = await getServerSupabaseClient();

    // Step A: Calculate scores for the round that just ended.
    try {
        await calculateScoresForRound(gameId, currentRoundNumber);
    } catch (error) {
        console.error("Scoring failed:", error.message);
        return { error: `Scoping failed: ${error.message}` };
    }

    // Step B: Fetch the results of the round that just ended for broadcasting.
    const { data: prevRoundInfo } = await supabase
        .from('rounds').select('id, question_text, correct_answer').eq('game_id', gameId).eq('round_number', currentRoundNumber).single();

    const { data: scores } = await supabase
        .from('round_scores').select('profile_id, score_change, final_score_after_round').eq('round_id', prevRoundInfo.id);

    const { data: actions } = await supabase
        .from('player_actions').select('profile_id, action_type, delegated_to_id, profiles!player_actions_profile_id_fkey(username), profiles_delegated:profiles!player_actions_delegated_to_id_fkey(username)').eq('round_id', prevRoundInfo.id);

    const resultsData = {
        roundNumber: currentRoundNumber,
        question: prevRoundInfo.question_text,
        answer: prevRoundInfo.correct_answer,
        scores: scores || [],
        actions: actions || []
    };

    // Step C: Advance the game to the next round in the database.
    const { error: roundStatusError } = await supabase
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', prevRoundInfo.id);

    if (roundStatusError) {
        console.error('Failed to mark round as completed:', roundStatusError.message);
        return { error: 'Unable to close out the round.' };
    }

    const { data: nextPendingRound, error: pendingRoundError } = await supabase
        .from('rounds')
        .select('*, domains(name)')
        .eq('game_id', gameId)
        .eq('status', 'pending')
        .order('round_number', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (pendingRoundError) {
        console.error('Failed to look up pending rounds:', pendingRoundError.message);
        return { error: 'Unable to determine the next round.' };
    }

    let nextRoundData = nextPendingRound || null;
    let awaitingNextRound = false;
    let newCurrentRoundNumber;

    if (nextRoundData) {
        newCurrentRoundNumber = nextRoundData.round_number;
    } else {
        const { data: lastRoundRecord, error: lastRoundError } = await supabase
            .from('rounds')
            .select('round_number')
            .eq('game_id', gameId)
            .order('round_number', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastRoundError) {
            console.error('Failed to determine last round number:', lastRoundError.message);
            return { error: 'Unable to determine round progression.' };
        }

        const lastRoundNumber = lastRoundRecord?.round_number ?? currentRoundNumber;
        newCurrentRoundNumber = (lastRoundNumber ?? 0) + 1;
        awaitingNextRound = true;
    }

    const { error: updateError } = await supabase
        .from('games')
        .update({ current_round_number: newCurrentRoundNumber })
        .eq('id', gameId);

    if (updateError) {
        console.error('Failed to advance game state:', updateError.message);
        return { error: 'Failed to advance the game to the next round.' };
    }

    // Revalidate paths to keep server components updated.
    revalidatePath(`/admin/play/${gameId}`);
    revalidatePath(`/play/${gameId}`);

    return {
        success: true,
        resultsData,
        nextRoundData: nextRoundData || null,
        awaitingNextRound,
    };
}

export async function getLeaderboardMeta(gameId) {
    const supabase = await getServerSupabaseClient();

    const [{ data: gameData, error: gameError }, { data: roundsData, error: roundsError }] = await Promise.all([
        supabase
            .from('games')
            .select('name')
            .eq('id', gameId)
            .single(),
        supabase
            .from('rounds')
            .select('round_number')
            .eq('game_id', gameId)
            .order('round_number', { ascending: true }),
    ]);

    if (gameError) {
        throw new Error(gameError.message);
    }

    if (roundsError) {
        throw new Error(roundsError.message);
    }

    return {
        gameName: gameData?.name ?? 'Game leaderboard',
        roundNumbers: (roundsData || []).map((round) => round.round_number),
    };
}

export async function getLeaderboardData(gameId, roundNumber, lobbyId = null) {
    const supabase = await getServerSupabaseClient();

    let allowedProfileIds = null;
    if (lobbyId) {
        const { data: lobbyParticipants } = await supabase
            .from('lobby_participants')
            .select('profile_id')
            .eq('lobby_id', lobbyId);

        const participantIds = (lobbyParticipants || [])
            .map((participant) => participant.profile_id)
            .filter((id) => typeof id === 'string' && id.length > 0);

        allowedProfileIds = participantIds.length > 0 ? participantIds : [];

        if (Array.isArray(allowedProfileIds) && allowedProfileIds.length === 0) {
            return [];
        }
    }

    if (roundNumber === 'cumulative') {
        const { data: rounds, error: roundsError } = await supabase
            .from('rounds')
            .select('id, round_number')
            .eq('game_id', gameId)
            .order('round_number', { ascending: false });

        if (roundsError) {
            throw new Error(roundsError.message);
        }

        for (const round of rounds || []) {
            let scoresQuery = supabase
                .from('round_scores')
                .select('profile_id, final_score_after_round, profiles(username)')
                .eq('round_id', round.id)
                .order('final_score_after_round', { ascending: false });

            if (Array.isArray(allowedProfileIds)) {
                scoresQuery = scoresQuery.in('profile_id', allowedProfileIds);
            }

            const { data: scores, error: scoresError } = await scoresQuery;

            if (scoresError) {
                throw new Error(scoresError.message);
            }

            const filteredScores = scores || [];
            if (filteredScores.length > 0) {
                return filteredScores.map((item) => ({
                    profileId: item.profile_id,
                    score: item.final_score_after_round,
                    username: item.profiles?.username ?? 'Unknown player',
                }));
            }
        }

        return [];
    }

    const parsedRoundNumber = Number(roundNumber);
    if (!Number.isFinite(parsedRoundNumber)) {
        return [];
    }

    const { data: roundRecord, error: roundError } = await supabase
        .from('rounds')
        .select('id')
        .eq('game_id', gameId)
        .eq('round_number', parsedRoundNumber)
        .single();

    if (roundError || !roundRecord) {
        return [];
    }

    let roundScoresQuery = supabase
        .from('round_scores')
        .select('profile_id, score_change, profiles(username)')
        .eq('round_id', roundRecord.id)
        .order('score_change', { ascending: false });

    if (Array.isArray(allowedProfileIds)) {
        roundScoresQuery = roundScoresQuery.in('profile_id', allowedProfileIds);
    }

    const { data: scores, error: scoresError } = await roundScoresQuery;

    if (scoresError) {
        throw new Error(scoresError.message);
    }

    return (scores || []).map((item) => ({
        profileId: item.profile_id,
        score: item.score_change,
        username: item.profiles?.username ?? 'Unknown player',
    }));
}

export async function getRoundDelegationGraph(gameId, roundNumber, lobbyId = null) {
    if (roundNumber === 'cumulative') {
        return { edges: [], nodes: [] };
    }

    const parsedRoundNumber = Number(roundNumber);
    if (!Number.isFinite(parsedRoundNumber)) {
        return { edges: [], nodes: [] };
    }

    const supabase = await getServerSupabaseClient();

    let allowedProfileIds = null;
    if (lobbyId) {
        const { data: lobbyParticipants } = await supabase
            .from('lobby_participants')
            .select('profile_id')
            .eq('lobby_id', lobbyId);

        const participantIds = (lobbyParticipants || [])
            .map((participant) => participant.profile_id)
            .filter((id) => typeof id === 'string' && id.length > 0);

        allowedProfileIds = participantIds.length > 0 ? new Set(participantIds) : new Set();

        if (allowedProfileIds.size === 0) {
            return { edges: [], nodes: [] };
        }
    }

    const { data: roundRecord, error: roundError } = await supabase
        .from('rounds')
        .select('id')
        .eq('game_id', gameId)
        .eq('round_number', parsedRoundNumber)
        .single();

    if (roundError || !roundRecord) {
        return { edges: [], nodes: [] };
    }

    const { data: delegations, error: delegationError } = await supabase
        .from('player_actions')
        .select(`
            profile_id,
            delegated_to_id,
            action_type,
            profiles!player_actions_profile_id_fkey ( id, username ),
            delegate_profile:profiles!player_actions_delegated_to_id_fkey ( id, username )
        `)
        .eq('round_id', roundRecord.id)
        .eq('action_type', 'delegate');

    if (delegationError) {
        throw new Error(delegationError.message);
    }

    const edges = (delegations || [])
        .filter((entry) => entry.delegated_to_id)
        .map((entry) => ({
            fromId: entry.profile_id,
            fromName: entry.profiles?.username ?? 'Unknown player',
            toId: entry.delegated_to_id,
            toName: entry.delegate_profile?.username ?? 'Unknown player',
        }));

    const filteredEdges = allowedProfileIds instanceof Set
        ? edges.filter((edge) => allowedProfileIds.has(edge.fromId) && allowedProfileIds.has(edge.toId))
        : edges;

    filteredEdges.sort((a, b) => {
        const fromCompare = (a.fromName || '').localeCompare(b.fromName || '');
        if (fromCompare !== 0) return fromCompare;
        return (a.toName || '').localeCompare(b.toName || '');
    });

    const nodes = new Map();
    const edgeSource = filteredEdges;
    for (const edge of edgeSource) {
        if (!nodes.has(edge.fromId)) {
            nodes.set(edge.fromId, { id: edge.fromId, name: edge.fromName });
        }
        if (!nodes.has(edge.toId)) {
            nodes.set(edge.toId, { id: edge.toId, name: edge.toName });
        }
    }

    return {
        edges: filteredEdges,
        nodes: Array.from(nodes.values()),
    };
}

export async function updateRoundDetails(gameId, roundNumber, updates) {
    const supabase = await getServerSupabaseClient();

    const { data: round, error: roundError } = await supabase
        .from('rounds')
        .select('id, round_number')
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .single();

    if (roundError || !round) {
        return { error: 'Round not found.' };
    }

    const payload = {};

    if (typeof updates.questionText === 'string') {
        payload.question_text = updates.questionText;
    }

    if (typeof updates.correctAnswer === 'string') {
        payload.correct_answer = updates.correctAnswer;
    }

    if (typeof updates.domainId === 'number' && Number.isFinite(updates.domainId)) {
        payload.domain_id = updates.domainId;
    }

    if (Object.keys(payload).length === 0) {
        return { error: 'No updates provided.' };
    }

    const { error: updateError } = await supabase
        .from('rounds')
        .update(payload)
        .eq('id', round.id);

    if (updateError) {
        return { error: updateError.message };
    }

    const recalcResult = await recomputeScoresFromRound(supabase, gameId, round.round_number ?? roundNumber);
    if (recalcResult?.error) {
        return { error: `Round updated, but score recalculation failed: ${recalcResult.error}` };
    }

    revalidatePath(`/admin/manage/${gameId}`);
    revalidatePath(`/admin/play/${gameId}`);
    revalidatePath(`/play/${gameId}`);
    revalidatePath(`/leaderboard/${gameId}`);

    return { success: true };
}

async function recomputeScoresFromRound(supabase, gameId, startingRoundNumber) {
    const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, round_number, status')
        .eq('game_id', gameId)
        .gte('round_number', startingRoundNumber)
        .order('round_number', { ascending: true });

    if (roundsError) {
        return { error: roundsError.message };
    }

    if (!rounds || rounds.length === 0) {
        return { success: true };
    }

    const roundIds = rounds
        .map((round) => round.id)
        .filter((id) => typeof id !== 'undefined' && id !== null);

    const completedRoundIds = new Set();

    if (roundIds.length > 0) {
        const { data: existingScores, error: existingScoresError } = await supabase
            .from('round_scores')
            .select('round_id')
            .in('round_id', roundIds);

        if (existingScoresError) {
            return { error: existingScoresError.message };
        }

        (existingScores || []).forEach(({ round_id }) => {
            if (typeof round_id !== 'undefined' && round_id !== null) {
                completedRoundIds.add(round_id);
            }
        });

        if (completedRoundIds.size > 0) {
            const { error: deleteError } = await supabase
                .from('round_scores')
                .delete()
                .in('round_id', Array.from(completedRoundIds));

            if (deleteError) {
                return { error: deleteError.message };
            }
        }
    }

    for (const round of rounds) {
        const nextRoundNumber = Number(round.round_number);
        if (!Number.isFinite(nextRoundNumber)) {
            continue;
        }

        if (!completedRoundIds.has(round.id)) {
            continue;
        }

        try {
            await calculateScoresForRound(gameId, nextRoundNumber);
        } catch (error) {
            return { error: error.message || 'Failed to recalculate scores.' };
        }
    }

    return { success: true };
}