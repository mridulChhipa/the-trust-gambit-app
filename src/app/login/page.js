'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
    // State for both login and signup
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [hostelId, setHostelId] = useState('');

    // State for UI
    const [hostels, setHostels] = useState([]);
    const [isLoginView, setIsLoginView] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoadingHostels, setIsLoadingHostels] = useState(true);

    const router = useRouter();
    const supabase = useMemo(() => getBrowserSupabaseClient(), []);

    // Fetch the list of hostels when the component mounts
    useEffect(() => {
        const getHostels = async () => {
            setIsLoadingHostels(true);
            const { data, error } = await supabase
                .from('hostels')
                .select('id, name')
                .order('name');

            if (error) {
                console.error('Error fetching hostels:', error);
                setHostels([]);
            } else {
                setHostels(data ?? []);
            }
            setIsLoadingHostels(false);
        };
        getHostels();
    }, [supabase]);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage('');

        if (!username || !hostelId) {
            setError('Username and hostel are required.');
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    hostel_id: parseInt(hostelId)
                },
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Sign up successful! Please check your email to confirm your account.');
            setIsLoginView(true); // Switch to login view after successful signup
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            router.push('/');
            router.refresh();
        }
    };

    const toggleView = (view) => {
        setError(null);
        setMessage('');
        setIsLoginView(view === 'login');
    };

    const cardTitle = isLoginView ? 'Welcome back' : 'Create your account';
    const cardSubtitle = isLoginView
        ? 'Sign in to coordinate, delegate, and win together.'
        : 'Join the next round and build your reputation from day one.';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-100 shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.25),transparent_55%)]" />
                    <div className="relative flex h-full flex-col justify-between">
                        <header>
                            <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">The Trust Gambit</span>
                            <h2 className="mt-6 text-4xl font-bold leading-tight">Master trust. Dominate the delegation game.</h2>
                            <p className="mt-4 text-lg text-white/80">
                                Play high-stakes rounds, leverage domain experts, and discover who your team can really rely on. Log in to keep the momentum—or sign up to enter the arena.
                            </p>
                        </header>
                        <div className="mt-10 grid grid-cols-1 gap-6 text-sm text-white/80 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/10/50 p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/60">Live insights</p>
                                <p className="mt-2 font-semibold">Real-time scoring and round recaps</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/10/50 p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/60">Smart delegation</p>
                                <p className="mt-2 font-semibold">Review expertise before you pass the baton</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/10/50 p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/60">Adaptive rounds</p>
                                <p className="mt-2 font-semibold">Each question pushes teamwork to the limit</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/10/50 p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/60">Shared success</p>
                                <p className="mt-2 font-semibold">Win by balancing trust, speed, and accuracy</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white p-8 shadow-2xl shadow-indigo-500/20">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">{cardTitle}</h2>
                            <p className="text-sm text-slate-500">{cardSubtitle}</p>
                        </div>
                        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-500">
                            <button
                                type="button"
                                onClick={() => toggleView('login')}
                                className={`rounded-full px-3 py-1 transition ${isLoginView ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-700'}`}
                            >
                                Log In
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleView('signup')}
                                className={`rounded-full px-3 py-1 transition ${!isLoginView ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-700'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                    {message && (
                        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                            {message}
                        </p>
                    )}

                    {isLoginView ? (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                                Continue
                            </button>
                            <p className="text-center text-sm text-slate-500">
                                New here?{' '}
                                <button
                                    type="button"
                                    onClick={() => toggleView('signup')}
                                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    Create an account
                                </button>
                            </p>
                        </form>
                    ) : (
                        <form onSubmit={handleSignUp} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Your in-game identity"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Hostel</label>
                                <select
                                    value={hostelId}
                                    onChange={(e) => setHostelId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    required
                                >
                                    <option value="" disabled>
                                        {isLoadingHostels ? 'Loading hostels…' : 'Choose your hostel'}
                                    </option>
                                    {hostels.map((hostel) => (
                                        <option key={hostel.id} value={hostel.id}>
                                            {hostel.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="At least 8 characters"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-400/30 transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                                Create account
                            </button>
                            <p className="text-center text-sm text-slate-500">
                                Already playing?{' '}
                                <button
                                    type="button"
                                    onClick={() => toggleView('login')}
                                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    Log in instead
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}