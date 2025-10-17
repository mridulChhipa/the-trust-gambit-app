// src/app/play/[gameId]/PlayerActions.js
'use client';

import { useState, useEffect, useTransition } from 'react';
import { submitPlayerAction } from '../../actions';

export default function PlayerActions({ round, game, lobbyPlayers, lobbyPlayerRatings, playerAction, onActionSubmitted }) {
    const [isPending, startTransition] = useTransition();
    const [actionType, setActionType] = useState(playerAction?.action_type ?? null);
    const [solveAttempt, setSolveAttempt] = useState(playerAction?.solve_attempt ?? '');
    const [delegatedToId, setDelegatedToId] = useState(playerAction?.delegated_to_id ?? '');
    const [formMessage, setFormMessage] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(Boolean(playerAction));

    useEffect(() => {
        if (playerAction) {
            setActionType(playerAction.action_type ?? null);
            setSolveAttempt(playerAction.solve_attempt ?? '');
            setDelegatedToId(playerAction.delegated_to_id ?? '');
        } else {
            setActionType(null);
            setSolveAttempt('');
            setDelegatedToId('');
        }
        setFormMessage('');
        setHasSubmitted(Boolean(playerAction));
    }, [round.id, playerAction]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (hasSubmitted) {
            setFormMessage('You already submitted your action for this round.');
            return;
        }

        if (!actionType) {
            setFormMessage('Please select an action.');
            return;
        }

        const formData = new FormData(e.target);
        formData.set('roundId', round.id);
        formData.set('actionType', actionType);
        if (actionType === 'delegate') {
            formData.set('delegatedToId', delegatedToId);
        }

        startTransition(async () => {
            const result = await submitPlayerAction(formData);
            if (result.error) {
                setFormMessage(`Error: ${result.error}`);
            } else {
                setFormMessage(result.message);
                setHasSubmitted(true);
                if (typeof onActionSubmitted === 'function') {
                    onActionSubmitted({
                        action_type: actionType,
                        solve_attempt: actionType === 'solve' ? solveAttempt : null,
                        delegated_to_id: actionType === 'delegate' ? delegatedToId : null,
                    });
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Round {round.round_number}</p>
                        <h2 className="mt-2 text-2xl font-semibold">{round.domains.name}</h2>
                        <p className="mt-1 text-sm text-white/70">{game.name}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                        Question prompt
                    </span>
                </div>
                <p className="mt-4 text-lg font-medium leading-relaxed text-white/90">{round.question_text}</p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl">
                <h3 className="text-lg font-semibold text-white">Choose your action</h3>
                <p className="text-xs text-white/60">
                    {hasSubmitted ? 'You already locked in your move this round. Hang tight for the recap.' : 'Make your move before the timer hits zero.'}
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <ActionCard
                        label="Solve"
                        description="Take the problem into your own hands."
                        selected={actionType === 'solve'}
                        onSelect={() => setActionType('solve')}
                        disabled={hasSubmitted || isPending}
                    />
                    <ActionCard
                        label="Delegate"
                        description="Back a teammate who can carry the round."
                        selected={actionType === 'delegate'}
                        onSelect={() => setActionType('delegate')}
                        disabled={hasSubmitted || isPending}
                    />
                    <ActionCard
                        label="Pass"
                        description="Hold steady and conserve your standing."
                        selected={actionType === 'pass'}
                        onSelect={() => setActionType('pass')}
                        disabled={hasSubmitted || isPending}
                    />
                </div>

                {actionType === 'solve' && (
                    <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
                        <label className="text-xs uppercase tracking-[0.2em] text-white/60">Your answer</label>
                        <input
                            name="solveAttempt"
                            type="text"
                            value={solveAttempt}
                            onChange={(e) => setSolveAttempt(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60 disabled:cursor-not-allowed disabled:bg-slate-100"
                            placeholder="Explain your logic with the final answer"
                            required
                            disabled={hasSubmitted || isPending}
                        />
                    </div>
                )}

                {actionType === 'delegate' && (
                    <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
                        <label className="text-xs uppercase tracking-[0.2em] text-white/60">Choose a teammate</label>
                        <p className="mt-1 text-xs text-white/60">Ratings reflect perceived expertise for {round.domains.name}.</p>
                        <div className="mt-4 grid gap-3">
                            {lobbyPlayers.map(player => {
                                const ratingInfo = lobbyPlayerRatings.find(r => r.profile_id === player.profiles.id);
                                const rating = ratingInfo ? ratingInfo.rating : '—';
                                return (
                                    <label
                                        key={player.profiles.id}
                                        htmlFor={`delegate-${player.profiles.id}`}
                                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${delegatedToId === player.profiles.id ? 'border-emerald-300/60 bg-emerald-500/20 text-emerald-50' : 'border-white/15 bg-white/10 text-white/80 hover:border-white/25 hover:bg-white/15'} ${hasSubmitted ? 'cursor-not-allowed opacity-70' : ''}`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold">{player.profiles.username}</p>
                                            {ratingInfo?.justification && (
                                                <p className="text-[0.7rem] text-white/60">{ratingInfo.justification}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs uppercase tracking-[0.2em] text-white/60">Rating</span>
                                            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold">{rating}</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="delegationChoice"
                                            id={`delegate-${player.profiles.id}`}
                                            value={player.profiles.id}
                                            className="peer hidden"
                                            onChange={(e) => setDelegatedToId(e.target.value)}
                                            required
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {actionType === 'pass' && (
                    <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/70">
                        You’ll hold your current standing while teammates take the lead.
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-4">
                    <button
                        type="submit"
                        disabled={isPending || !actionType}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-[1px] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? (
                            <>
                                <span className="flex h-4 w-4 items-center justify-center">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/60 border-t-transparent" />
                                </span>
                                Submitting
                            </>
                        ) : (
                            'Confirm action'
                        )}
                    </button>
                    {formMessage && (
                        <p className={`text-center text-sm font-semibold ${formMessage.includes('Error') ? 'text-rose-200' : 'text-emerald-200'}`}>
                            {formMessage}
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}

function ActionCard({ label, description, selected, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex h-full flex-col items-start rounded-2xl border px-4 py-4 text-left transition ${selected ? 'border-emerald-300/60 bg-emerald-500/20 text-emerald-50' : 'border-white/15 bg-white/10 text-white/80 hover:border-white/25 hover:bg-white/15'}`}
        >
            <span className="text-sm font-semibold">{label}</span>
            <span className="mt-2 text-xs text-white/60">{description}</span>
        </button>
    );
}
