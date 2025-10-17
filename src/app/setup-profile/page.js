// src/app/setup-profile/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export default function SetupProfilePage() {
    const supabase = useMemo(() => getBrowserSupabaseClient(), []);
    const [username, setUsername] = useState('');
    const [hostelId, setHostelId] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hostels, setHostels] = useState([]);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.push('/login');
                    return;
                }

                setUser(session.user);

                const [{ data: hostelData, error: hostelError }, { data: profileData, error: profileError }] = await Promise.all([
                    supabase
                        .from('hostels')
                        .select('id, name')
                        .order('name'),
                    supabase
                        .from('profiles')
                        .select('username, hostel_id')
                        .eq('id', session.user.id)
                        .maybeSingle(),
                ]);

                if (!hostelError && hostelData) {
                    setHostels(hostelData);
                } else {
                    setHostels([]);
                }

                if (!profileError && profileData) {
                    setUsername(profileData.username ?? '');
                    setHostelId(profileData.hostel_id ? String(profileData.hostel_id) : '');
                }
            } catch (err) {
                console.error('Failed to load profile setup data', err);
                setError('Unable to load your profile. Please refresh and try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [supabase, router]);

    const handleProfileUpdate = async () => {
        if (!username.trim() || !hostelId) {
            setError('Please complete both fields before saving.');
            return;
        }

        setSaving(true);
        setError(null);
        setMessage('');

        const parsedHostelId = Number(hostelId);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                username: username.trim(),
                hostel_id: Number.isFinite(parsedHostelId) ? parsedHostelId : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (updateError) {
            setError(updateError.message || 'Unable to save your profile right now.');
        } else {
            setMessage('Profile saved! Redirecting you to the dashboard…');
            setTimeout(() => {
                router.push('/');
                router.refresh();
            }, 1200);
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-white shadow-2xl backdrop-blur">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    </span>
                    <p className="mt-4 text-sm text-white/70">Loading your profile…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 px-4 py-12 text-white">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-stretch">
                <section className="flex flex-1 flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
                    <header className="space-y-4">
                        <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                            Personalize your presence
                        </span>
                        <h1 className="text-4xl font-bold leading-tight">Claim your in-game identity.</h1>
                        <p className="text-sm text-white/70">
                            Your username appears across round results, leaderboards, and lobby discussions. Adding your hostel helps teammates understand where your expertise originates.
                        </p>
                    </header>
                    <div className="grid gap-4 text-sm text-white/80 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Visibility</p>
                            <p className="mt-2 font-semibold">Shared with your lobby and game admins</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Flexibility</p>
                            <p className="mt-2 font-semibold">Update anytime before the next season starts</p>
                        </div>
                    </div>
                </section>

                <section className="flex flex-1 flex-col justify-between rounded-3xl border border-white/15 bg-white/90 p-8 text-slate-900 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900">Complete your profile</h2>
                                <p className="text-sm text-slate-500">Lock in details so we can slot you into lobbies fast.</p>
                            </div>
                            <Link
                                href="/"
                                className="rounded-full text-center border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            >
                                Exit setup
                            </Link>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                {message}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="e.g., AdaLovelace"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Hostel</label>
                                <select
                                    value={hostelId}
                                    onChange={(e) => setHostelId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="" disabled>
                                        {hostels.length === 0 ? 'No hostels available' : 'Choose your hostel'}
                                    </option>
                                    {hostels.map((hostel) => (
                                        <option key={hostel.id} value={hostel.id}>
                                            {hostel.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500">No hostel on the list? Ping your admin and they’ll add it.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        <button
                            type="button"
                            onClick={handleProfileUpdate}
                            disabled={saving}
                            className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : 'Save and continue'}
                        </button>
                        <p className="text-center text-xs text-slate-500">
                            Details sync instantly across lobbies, leaderboards, and round results.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}