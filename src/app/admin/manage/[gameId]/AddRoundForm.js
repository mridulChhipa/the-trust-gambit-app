// src/app/admin/manage/[gameId]/AddRoundForm.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

const supabase = getBrowserSupabaseClient();

export default function AddRoundForm({ gameId, domains, nextRoundNumber }) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [domainId, setDomainId] = useState(domains[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const router = useRouter();

    const handleAddRound = async (e) => {
        e.preventDefault();
        if (!question || !answer || !domainId) {
            setFeedback({ type: 'error', message: 'Please fill all fields before launching a round.' });
            return;
        }
        setLoading(true);
        setFeedback(null);

        const { error: insertError } = await supabase.from('rounds').insert({
            game_id: gameId,
            round_number: nextRoundNumber,
            question_text: question,
            correct_answer: answer,
            domain_id: parseInt(domainId),
            status: 'pending',
        });

        if (insertError) {
            setFeedback({ type: 'error', message: insertError.message });
        } else {
            setQuestion('');
            setAnswer('');
            setFeedback({ type: 'success', message: `Round ${nextRoundNumber} deployed. Players will see it once the game advances.` });
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <section className="rounded-3xl border border-white/12 bg-white/10 p-6 text-white shadow-2xl backdrop-blur">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-lg font-semibold">Add round #{nextRoundNumber}</h2>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Queue the next challenge</p>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                    {domains.length} domains available
                </span>
            </header>

            <form onSubmit={handleAddRound} className="mt-5 space-y-5">
                {feedback && (
                    <div
                        className={`rounded-2xl px-4 py-3 text-xs font-medium ${
                            feedback.type === 'error'
                                ? 'border border-rose-300/60 bg-rose-400/20 text-rose-100'
                                : 'border border-emerald-300/60 bg-emerald-400/20 text-emerald-50'
                        }`}
                    >
                        {feedback.message}
                    </div>
                )}

                <Field label="Domain" helper="Select the knowledge area players will rely on this round.">
                    <select
                        value={domainId}
                        onChange={(e) => setDomainId(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                    >
                        {domains.map(domain => (
                            <option key={domain.id} value={domain.id}>{domain.name}</option>
                        ))}
                    </select>
                </Field>

                <Field label="Question" helper="Players will see this prompt when the round begins.">
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows="4"
                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                        placeholder="Describe the scenario they must solve."
                        required
                    />
                </Field>

                <Field label="Correct answer" helper="Used to auto-score delegations after the round.">
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                        placeholder="Enter the authoritative solution"
                        required
                    />
                </Field>

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-[1px] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <span className="flex h-5 w-5 items-center justify-center">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/60 border-t-transparent" />
                            </span>
                            Saving round
                        </>
                    ) : (
                        <>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">+</span>
                            Deploy round
                        </>
                    )}
                </button>
            </form>
        </section>
    );
}

function Field({ label, helper, children }) {
    return (
        <div className="space-y-2">
            <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/70">{label}</label>
                <p className="text-[0.7rem] text-white/60">{helper}</p>
            </div>
            {children}
        </div>
    );
}