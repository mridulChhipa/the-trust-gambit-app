// src/app/admin/layout.js
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSupabaseClient } from '@/lib/supabase/server';

// This is a server component layout
export default async function AdminLayout({ children }) {
    const supabase = await getServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect if user is not logged in or is not the admin
    if (!user) {
        redirect('/');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role !== 'admin') {
        redirect('/'); // Or redirect to an unauthorized page
    }

    return (
        <div className="relative min-h-screen bg-slate-950 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(129,140,248,0.28),transparent_60%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.28),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.18),transparent_60%)]" />
            <div className="relative flex min-h-screen flex-col lg:flex-row">
                <aside className="flex w-full flex-none flex-col gap-8 border-b border-white/10 bg-white/5 px-6 py-6 backdrop-blur lg:h-auto lg:w-72 lg:border-b-0 lg:border-r">
                    <div className="flex items-center justify-between lg:block">
                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-white/70">Control tower</p>
                            <h2 className="mt-2 text-2xl font-semibold">Admin Panel</h2>
                        </div>
                    </div>
                    <nav className="grid gap-2 text-sm font-medium text-white/70">
                        <AdminLink href="/admin" label="Dashboard" description="Monitor games at a glance" />
                        <AdminLink href="/admin/create-game" label="Create Game" description="Launch a new trust scenario" />
                    </nav>
                </aside>
                <main className="flex-1">
                    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function AdminLink({ href, label, description }) {
    return (
        <Link
            href={href}
            className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/10"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/60">{description}</p>
                </div>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10 text-white/70 transition group-hover:bg-white/20 group-hover:text-white">
                    &rarr;
                </span>
            </div>
        </Link>
    );
}