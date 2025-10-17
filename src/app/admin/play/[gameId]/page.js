// src/app/admin/play/[gameId]/page.js
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GameControls from './GameControls';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import BadgePill from '@/components/ui/BadgePill';
import StatCard from '@/components/ui/StatCard';

async function getGameStatus(gameId) {
    const supabase = await getServerSupabaseClient();
    const { data: game, error } = await supabase
        .from('games')
        .select('id, name, status, current_round_number')
        .eq('id', gameId)
        .single();

    if (error) return null;

    let awaitingNextRound = false;

    if (game.status === 'active' && game.current_round_number) {
        const { data: activeRound, error: activeRoundError } = await supabase
            .from('rounds')
            .select('id')
            .eq('game_id', gameId)
            .eq('round_number', game.current_round_number)
            .maybeSingle();

        if (activeRoundError) {
            console.error('Failed to verify current round:', activeRoundError.message);
        }

        awaitingNextRound = !activeRound;
    }

    return { game, awaitingNextRound };
}

export default async function AdminPlayPage({ params }) {
    const { gameId } = await params;
    const statusData = await getGameStatus(gameId);

    if (!statusData?.game) {
        notFound();
    }

    const { game, awaitingNextRound } = statusData;
    const isPending = game.status === 'pending';
    const isActive = game.status === 'active';
    const isCompleted = game.status === 'completed';

    return (
        <div className="relative min-h-screen bg-slate-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(circle_at_85%_15%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.18),transparent_60%)]" />
            <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-10 space-y-10">
                <header className="rounded-3xl border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <BadgePill size="lg">Live control room</BadgePill>
                            <h1 className="mt-4 text-4xl font-bold leading-tight text-white">{game.name}</h1>
                            <p className="mt-3 text-sm text-white/70">
                                Advance rounds, broadcast decisions, and keep every lobby marching in sync.
                            </p>
                        </div>
                        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                            <Link
                                href={`/admin/manage/${game.id}`}
                                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                            >
                                Manage rounds & lobbies
                            </Link>
                            <Link
                                href="/admin"
                                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-[1px] hover:shadow-2xl"
                            >
                                Back to dashboard
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <StatCard
                            label="State"
                            value={statusLabel(game.status)}
                            accent="from-indigo-500 to-sky-500"
                            valueClassName="text-2xl"
                        />
                        <StatCard
                            label="Round"
                            value={awaitingNextRound && game.current_round_number ? `${game.current_round_number} • queued` : game.current_round_number ?? '—'}
                            hint={isPending ? 'Awaiting launch' : awaitingNextRound ? 'Waiting for next prompt' : isActive ? 'Currently running' : 'Finalized'}
                            accent="from-emerald-500 to-teal-400"
                            valueClassName="text-2xl"
                        />
                        <StatCard
                            label="Game id"
                            value={truncateId(game.id)}
                            hint="Copied from Supabase"
                            accent="from-slate-500 to-slate-600"
                            valueClassName="text-2xl"
                        />
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <GameControls game={game} awaitingNextRound={awaitingNextRound} />

                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-white/12 bg-white/10 p-5 text-white shadow-2xl">
                            <h2 className="text-sm font-semibold text-white">Command checklist</h2>
                            <ul className="mt-4 space-y-3 text-xs text-white/70">
                                <li className="flex items-start gap-3">
                                    <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-500/80 text-xs font-semibold">1</span>
                                    {isPending ? 'Kick off the first round as soon as lobbies are locked.' : 'Confirm round actions and run scoring before advancing.'}
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sky-500/80 text-xs font-semibold">2</span>
                                    {isActive ? 'Announce results in chat before the next prompt appears.' : 'Monitor player readiness while you prep the round.'}
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/80 text-xs font-semibold">3</span>
                                    {isCompleted ? 'Archive the final metrics and share post-game feedback.' : 'Keep the timer honest—no extra seconds once delegation closes.'}
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-3xl border border-white/12 bg-white/10 p-5 text-white shadow-2xl">
                            <h2 className="text-sm font-semibold text-white">Live tips</h2>
                            <p className="mt-3 text-xs text-white/70">
                                Triggering a new round automatically pushes the fresh prompt to every player lobby. Use the manage view for manual seat swaps before you hit advance.
                            </p>
                        </div>
                    </aside>
                </section>
            </main>
        </div>
    );
}

function statusLabel(status) {
    switch ((status || '').toLowerCase()) {
    case 'pending':
        return 'Staging';
    case 'active':
        return 'In play';
    case 'completed':
        return 'Finished';
    default:
        return 'Unknown';
    }
}

function truncateId(id) {
    if (!id) return '—';
    return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}