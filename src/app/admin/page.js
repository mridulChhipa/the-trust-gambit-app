// src/app/admin/page.js
import Link from 'next/link';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import BadgePill from '@/components/ui/BadgePill';
import StatCard from '@/components/ui/StatCard';
import GameStatusBadge from '@/components/ui/GameStatusBadge';

async function getGames() {
    const supabase = await getServerSupabaseClient();
    const { data, error } = await supabase
        .from('games')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching games:', error);
        return [];
    }
    return data;
}

export default async function AdminDashboardPage() {
    const games = await getGames();

    const statusCounts = games.reduce(
        (acc, game) => {
            const key = (game.status || 'unknown').toLowerCase();
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        },
        { active: 0, pending: 0, completed: 0, unknown: 0 }
    );

    const totalGames = games.length;
    const activeGameCount = statusCounts.active;
    const latestGames = games.slice(0, 6);
    const hasGames = totalGames > 0;

    return (
        <div className="space-y-12 text-white">
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                    <BadgePill size="lg">Game dashboard</BadgePill>
                    <h1 className="mt-6 text-4xl font-bold leading-tight">Monitor every trust gambit in one view.</h1>
                    <p className="mt-4 max-w-2xl text-sm text-white/75">
                        Review live lobbies, spin up fresh simulations, and keep the momentum going across your cohort. Each metric below updates as players advance.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Total" value={totalGames} hint="All tracked scenarios" accent="from-indigo-500 to-sky-500" />
                        <StatCard label="Active" value={activeGameCount} hint="In play right now" accent="from-emerald-500 to-teal-400" />
                        <StatCard label="Pending" value={statusCounts.pending} hint="Waiting to launch" accent="from-amber-500 to-orange-400" />
                        <StatCard label="Completed" value={statusCounts.completed} hint="Ready for debrief" accent="from-slate-500 to-slate-600" />
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/admin/create-game"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-[1px] hover:shadow-2xl"
                        >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">+</span>
                            Launch new game
                        </Link>
                        {hasGames && (
                            <Link
                                href={`/admin/manage/${latestGames[0].id}`}
                                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                            >
                                Jump to latest lobby
                                <span aria-hidden>&rarr;</span>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid content-between gap-4">
                    <QuickAction
                        title="Advance a round"
                        description="Move the current scenario forward when all scores are in."
                        href={hasGames ? `/admin/manage/${latestGames[0].id}` : '/admin/create-game'}
                        accent="bg-emerald-100/80 text-emerald-700"
                        disabled={!hasGames}
                    />
                    <QuickAction
                        title="Tune lobby settings"
                        description="Balance expertise and trust before the next delegation."
                        href={hasGames ? `/admin/manage/${latestGames[0].id}` : '/admin/create-game'}
                        accent="bg-sky-100/80 text-sky-700"
                        disabled={!hasGames}
                    />
                    <QuickAction
                        title="Review past games"
                        description="Pull insights from completed runs to refine strategy."
                        href={hasGames ? `/admin/manage/${games[games.length - 1]?.id}` : '/admin/create-game'}
                        accent="bg-indigo-100/80 text-indigo-700"
                        disabled={!hasGames}
                    />
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold">Games overview</h2>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Latest updates</p>
                    </div>
                    <BadgePill size="sm" variant="frost" className="text-white/70">{totalGames} total</BadgePill>
                </div>

                {hasGames ? (
                    <div className="divide-y divide-white/10">
                        {latestGames.map((game) => (
                            <Link
                                href={`/admin/manage/${game.id}`}
                                key={game.id}
                                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 transition hover:bg-white/10"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-white">{game.name}</p>
                                    <p className="text-xs text-white/70">Created {formatDate(game.created_at)}</p>
                                </div>
                                <GameStatusBadge status={game.status} variant="on-dark" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="px-6 py-10 text-center text-sm text-white/70">
                        You haven’t launched any games yet. Start with a new scenario to see it listed here.
                    </div>
                )}
            </section>
        </div>
    );
}

function QuickAction({ title, description, href, accent, disabled }) {
    const content = (
        <div className={`flex items-center justify-between gap-4 rounded-3xl border border-white/12 px-5 py-4 transition ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-white/25 hover:bg-white/10'}`}>
            <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-white/70">{description}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${accent}`}>{disabled ? 'Soon' : 'Open'}</span>
        </div>
    );

    if (disabled) {
        return <div>{content}</div>;
    }

    return <Link href={href}>{content}</Link>;
}

function formatDate(isoDate) {
    if (!isoDate) return 'Unknown date';
    return new Date(isoDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}