// src/app/admin/manage/[gameId]/RoundList.js
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { deleteRoundAndUndoScores, updateRoundDetails } from '../../../actions';
import ModalOverlay from '@/components/layout/ModalOverlay';

export default function RoundList({ gameId, rounds, domains }) {
    const [isPending, startTransition] = useTransition();
    const [roundPendingDeletion, setRoundPendingDeletion] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [roundPendingEdit, setRoundPendingEdit] = useState(null);
    const [editForm, setEditForm] = useState({
        domainId: '',
        question: '',
        answer: '',
    });
    const [editFeedback, setEditFeedback] = useState(null);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    const requestDelete = (round) => {
        setRoundPendingDeletion(round);
        setFeedback(null);
    };

    const closeModal = () => {
        if (isPending) return;
        setRoundPendingDeletion(null);
    };

    const confirmDeletion = () => {
        if (!roundPendingDeletion) return;
        const roundNumber = roundPendingDeletion.round_number;
        startTransition(async () => {
            const result = await deleteRoundAndUndoScores(gameId, roundNumber);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
                return;
            }
            setFeedback({ type: 'success', message: `Round ${roundNumber} deleted.` });
            setRoundPendingDeletion(null);
        });
    };

    const openEditModal = (round) => {
        setRoundPendingEdit(round);
        setEditFeedback(null);
        setEditForm({
            domainId: String(round.domain_id ?? ''),
            question: round.question_text ?? '',
            answer: round.correct_answer ?? '',
        });
        setFeedback(null);
    };

    const closeEditModal = () => {
        if (isPending) return;
        setRoundPendingEdit(null);
    };

    const handleEditChange = (field, value) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const submitRoundUpdate = (event) => {
        event.preventDefault();
        if (!roundPendingEdit) return;

        const trimmedQuestion = editForm.question.trim();
        const trimmedAnswer = editForm.answer.trim();
        if (!trimmedQuestion || !trimmedAnswer || !editForm.domainId) {
            setEditFeedback({ type: 'error', message: 'Please complete every field before saving.' });
            return;
        }

        startTransition(async () => {
            const result = await updateRoundDetails(gameId, roundPendingEdit.round_number, {
                questionText: trimmedQuestion,
                correctAnswer: trimmedAnswer,
                domainId: Number(editForm.domainId),
            });

            if (result?.error) {
                setEditFeedback({ type: 'error', message: result.error });
                return;
            }

            setFeedback({ type: 'success', message: `Round ${roundPendingEdit.round_number} updated.` });
            setRoundPendingEdit(null);
        });
    };

    if (!rounds?.length) {
        return (
            <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/70 shadow-inner shadow-slate-900/30">
                No rounds yet. Use the panel on the left to launch your opening scenario.
            </div>
        );
    }

    const modalContent = roundPendingDeletion ? (
        <ModalOverlay onClose={closeModal}>
            <div className="mx-4 w-full max-w-md rounded-3xl border border-white/12 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur">
                <span className="text-xs uppercase tracking-[0.35em] text-white/60">Confirm removal</span>
                <h3 className="mt-4 text-2xl font-semibold">Delete round {roundPendingDeletion.round_number}?</h3>
                <p className="mt-3 text-sm text-white/70">
                    This will remove the round and unwind scoring for all subsequent rounds. This action cannot be undone.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={confirmDeletion}
                        disabled={isPending}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-white/30"
                    >
                        {isPending ? 'Deleting...' : 'Delete round'}
                    </button>
                    <button
                        type="button"
                        onClick={closeModal}
                        disabled={isPending}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/40"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </ModalOverlay>
    ) : null;

    return (
        <>
            <div className="mt-6 space-y-4">
            {feedback && (
                <div
                    role="status"
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/30 ${feedback.type === 'error' ? 'border-red-400/40 bg-red-500/10 text-red-100' : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'}`}
                >
                    <span>{feedback.message}</span>
                    <button
                        type="button"
                        onClick={() => setFeedback(null)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {rounds.map((round) => (
                <article
                    key={round.id}
                    className="group rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-slate-900/60 p-5 text-white shadow-xl shadow-slate-900/40 transition hover:border-white/25 hover:shadow-2xl"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                                <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 font-semibold text-white">
                                    Round {round.round_number}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 font-mono text-[0.7rem] text-white/70">
                                    {round.domains?.name || 'Domain'}
                                </span>
                            </div>
                            <p className="text-base font-semibold leading-relaxed text-white/90">
                                {round.question_text}
                            </p>
                            {round.correct_answer && (
                                <p className="text-xs text-emerald-200/90">
                                    Answer: <span className="font-mono text-sm text-emerald-100">{round.correct_answer}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                onClick={() => openEditModal(round)}
                                disabled={isPending}
                                className="inline-flex flex-1 items-center justify-center rounded-lg bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-white/30 transition hover:-translate-y-[1px] hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Edit round
                            </button>
                            <button
                                onClick={() => requestDelete(round)}
                                disabled={isPending}
                                className="inline-flex flex-1 items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-red-600/40 disabled:text-white/70"
                            >
                                {isPending ? 'Working...' : 'Delete round'}
                            </button>
                        </div>
                    </div>
                </article>
            ))}
            </div>
            {isBrowser && modalContent ? createPortal(modalContent, document.body) : null}
            {isBrowser && roundPendingEdit
                ? createPortal(
                    <ModalOverlay onClose={closeEditModal}>
                        <div className="mx-4 w-full max-w-2xl rounded-3xl border border-white/12 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur">
                            <span className="text-xs uppercase tracking-[0.35em] text-white/60">Update round</span>
                            <h3 className="mt-4 text-2xl font-semibold">Round {roundPendingEdit.round_number}</h3>
                            <p className="mt-2 text-sm text-white/70">
                                Adjust the prompt, domain, or answer. Changes apply immediately to everyone viewing this round.
                            </p>

                            <form onSubmit={submitRoundUpdate} className="mt-6 space-y-5">
                                {editFeedback && (
                                    <div className={`rounded-2xl px-4 py-3 text-xs font-medium ${editFeedback.type === 'error' ? 'border border-rose-300/60 bg-rose-400/20 text-rose-100' : 'border border-emerald-300/60 bg-emerald-400/20 text-emerald-50'}`}>
                                        {editFeedback.message}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">Domain</label>
                                    <select
                                        value={editForm.domainId}
                                        onChange={(event) => handleEditChange('domainId', event.target.value)}
                                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                                        required
                                    >
                                        <option value="" disabled>
                                            Select a domain
                                        </option>
                                        {domains.map((domain) => (
                                            <option key={domain.id} value={domain.id}>
                                                {domain.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">Question</label>
                                    <textarea
                                        value={editForm.question}
                                        onChange={(event) => handleEditChange('question', event.target.value)}
                                        rows={4}
                                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                                        placeholder="Rewrite the scenario prompt"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">Correct answer</label>
                                    <input
                                        type="text"
                                        value={editForm.answer}
                                        onChange={(event) => handleEditChange('answer', event.target.value)}
                                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                                        placeholder="Enter the authoritative answer"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="inline-flex flex-1 items-center justify-center rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-[1px] hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-500/40"
                                    >
                                        {isPending ? 'Saving...' : 'Save changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        disabled={isPending}
                                        className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/40"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </ModalOverlay>,
                    document.body,
                )
                : null}
        </>
    );
}