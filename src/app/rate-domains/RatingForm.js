// src/app/rate-domains/RatingForm.js
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertPlayerRatings } from '../actions';

export default function RatingForm({ domains, existingRatings, userId }) {
    const [ratings, setRatings] = useState({});
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        // Pre-populate the form with existing ratings
        const initialRatings = {};
        domains.forEach(domain => {
            const existing = existingRatings.find(r => r.domain_id === domain.id);
            initialRatings[domain.id] = {
                rating: existing?.rating || 0,
                justification: existing?.justification || '',
            };
        });
        setRatings(initialRatings);
    }, [domains, existingRatings]);

    const handleInputChange = (domainId, field, value) => {
        setRatings(prev => ({
            ...prev,
            [domainId]: {
                ...prev[domainId],
                [field]: value,
            },
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setError(null);
        setMessage('');

        const ratingsToUpsert = Object.entries(ratings).map(([domainId, value]) => ({
            domain_id: Number(domainId),
            rating: typeof value?.rating === 'number' ? value.rating : 0,
            justification: value?.justification || '',
        }));

        startTransition(async () => {
            const result = await upsertPlayerRatings(userId, ratingsToUpsert);
            if (result?.error) {
                setError(result.error || 'Unable to save your ratings right now.');
                return;
            }

            setMessage('Ratings saved! Redirecting you back to the dashboard…');
            setTimeout(() => {
                router.push('/');
                router.refresh();
            }, 1200);
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
            <div className="space-y-6 overflow-y-auto pr-2" style={{ maxHeight: '60vh' }}>
                {domains.map((domain) => (
                    <div key={domain.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Domain rating</p>
                                <h3 className="mt-1 text-xl font-semibold text-slate-900">{domain.name}</h3>
                            </div>
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                                {ratings[domain.id]?.rating ?? 0}/10
                            </span>
                        </div>

                        <div className="mt-5 flex flex-col gap-6 lg:flex-row">
                            <div className="flex-1">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={ratings[domain.id]?.rating || 0}
                                    onChange={(e) => handleInputChange(domain.id, 'rating', parseInt(e.target.value))}
                                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                                <div className="mt-2 flex justify-between text-xs text-slate-500">
                                    <span>0</span>
                                    <span>5</span>
                                    <span>10</span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:w-48">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Guidance</p>
                                <p className="mt-2 font-medium text-slate-900">0 = Novice, 5 = Competitive, 10 = Expert under pressure.</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="text-xs uppercase tracking-[0.28em] text-slate-500">Justification</label>
                            <textarea
                                value={ratings[domain.id]?.justification || ''}
                                onChange={(e) => handleInputChange(domain.id, 'justification', e.target.value)}
                                rows={3}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder='Share why you picked this score. e.g., “Interned at a hedge fund”, “Captained college debate team”.'
                            />
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </p>
            )}

            {message && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isPending ? 'Saving…' : 'Save all ratings'}
            </button>
            <p className="text-center text-xs text-slate-500">
                Your updates appear instantly for lobby leads and fellow players.
            </p>
        </form>
    );
}