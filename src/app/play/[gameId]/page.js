// src/app/play/[gameId]/page.js
import Link from 'next/link';
import { redirect } from 'next/navigation';
import GameBoard from './GameBoard';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import BadgePill from '@/components/ui/BadgePill';

async function getActiveRoundData(gameId) {
    const supabase = await getServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role === 'admin') {
        redirect(`/admin/manage/${gameId}`);
    }

    const userId = user.id;

    const playerIdentity = {
        id: userId,
        username: profile?.username || user.email,
    };

    // Determine the lobby the player belongs to
    let lobbyPlayers = [];
    const { data: lobbyMembership } = await supabase
        .from('lobby_participants')
        .select('lobby_id')
        .eq('profile_id', userId)
        .maybeSingle();

    const playerLobbyId = lobbyMembership?.lobby_id ?? null;

    if (playerLobbyId) {
        const { data: lobbyParticipants } = await supabase
            .from('lobby_participants')
            .select('profiles(id, username)')
            .eq('lobby_id', playerLobbyId);

        lobbyPlayers = (lobbyParticipants || []).filter((participant) => participant.profiles?.id !== userId);
    }

    const { data: game, error: gameError } = await supabase
        .from('games').select('id, name, status, current_round_number').eq('id', gameId).single();

    if (gameError || !game) return { game: null };

    let currentRound = null;
    if (game.status === 'active') {
        const { data } = await supabase
            .from('rounds').select('*, domains(name)').eq('game_id', gameId).eq('round_number', game.current_round_number).single();
        currentRound = data;
    }

    let previousRoundResults = null;
    let playerAction = null;
    const previousRoundNumber = game.current_round_number - 1;
    if (previousRoundNumber > 0) {
        const { data: prevRoundInfo } = await supabase
            .from('rounds').select('id, question_text, correct_answer').eq('game_id', gameId).eq('round_number', previousRoundNumber).single();

        if (prevRoundInfo) {
            const { data: scores } = await supabase
                .from('round_scores').select('profile_id, score_change, final_score_after_round').eq('round_id', prevRoundInfo.id);

            const { data: actions } = await supabase
                .from('player_actions').select('profile_id, action_type, delegated_to_id, profiles!player_actions_profile_id_fkey(username), profiles_delegated:profiles!player_actions_delegated_to_id_fkey(username)').eq('round_id', prevRoundInfo.id);

            previousRoundResults = {
                roundNumber: previousRoundNumber,
                question: prevRoundInfo.question_text,
                answer: prevRoundInfo.correct_answer,
                scores: scores || [],
                actions: actions || []
            };
        }
    }

    let lobbyPlayerRatings = [];
    if (currentRound) {
        const { data: existingAction } = await supabase
            .from('player_actions')
            .select('action_type, solve_attempt, delegated_to_id')
            .eq('round_id', currentRound.id)
            .eq('profile_id', userId)
            .maybeSingle();

        if (existingAction) {
            playerAction = existingAction;
        }
    }

    if (currentRound && lobbyPlayers.length > 0) {
        const playerIds = lobbyPlayers.map(p => p.profiles.id);
        const { data: ratings } = await supabase
            .from('player_ratings')
            .select('profile_id, rating, justification')
            .in('profile_id', playerIds)
            .eq('domain_id', currentRound.domain_id);

        lobbyPlayerRatings = ratings || [];
    }

    return {
        game,
        currentRound,
        previousRoundResults,
        lobbyPlayers,
        lobbyPlayerRatings,
        playerIdentity,
        playerAction,
        playerLobbyId,
    };
}

export default async function PlayPage({ params }) {
    const { gameId } = await params;
    const data = await getActiveRoundData(gameId);

    const { game, currentRound, previousRoundResults, lobbyPlayers, lobbyPlayerRatings, playerIdentity, playerAction, playerLobbyId } = data;

    if (!game) {
        return (
            <div className="relative min-h-screen bg-slate-950 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(circle_at_85%_15%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.18),transparent_60%)]" />
                <div className="relative mx-auto flex min-h-screen flex-col items-center justify-center px-4 text-center">
                    <h1 className="text-3xl font-bold">This game could not be found.</h1>
                    <p className="mt-2 text-white/70">Check the link or head back to your dashboard.</p>
                    <Link
                        href="/"
                        className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-[1px] hover:shadow-2xl"
                    >
                        Return to home
                    </Link>
                </div>
            </div>
        );
    }

    const isGameCompleted = game.status === 'completed';
    const hasActiveRound = Boolean(currentRound);
    const heroBadge = isGameCompleted
        ? 'Game completed'
        : hasActiveRound
            ? `Live round ${currentRound.round_number}`
            : game.status === 'active'
                ? 'Next prompt pending'
                : 'Awaiting launch';
    const heroSubtitle = isGameCompleted
        ? 'The final round has wrapped. Review results from your dashboard.'
        : hasActiveRound
            ? 'Stay sharp and choose your move before the timer runs out.'
            : game.status === 'active'
                ? 'Scores are being tallied. Your admin will cue the next round shortly.'
                : 'Your admin will launch the first round soon. Hang tight.';

    return (
        <div className="relative min-h-screen bg-slate-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(circle_at_82%_12%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.18),transparent_60%)]" />
            <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-10">
                <header className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <BadgePill size="lg">{heroBadge}</BadgePill>
                            <h1 className="mt-4 text-3xl font-bold leading-tight text-white">{game.name}</h1>
                            <p className="mt-2 text-sm text-white/70">{heroSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white">
                                {playerIdentity.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-white/60">You are playing as</p>
                                <p className="text-sm font-semibold text-white">{playerIdentity.username}</p>
                                <p className="text-xs text-white/50">Game ID: {game.id}</p>
                            </div>
                                <Link
                                    href={`/leaderboard/${game.id}`}
                                    className="ml-auto text-center inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40 hover:bg-white/10"
                                >
                                    View leaderboard
                                </Link>
                        </div>
                    </div>
                </header>

                <section className="mt-10">
                    <GameBoard
                        initialGame={game}
                        initialRound={currentRound}
                        initialPreviousRoundResults={previousRoundResults}
                        lobbyPlayers={lobbyPlayers}
                        lobbyPlayerRatings={lobbyPlayerRatings}
                        initialPlayerAction={playerAction}
                        playerLobbyId={playerLobbyId}
                        playerIdentity={playerIdentity}
                    />
                </section>
            </main>
        </div>
    );
}
