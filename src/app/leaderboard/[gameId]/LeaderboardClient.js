'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { getLeaderboardData, getRoundDelegationGraph } from '../../actions';
import DelegationGraphDiagram from './DelegationGraphDiagram';
import GlassPanel from '@/components/layout/GlassPanel';
import BadgePill from '@/components/ui/BadgePill';

export default function LeaderboardClient({ gameId, gameName, roundOptions, initialData, viewerLobbyId, restrictToLobby }) {
    const [selectedFilter, setSelectedFilter] = useState('cumulative');
    const [leaderboard, setLeaderboard] = useState(initialData || []);
    const [error, setError] = useState(null);
    const [delegationGraph, setDelegationGraph] = useState(null);
    const [graphError, setGraphError] = useState(null);
    const [isPending, startTransition] = useTransition();
    const graphCacheRef = useRef(new Map());
    const lobbyReady = !restrictToLobby || Boolean(viewerLobbyId);

    const filters = useMemo(() => {
        const uniqueRounds = Array.from(new Set(roundOptions || [])).sort((a, b) => a - b);
        return ['cumulative', ...uniqueRounds.map((round) => String(round))];
    }, [roundOptions]);

    const delegationLeaders = useMemo(() => {
        if (!delegationGraph?.edges || delegationGraph.edges.length === 0) {
            return [];
        }

        const counts = new Map();
        for (const edge of delegationGraph.edges) {
            if (!edge.toId) continue;
            const current = counts.get(edge.toId);
            if (current) {
                counts.set(edge.toId, { ...current, count: current.count + 1 });
            } else {
                counts.set(edge.toId, { id: edge.toId, name: edge.toName, count: 1 });
            }
        }

        return Array.from(counts.values()).sort((a, b) => b.count - a.count);
    }, [delegationGraph]);

    const handleFilterChange = (value) => {
        if (value === selectedFilter) return;
        setSelectedFilter(value);
        if (value === 'cumulative') {
            setDelegationGraph(null);
            setGraphError(null);
        }

        if (!lobbyReady) {
            setLeaderboard([]);
            setDelegationGraph(null);
            setError(null);
            setGraphError(null);
            return;
        }
        startTransition(async () => {
            const cacheKey = `${value}-${viewerLobbyId || 'all'}`;

            const delegationPromise = value === 'cumulative'
                ? Promise.resolve({ edges: [], nodes: [] })
                : graphCacheRef.current.has(cacheKey)
                    ? Promise.resolve(graphCacheRef.current.get(cacheKey))
                    : getRoundDelegationGraph(gameId, value, viewerLobbyId);

            const results = await Promise.allSettled([
                getLeaderboardData(gameId, value, viewerLobbyId),
                delegationPromise,
            ]);

            const [leaderboardResult, delegationResult] = results;

            if (leaderboardResult.status === 'fulfilled') {
                setLeaderboard(leaderboardResult.value || []);
                setError(null);
            } else {
                console.error('Failed to load leaderboard', leaderboardResult.reason);
                setError('Unable to load leaderboard data right now. Try again shortly.');
            }

            if (value === 'cumulative') {
                setDelegationGraph(null);
                setGraphError(null);
                return;
            }

            if (delegationResult.status === 'fulfilled') {
                const graphPayload = delegationResult.value || { edges: [], nodes: [] };
                if (value !== 'cumulative') {
                    graphCacheRef.current.set(cacheKey, graphPayload);
                }
                setDelegationGraph(graphPayload);
                setGraphError(null);
            } else {
                console.error('Failed to load delegation graph', delegationResult.reason);
                setDelegationGraph({ edges: [], nodes: [] });
                setGraphError('Unable to load delegation graph right now. Try again shortly.');
            }
        });
    };

    return (
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-10">
            <header className="rounded-3xl border border-white/12 bg-white/10 p-6 text-white shadow-2xl backdrop-blur">
                <BadgePill size="lg">Leaderboard hub</BadgePill>
                <h1 className="mt-4 text-4xl font-bold leading-tight text-white">{gameName}</h1>
                <p className="mt-3 max-w-3xl text-sm text-white/70">
                    {restrictToLobby
                        ? 'Standings and delegation data reflect only your lobby once you have been seated.'
                        : 'Compare standings by round or keep tabs on the cumulative score. Switch views any time—players and admins share the same snapshot.'}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    {filters.map((filter) => {
                        const isActive = selectedFilter === filter;
                        const label = filter === 'cumulative' ? 'Cumulative' : `Round ${filter}`;
                        return (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => handleFilterChange(filter)}
                                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                                    isActive
                                        ? 'bg-white text-slate-900 shadow-lg shadow-slate-900/30'
                                        : 'border border-white/20 text-white hover:border-white/40 hover:bg-white/10'
                                }`}
                                disabled={isPending && isActive}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </header>

            <section className="rounded-3xl border border-white/12 bg-white/10 p-6 text-white shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">{selectedFilter === 'cumulative' ? 'Cumulative standings' : `Round ${selectedFilter} standings`}</h2>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                            {restrictToLobby
                                ? lobbyReady ? 'Your lobby only' : 'Awaiting lobby assignment'
                                : 'Updated on demand'}
                        </p>
                    </div>
                    {isPending && (
                        <span className="text-xs uppercase tracking-[0.3em] text-white/60">Refreshing…</span>
                    )}
                </div>

                {error ? (
                    <div className="mt-6 rounded-2xl border border-rose-300/60 bg-rose-400/20 p-4 text-sm text-rose-100">
                        {error}
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                        {restrictToLobby && !lobbyReady
                            ? 'You will see standings here once an admin assigns you to a lobby.'
                            : `No scores yet for this view. ${viewerLobbyId ? 'Your lobby will appear here once actions are recorded.' : 'Check back after players submit their actions.'}`}
                    </div>
                ) : (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                        <table className="min-w-full divide-y divide-white/10 text-sm">
                            <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-white/60">
                                <tr>
                                    <th className="px-4 py-3 text-left">Rank</th>
                                    <th className="px-4 py-3 text-left">Player</th>
                                    <th className="px-4 py-3 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {leaderboard.map((entry, index) => (
                                    <tr key={`${entry.profileId || 'player'}-${index}`} className="transition hover:bg-white/10">
                                        <td className="px-4 py-3 font-semibold text-white/80">{index + 1}</td>
                                        <td className="px-4 py-3 text-white">
                                            {entry.username || 'Unnamed player'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-white">
                                            {typeof entry.score === 'number' ? entry.score.toFixed(2) : entry.score}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-white/12 bg-white/10 p-6 text-white shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Delegation network</h2>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                            {restrictToLobby
                                ? lobbyReady ? 'Who trusted whom in your lobby' : 'Delegation data will appear after assignment'
                                : 'Who trusted whom this round'}
                        </p>
                    </div>
                    {isPending && selectedFilter !== 'cumulative' && (
                        <span className="text-xs uppercase tracking-[0.3em] text-white/60">Refreshing…</span>
                    )}
                </div>

                {!lobbyReady ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                        Lobby data is unavailable until you are seated.
                    </div>
                ) : selectedFilter === 'cumulative' ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                        Select a specific round to see its delegation graph.
                    </div>
                ) : graphError ? (
                    <div className="mt-6 rounded-2xl border border-rose-300/60 bg-rose-400/20 p-4 text-sm text-rose-100">
                        {graphError}
                    </div>
                ) : !delegationGraph || delegationGraph.edges.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                        No delegation decisions were recorded for this round.
                    </div>
                ) : (
                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <GlassPanel>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Visual network</h3>
                            <p className="mt-1 text-xs text-white/60">Arrows point from delegator to delegatee.</p>
                            <div className="mt-4 h-[340px] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                <DelegationGraphDiagram graph={delegationGraph} />
                            </div>
                        </GlassPanel>
                        <div className="space-y-6">
                            <GlassPanel>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Delegation flow</h3>
                                <ul className="mt-4 divide-y divide-white/10 text-sm">
                                    {delegationGraph.edges.map((edge, index) => (
                                        <li key={`${edge.fromId || 'unknown'}-${edge.toId || 'unknown'}-${index}`} className="flex items-center justify-between gap-3 py-2 text-white/80">
                                            <span className="font-semibold text-white">{edge.fromName || 'Unknown player'}</span>
                                            <span className="text-xs uppercase tracking-[0.3em] text-white/50">delegated to</span>
                                            <span className="font-semibold text-emerald-100">{edge.toName || 'Unknown player'}</span>
                                        </li>
                                    ))}
                                </ul>
                            </GlassPanel>
                            <GlassPanel>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Most trusted players</h3>
                                {delegationLeaders.length === 0 ? (
                                    <p className="mt-4 text-sm text-white/70">No player received delegations this round.</p>
                                ) : (
                                    <ul className="mt-4 space-y-2 text-sm">
                                        {delegationLeaders.map((leader) => (
                                            <li key={leader.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                                                <span className="font-semibold">{leader.name || 'Unknown player'}</span>
                                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{leader.count} delegation{leader.count === 1 ? '' : 's'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </GlassPanel>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
