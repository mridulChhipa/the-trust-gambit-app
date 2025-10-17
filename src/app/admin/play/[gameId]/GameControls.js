// src/app/admin/play/[gameId]/GameControls.js
'use client';

import { useMemo, useState, useTransition } from 'react';
import { startGame, processAndAdvanceRound, endGame } from '../../../actions';
import { useSocket } from '../../../../hooks/useSocket';

export default function GameControls({ game, awaitingNextRound }) {
    const [isPending, startTransition] = useTransition();
    const socket = useSocket(game.id);
    const [feedback, setFeedback] = useState(null);

    const { statusCopy, primaryCta, secondaryCta } = useMemo(() => {
        const state = (game.status || '').toLowerCase();
        if (state === 'pending') {
            return {
                statusCopy: 'Ready to launch',
                primaryCta: 'Start game',
                secondaryCta: 'Double-check every lobby assignment before you go live.',
            };
        }
        if (state === 'active') {
            if (awaitingNextRound) {
                return {
                    statusCopy: `Awaiting round ${game.current_round_number}`,
                    primaryCta: null,
                    secondaryCta: 'Add a new round from the manage view to keep the momentum going.',
                };
            }
            return {
                statusCopy: `Round ${game.current_round_number} live`,
                primaryCta: `End round ${game.current_round_number}`,
                secondaryCta: 'Process scores to broadcast the next prompt instantly.',
            };
        }
        if (state === 'completed') {
            return {
                statusCopy: 'Game wrapped',
                primaryCta: null,
                secondaryCta: 'Results archived. Kick players back to the dashboard when you are ready.',
            };
        }
        return {
            statusCopy: 'Unknown state',
            primaryCta: null,
            secondaryCta: 'Check Supabase if this persists.',
        };
    }, [game.status, game.current_round_number, awaitingNextRound]);

    const handleStartGame = () => {
        startTransition(async () => {
            const result = await startGame(game.id);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
                return;
            }

            if (socket) {
                // Trigger players to reload without waiting for polling.
                socket.emit('admin:start_game', {
                    gameId: game.id,
                    firstRoundData: result.firstRound ?? null,
                });
            }
            setFeedback({ type: 'success', message: 'Game launched. Players are receiving the opening prompt.' });
        });
    };

    const handleNextRound = () => {
        if (awaitingNextRound) {
            setFeedback({ type: 'error', message: 'No active round to process yet. Create or enable the next round before ending it.' });
            return;
        }
        if (!socket) {
            setFeedback({ type: 'error', message: 'Socket not connected. Check the realtime service and try again.' });
            return;
        }

        startTransition(async () => {
            const result = await processAndAdvanceRound(game.id, game.current_round_number);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
                return;
            }

            socket.emit('admin:end_round', {
                gameId: game.id,
                resultsData: result.resultsData,
                nextRoundData: result.nextRoundData,
            });
            if (result.awaitingNextRound) {
                setFeedback({ type: 'success', message: 'Round processed. Waiting on the next prompt—add a new round to continue.' });
            } else {
                setFeedback({ type: 'success', message: 'Round processed. Results broadcast and next prompt queued.' });
            }
        });
    };

    const handleEndGame = () => {
        const confirmed = window.confirm('End the game now? Players will be sent to the wrap-up view.');
        if (!confirmed) return;

        startTransition(async () => {
            const result = await endGame(game.id);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
                return;
            }

            if (socket) {
                socket.emit('admin:end_game', { gameId: game.id });
            }

            setFeedback({ type: 'success', message: 'Game marked as completed. Players are now in wrap-up mode.' });
        });
    };

    if (game.status === 'completed') {
        return (
            <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-slate-900/60 p-8 text-white shadow-xl shadow-black/30 backdrop-blur-lg">
                <h2 className="text-xl font-semibold uppercase tracking-[0.35em] text-white/70">Final state</h2>
                <p className="mt-4 text-3xl font-bold">Game completed</p>
                <p className="mt-3 text-sm text-white/70">{secondaryCta}</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col justify-between rounded-3xl border border-white/12 bg-white/10 p-8 text-white shadow-2xl backdrop-blur">
            <div>
                <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-white/75">
                    Game status
                </span>
                <h2 className="mt-4 text-4xl font-bold leading-tight text-white">{statusCopy}</h2>
                <p className="mt-3 text-sm text-white/70">{secondaryCta}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <InfoChip label="Round" value={game.current_round_number ?? '—'} awaiting={awaitingNextRound} />
                    <InfoChip label="State code" value={(game.status || 'unknown').toUpperCase()} />
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {game.status === 'pending' && (
                    <button
                        onClick={handleStartGame}
                        disabled={isPending}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-[1px] hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/60"
                    >
                        {isPending ? 'Launching…' : primaryCta}
                    </button>
                )}

                {game.status === 'active' && !awaitingNextRound && (
                    <button
                        onClick={handleNextRound}
                        disabled={isPending}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-indigo-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-[1px] hover:bg-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/60"
                    >
                        {isPending ? 'Processing…' : primaryCta}
                    </button>
                )}

                {game.status === 'active' && awaitingNextRound && (
                    <span className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                        Waiting for the next round
                    </span>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                >
                    Refresh view
                </button>
            </div>

            {game.status !== 'completed' && (
                <div className="mt-4">
                    <button
                        onClick={handleEndGame}
                        disabled={isPending}
                        className="inline-flex w-full items-center justify-center rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:-translate-y-[1px] hover:bg-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-not-allowed disabled:bg-rose-500/40"
                    >
                        {isPending ? 'Processing…' : 'End game now'}
                    </button>
                </div>
            )}

            {feedback && (
                <div
                    role="status"
                    className={`mt-6 rounded-2xl border px-4 py-3 text-sm shadow-lg shadow-black/40 ${feedback.type === 'error' ? 'border-red-400/50 bg-red-500/10 text-red-100' : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'}`}
                >
                    <div className="flex items-start justify-between gap-4">
                        <span>{feedback.message}</span>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:text-white"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoChip({ label, value, awaiting }) {
    const displayValue = awaiting && label === 'Round'
        ? `${value ?? '—'} • queued`
        : value ?? '—';

    return (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-5 text-left shadow-inner shadow-white/5">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">{label}</p>
            <p className="mt-3 text-lg font-semibold text-white">{displayValue}</p>
        </div>
    );
}