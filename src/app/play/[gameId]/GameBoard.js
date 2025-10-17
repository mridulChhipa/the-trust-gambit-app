'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import { getLeaderboardData } from '../../actions';
import RoundResults from './RoundResults';
import PlayerActions from './PlayerActions';
import ModalOverlay from '@/components/layout/ModalOverlay';

export default function GameBoard({
    initialGame,
    initialRound,
    initialPreviousRoundResults,
    lobbyPlayers,
    lobbyPlayerRatings,
    initialPlayerAction,
    playerIdentity,
    playerLobbyId,
}) {
    const router = useRouter();
    const allowedProfileIds = useMemo(() => {
        const ids = new Set();
        if (playerIdentity?.id) {
            ids.add(playerIdentity.id);
        }
        (lobbyPlayers || []).forEach((player) => {
            const candidateId = player?.profiles?.id;
            if (candidateId) {
                ids.add(candidateId);
            }
        });
        return ids;
    }, [playerIdentity?.id, lobbyPlayers]);

    const filterResultsByLobby = useCallback((payload) => {
        if (!payload) {
            return null;
        }

        const filterList = (list) => (list || []).filter((item) => allowedProfileIds.has(item.profile_id));

        return {
            ...payload,
            scores: filterList(payload.scores).map((score) => ({ ...score })),
            actions: filterList(payload.actions).map((action) => ({ ...action })),
        };
    }, [allowedProfileIds]);

    const [gameEnded, setGameEnded] = useState(initialGame.status === 'completed');
    const [currentRound, setCurrentRound] = useState(initialRound);
    const [results, setResults] = useState(() => filterResultsByLobby(initialPreviousRoundResults));
    const [awaitingNextRound, setAwaitingNextRound] = useState(!initialRound && initialGame.status !== 'completed');
    const [playerAction, setPlayerAction] = useState(initialPlayerAction || null);
    const [showGameStartModal, setShowGameStartModal] = useState(false);
    const [showRoundModal, setShowRoundModal] = useState(false);
    const [roundLeaderboard, setRoundLeaderboard] = useState([]);
    const [roundNumberLabel, setRoundNumberLabel] = useState(null);
    const [showFinalModal, setShowFinalModal] = useState(false);
    const [finalLeaderboard, setFinalLeaderboard] = useState([]);
    const [loadingFinalLeaderboard, setLoadingFinalLeaderboard] = useState(false);
    const [finalLoadError, setFinalLoadError] = useState(null);
    const [showLobbyAssignmentModal, setShowLobbyAssignmentModal] = useState(false);
    const [lobbyAssignmentNotice, setLobbyAssignmentNotice] = useState(null);
    const socket = useSocket(initialGame.id);

    const [viewMode, setViewMode] = useState(() => (results ? 'results' : 'question'));

    useEffect(() => {
        if (!socket) return;

        const handleGameStarted = () => {
            setShowGameStartModal(true);
            setGameEnded(false);
            setAwaitingNextRound(true);
            setViewMode('question');
            setCurrentRound(null);
            setResults(null);
            setRoundLeaderboard([]);
            setRoundNumberLabel(null);
            setPlayerAction(null);
        };

        const handleRoundResults = (resultsData) => {
            const filtered = filterResultsByLobby(resultsData);
            setResults(filtered);
            setViewMode('results');
            setShowRoundModal(true);
        };

        const handleNewRound = (nextRoundData) => {
            if (nextRoundData) {
                setAwaitingNextRound(false);
                setCurrentRound(nextRoundData);
                setGameEnded(false);
                setViewMode('question');
                setShowRoundModal(false);
                setShowGameStartModal(false);
                setPlayerAction(null);
            } else {
                setAwaitingNextRound(true);
                setCurrentRound(null);
            }
        };

        const handleGameEnd = () => {
            setAwaitingNextRound(false);
            setGameEnded(true);
            setCurrentRound(null);
            setShowRoundModal(false);
            setShowGameStartModal(false);
            setShowFinalModal(true);
            setLoadingFinalLeaderboard(true);
            setFinalLoadError(null);
            setFinalLeaderboard([]);
            setPlayerAction(null);

            (async () => {
                try {
                    const data = await getLeaderboardData(initialGame.id, 'cumulative', playerLobbyId);
                    const filtered = Array.isArray(data)
                        ? data.filter((entry) => {
                            if (!playerLobbyId) {
                                return true;
                            }
                            if (!(entry && typeof entry === 'object' && 'profileId' in entry)) {
                                return false;
                            }
                            return allowedProfileIds.has(entry.profileId);
                        })
                        : [];

                    const leaderboardPayload = playerLobbyId ? filtered : (Array.isArray(data) ? data : []);
                    setFinalLeaderboard(leaderboardPayload);
                } catch (error) {
                    console.error('Failed to load final leaderboard', error);
                    setFinalLeaderboard([]);
                    setFinalLoadError('Unable to load leaderboard right now.');
                } finally {
                    setLoadingFinalLeaderboard(false);
                }
            })();
        };

        socket.on('game:started', handleGameStarted);
        socket.on('game:round_results', handleRoundResults);
        socket.on('game:new_round', handleNewRound);
        socket.on('game:end', handleGameEnd);

        return () => {
            socket.off('game:started', handleGameStarted);
            socket.off('game:round_results', handleRoundResults);
            socket.off('game:new_round', handleNewRound);
            socket.off('game:end', handleGameEnd);
        };
    }, [socket, initialGame.id, filterResultsByLobby, playerLobbyId, allowedProfileIds]);

    useEffect(() => {
        if (!socket || !playerIdentity?.id) {
            return;
        }

        const handleLobbyAssigned = (assignment) => {
            if (!assignment || assignment.profileId !== playerIdentity.id) {
                return;
            }

            setLobbyAssignmentNotice(assignment);
            setShowLobbyAssignmentModal(true);
        };

        socket.on('lobby:assigned', handleLobbyAssigned);

        return () => {
            socket.off('lobby:assigned', handleLobbyAssigned);
        };
    }, [socket, playerIdentity?.id, router]);

    const handleLobbyModalClose = () => {
        setShowLobbyAssignmentModal(false);
        router.refresh();
    };

    useEffect(() => {
        if (viewMode === 'results') {
            const timer = setTimeout(() => {
                setViewMode('question');
            }, 15000);

            return () => clearTimeout(timer);
        }
    }, [viewMode, results]);

    useEffect(() => {
        setResults(filterResultsByLobby(initialPreviousRoundResults));
    }, [initialPreviousRoundResults, filterResultsByLobby]);

    useEffect(() => {
        if (!results) {
            setRoundLeaderboard([]);
            setRoundNumberLabel(null);
            return;
        }

        const usernameByProfileId = new Map(
            (results.actions || []).map((action) => [
                action.profile_id,
                action.profiles?.username || 'Unknown player',
            ])
        );

        const leaderboardEntries = (results.scores || []).map((entry) => {
            const totalScore = typeof entry.final_score_after_round === 'number' ? entry.final_score_after_round : 0;
            const scoreDelta = typeof entry.score_change === 'number' ? entry.score_change : 0;
            return {
                profileId: entry.profile_id,
                username: usernameByProfileId.get(entry.profile_id) || 'Unknown player',
                totalScore,
                scoreDelta,
            };
        });

        leaderboardEntries.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
        setRoundLeaderboard(leaderboardEntries);
        setRoundNumberLabel(results.roundNumber ?? null);
    }, [results]);

    let content = null;

    if (gameEnded) {
        content = (
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                        Game over
                    </span>
                    <h2 className="mt-4 text-3xl font-bold">Thanks for playing!</h2>
                    <p className="mt-2 text-sm text-white/70">
                        Review your final results below and sync with your lobby to debrief the trust dynamics.
                    </p>
                </div>
                <div className="mt-6">
                    {results && <RoundResults results={results} />}
                </div>
            </div>
        );
    } else if (awaitingNextRound) {
        const awaitingTitle = initialGame.status === 'pending'
            ? 'Game will start soon'
            : 'Stand by for the next round';
        const awaitingSubtitle = initialGame.status === 'pending'
            ? 'Your admin is getting everything ready. You will see the first prompt here the moment the game launches.'
            : 'Your admin is prepping the next challenge. Stay ready—new prompts appear here the moment they are released.';

        content = (
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                        {initialGame.status === 'pending' ? 'Awaiting launch' : 'Next prompt pending'}
                    </span>
                    <h2 className="mt-4 text-3xl font-bold">{awaitingTitle}</h2>
                    <p className="mt-2 text-sm text-white/70">{awaitingSubtitle}</p>
                </div>
                <div className="mt-6">
                    {results && <RoundResults results={results} />}
                </div>
            </div>
        );
    } else if (viewMode === 'results') {
        content = (
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur">
                <RoundResults results={results} />
            </div>
        );
    } else {
        content = (
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
                <PlayerActions
                    round={currentRound}
                    game={initialGame}
                    lobbyPlayers={lobbyPlayers}
                    lobbyPlayerRatings={lobbyPlayerRatings}
                    playerAction={playerAction}
                    onActionSubmitted={(action) => setPlayerAction(action)}
                />
            </div>
        );
    }

    return (
        <>
            {content}

            {showGameStartModal && (
                <ModalOverlay onClose={() => setShowGameStartModal(false)}>
                    <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/90 p-8 text-white shadow-2xl">
                        <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
                            Game live
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold">Your game just launched</h2>
                        <p className="mt-3 text-sm text-white/70">
                            The admin started the session. Follow the prompt and lock your move before the round closes.
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowGameStartModal(false)}
                                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:bg-slate-100"
                            >
                                Let’s play
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {showRoundModal && (
                <ModalOverlay onClose={() => setShowRoundModal(false)}>
                    <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-900/95 p-8 text-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                                    Round wrap
                                </span>
                                <h2 className="mt-4 text-2xl font-semibold">
                                    {roundNumberLabel ? `Round ${roundNumberLabel} leaderboard` : 'Round leaderboard'}
                                </h2>
                                <p className="mt-3 text-sm text-white/70">
                                    Here’s how standings shifted. Review the board, then get ready for the next prompt.
                                </p>
                            </div>
                        </div>

                        {roundLeaderboard.length === 0 ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                                No scores to display for this round yet.
                            </div>
                        ) : (
                            <>
                                <ul className="mt-6 space-y-3">
                                    {roundLeaderboard.map((entry, index) => (
                                        <li
                                            key={entry.profileId || `${entry.username}-${index}`}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{entry.username}</p>
                                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                                        <span className={`font-semibold ${entry.scoreDelta >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                                                            {entry.scoreDelta >= 0 ? '+' : ''}{entry.scoreDelta.toFixed(2)}
                                                        </span>
                                                        <span className="uppercase tracking-[0.2em] text-white/50">round</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-xs uppercase tracking-[0.2em] text-white/50">Total</span>
                                                <span className="font-mono text-sm font-semibold text-white">
                                                    {entry.totalScore.toFixed(2)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowRoundModal(false)}
                                        className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                    >
                                        Back to game
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </ModalOverlay>
            )}

            {showFinalModal && (
                <ModalOverlay onClose={() => setShowFinalModal(false)}>
                    <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-900/95 p-8 text-white shadow-2xl">
                        <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                            Final standings
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold">Game complete</h2>
                        <p className="mt-3 text-sm text-white/70">
                            These are the final cumulative scores. Screenshot or head to the leaderboard view for the full breakdown.
                        </p>

                        {loadingFinalLeaderboard ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                                Loading leaderboard…
                            </div>
                        ) : finalLoadError ? (
                            <div className="mt-6 rounded-2xl border border-rose-300/60 bg-rose-400/20 p-4 text-sm text-rose-100">
                                {finalLoadError}
                            </div>
                        ) : finalLeaderboard.length === 0 ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                                No final scores available yet.
                            </div>
                        ) : (
                            <ul className="mt-6 space-y-3">
                                {finalLeaderboard.map((entry, index) => (
                                    <li
                                        key={entry.profileId || `${entry.username}-${index}`}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm font-semibold text-white">{entry.username || 'Unnamed player'}</p>
                                        </div>
                                        <span className="font-mono text-sm font-semibold text-white">
                                            {typeof entry.score === 'number' ? entry.score.toFixed(2) : entry.score}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowFinalModal(false)}
                                className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                Close
                            </button>
                            <a
                                href={`/leaderboard/${initialGame.id}`}
                                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:bg-slate-100"
                            >
                                View leaderboard
                            </a>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {showLobbyAssignmentModal && (
                <ModalOverlay onClose={handleLobbyModalClose}>
                    <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/95 p-8 text-white shadow-2xl">
                        <span className="inline-flex items-center rounded-full border border-sky-300/40 bg-sky-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                            Lobby update
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold">You have a new lobby assignment</h2>
                        <p className="mt-3 text-sm text-white/70">
                            {lobbyAssignmentNotice?.lobbyName
                                ? `You were just moved into "${lobbyAssignmentNotice.lobbyName}".`
                                : 'You were just moved into a new lobby.'}
                            {' '}Sync up with your teammates and get ready for the next prompt.
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleLobbyModalClose}
                                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:bg-slate-100"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </>
    );
}
