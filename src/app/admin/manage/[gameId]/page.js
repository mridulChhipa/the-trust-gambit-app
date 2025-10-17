// src/app/admin/manage/[gameId]/page.js
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddRoundForm from './AddRoundForm';
import LobbyManager from './LobbyManager';
import RoundList from './RoundList';

import { getServerSupabaseClient } from '@/lib/supabase/server';
import BadgePill from '@/components/ui/BadgePill';
import StatCard from '@/components/ui/StatCard';
import GameStatusBadge from '@/components/ui/GameStatusBadge';

async function getGameData(gameId) {
    const supabase = await getServerSupabaseClient();

    const [gameRes, roundsRes, domainsRes, profilesRes, lobbiesRes] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('rounds').select('*, domains(name)').eq('game_id', gameId).order('round_number'),
        supabase.from('domains').select('*'),
        supabase.from('profiles').select('id, username, hostel_id, role'),
        supabase.from('lobbies').select('*, lobby_participants(profile_id)').eq('game_id', gameId)
    ]);

    if (gameRes.error || !gameRes.data) return null;

    return {
        game: gameRes.data,
        rounds: roundsRes.data || [],
        domains: domainsRes.data || [],
        allPlayers: (profilesRes.data || []).filter(profile => profile.role === 'player'),
        lobbies: lobbiesRes.data || [],
    };
}

export default async function ManageGamePage({ params }) {
    const { gameId } = await params;
    const data = await getGameData(gameId);

    if (!data) {
        notFound();
    }

    const { game, rounds, domains, allPlayers, lobbies } = data;
    const status = (game.status || 'pending').toLowerCase();
    const playerIds = new Set(allPlayers.map(player => player.id));
    const uniqueParticipants = new Set(
        lobbies.flatMap(lobby =>
            lobby.lobby_participants
                .map(p => p.profile_id)
                .filter(profileId => playerIds.has(profileId))
        )
    ).size;

    return (
        <div className="space-y-10 text-white">
            <section className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                        <BadgePill size="lg">Managing scenario</BadgePill>
                        <h1 className="mt-6 text-4xl font-bold leading-tight">{game.name}</h1>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/70">
                            <GameStatusBadge status={status} variant="on-dark" />
                            <BadgePill size="sm" className="font-mono">
                                ID: {game.id}
                            </BadgePill>
                            <BadgePill size="sm">
                                Created {formatDate(game.created_at)}
                            </BadgePill>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Link
                            href={`/admin/play/${game.id}`}
                            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-[1px] hover:shadow-xl"
                        >
                            Launch live control
                        </Link>
                        <Link
                            href="/admin"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/30 hover:bg-white/10"
                        >
                            <span aria-hidden>&larr;</span>
                            Back to dashboard
                        </Link>
                        <p className="text-sm text-white/70 max-w-xs">
                            Tune lobbies, launch new rounds, and keep the momentum of this trust simulation.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total rounds" value={rounds.length} hint="Across all domains" accent="from-indigo-500 to-sky-500" />
                    <StatCard label="Configured lobbies" value={lobbies.length} hint="Ready for players" accent="from-emerald-500 to-teal-400" />
                    <StatCard label="Participants" value={uniqueParticipants} hint="Assigned to lobbies" accent="from-amber-500 to-orange-400" />
                    <StatCard label="Status" value={statusLabel(status)} hint="Current phase" accent="from-slate-500 to-slate-700" />
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                    <LobbyManager gameId={game.id} allPlayers={allPlayers} initialLobbies={lobbies} />

                    <AddRoundForm gameId={game.id} domains={domains} nextRoundNumber={rounds.length + 1} />
                </div>

                <div className="rounded-3xl border border-white/12 bg-white/5 p-6 shadow-2xl backdrop-blur">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Rounds overview</h2>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Log of scenarios</p>
                        </div>
                        <BadgePill size="sm" variant="frost">{rounds.length} total</BadgePill>
                    </div>

                    <RoundList gameId={game.id} rounds={rounds} domains={domains} />

                </div>
            </section>
        </div>
    );
}

function statusLabel(status) {
    switch (status) {
    case 'active':
        return 'In play';
    case 'pending':
        return 'Staging';
    case 'completed':
        return 'Wrapped';
    default:
        return status;
    }
}

function formatDate(isoDate) {
    if (!isoDate) return 'Unknown date';
    return new Date(isoDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}