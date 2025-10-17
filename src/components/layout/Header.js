// src/components/layout/Header.js
import Link from 'next/link';
import SignOutButton from '../auth/SignOutButton';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export default async function Header() {
    const supabase = await getServerSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let username = 'Guest';
    let role = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, role')
            .eq('id', user.id)
            .maybeSingle();
        username = profile?.username || user.email;
        role = profile?.role || 'player';
    }

    return (
        <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 shadow-sm border-b border-indigo-200/40">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/" className="group inline-flex items-center space-x-3">
                    <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 shadow-lg shadow-indigo-500/30">
                        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                        <span className="relative text-lg font-bold text-white">TG</span>
                    </span>
                    <span className="flex flex-col">
                        <span className="text-sm uppercase tracking-[0.3em] text-indigo-500/80">Trust Gambit</span>
                        <span className="text-xl font-semibold text-slate-800 group-hover:text-slate-900 transition">The Delegation Arena</span>
                    </span>
                </Link>

                {user ? (
                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-xs uppercase tracking-[0.2em] text-indigo-500/70">{role === 'admin' ? 'Admin' : 'Player'}</span>
                            <span className="text-sm font-semibold text-slate-700">{username}</span>
                        </div>
                        <div className="relative h-11 w-11 overflow-hidden rounded-full border border-indigo-200/70 bg-white shadow-md shadow-indigo-500/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-sky-400 to-emerald-400 opacity-90" />
                            <div className="relative flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                                {username.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <SignOutButton />
                    </div>
                ) : (
                    <div className="flex items-center space-x-3 text-sm">
                        <Link href="/login" className="rounded-lg border border-indigo-200/60 px-3 py-2 font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600">
                            Log in
                        </Link>
                        <Link href="/login" className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700">
                            Join the game
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}