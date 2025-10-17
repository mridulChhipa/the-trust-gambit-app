// src/app/admin/create-game/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

const supabase = getBrowserSupabaseClient();

export default function CreateGamePage() {
    const [gameName, setGameName] = useState('');
    const [lambda, setLambda] = useState(0.5);
    const [beta, setBeta] = useState(0.2);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', content: '' });
    const router = useRouter();

    const handleCreateGame = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', content: '' });

        // Get the currently logged-in user to set as admin
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setMessage({ type: 'error', content: 'You must be logged in to create a game.' });
            setLoading(false);
            return;
        }

        // Insert the new game into the database
        const { error: insertError } = await supabase
            .from('games')
            .insert({
                name: gameName,
                lambda,
                beta,
                admin_id: user.id,
                status: 'pending',
            });

        if (insertError) {
            setMessage({ type: 'error', content: insertError.message });
        } else {
            setMessage({ type: 'success', content: 'Game created successfully! Redirecting...' });
            setTimeout(() => {
                router.push('/admin');
            }, 2000);
        }
        setLoading(false);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-10 text-white">
            <section className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                    New scenario
                </span>
                <h1 className="mt-6 text-4xl font-bold leading-tight">Spin up a fresh round of The Trust Gambit.</h1>
                <p className="mt-4 text-sm text-white/75">
                    Name the game, tune the trust decay, and calibrate the reputation bonus. Players will see the lobby as soon as you launch it.
                </p>
            </section>

            <form
                onSubmit={handleCreateGame}
                className="space-y-6 rounded-3xl border border-white/12 bg-white/5 p-8 shadow-2xl backdrop-blur"
            >
                <FormField
                    label="Game name"
                    description="How players will identify this scenario across dashboards."
                >
                    <input
                        type="text"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                        placeholder="e.g. Cohort Alpha – Week 3"
                        required
                    />
                </FormField>

                <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                        label="Lambda (λ) — Trust decay"
                        description="Higher values slow the erosion of trust between rounds."
                    >
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={lambda}
                            onChange={(e) => setLambda(parseFloat(e.target.value))}
                            className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                            required
                        />
                    </FormField>

                    <FormField
                        label="Beta (β) — Reputation bonus"
                        description="The boost awarded when a player delivers the correct solve."
                    >
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={beta}
                            onChange={(e) => setBeta(parseFloat(e.target.value))}
                            className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                            required
                        />
                    </FormField>
                </div>

                {message.content && (
                    <div
                        className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                            message.type === 'error'
                                ? 'border border-rose-300/60 bg-rose-200/30 text-rose-100'
                                : 'border border-emerald-300/60 bg-emerald-200/25 text-emerald-100'
                        }`}
                    >
                        {message.content}
                    </div>
                )}

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
                            Creating game
                        </>
                    ) : (
                        <>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">+</span>
                            Deploy scenario
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

function FormField({ label, description, children }) {
    return (
        <div className="space-y-2">
            <div>
                <label className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{label}</label>
                <p className="text-xs text-white/60">{description}</p>
            </div>
            {children}
        </div>
    );
}