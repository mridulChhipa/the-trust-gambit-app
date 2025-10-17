// src/app/admin/manage/[gameId]/LobbyManager.js
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { assignPlayersRandomly, createLobby, manualAssignPlayer } from '../../../actions';

export default function LobbyManager({ gameId, allPlayers, initialLobbies }) {
    const [lobbySize, setLobbySize] = useState(5);
    const [feedback, setFeedback] = useState(null);
    const [isPending, startTransition] = useTransition();
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [selectedLobbyId, setSelectedLobbyId] = useState(initialLobbies[0]?.id ?? '');
    const [newLobbyName, setNewLobbyName] = useState('');

    const router = useRouter();

    const playerPool = useMemo(
        () => allPlayers.filter(player => (player.role ?? 'player') === 'player'),
        [allPlayers]
    );

    const { assignedPlayers, unassignedPlayers, playerIds } = useMemo(() => {
        const ids = new Set(playerPool.map(player => player.id));
        const assignedIds = new Set(
            initialLobbies.flatMap(lobby =>
                lobby.lobby_participants
                    .map(participant => participant.profile_id)
                    .filter(profileId => ids.has(profileId))
            )
        );

        const assigned = playerPool.filter(player => assignedIds.has(player.id));
        const unassigned = playerPool.filter(player => !assignedIds.has(player.id));
        return { assignedPlayers: assigned, unassignedPlayers: unassigned, playerIds: ids };
    }, [initialLobbies, playerPool]);

    const nonPlayerAssignments = useMemo(() => (
        initialLobbies.flatMap(lobby =>
            lobby.lobby_participants
                .map(participant => participant.profile_id)
                .filter(profileId => !playerIds.has(profileId))
        )
    ), [initialLobbies, playerIds]);

    const hasUnassigned = unassignedPlayers.length > 0;
    const hasLobbies = initialLobbies.length > 0;

    const availableLobbies = useMemo(() => initialLobbies.map(lobby => ({ id: lobby.id, name: lobby.name })), [initialLobbies]);
    const availablePlayers = useMemo(() => {
        const combined = [];
        unassignedPlayers.forEach(player => combined.push({ ...player, status: 'unassigned' }));
        assignedPlayers.forEach(player => combined.push({ ...player, status: 'assigned' }));
        return combined;
    }, [unassignedPlayers, assignedPlayers]);
    const manualAssignmentReady = hasLobbies && availablePlayers.length > 0;

    useEffect(() => {
        if (!selectedLobbyId && availableLobbies.length > 0) {
            setSelectedLobbyId(availableLobbies[0].id);
        }
    }, [availableLobbies, selectedLobbyId]);

    useEffect(() => {
        if (!selectedPlayerId && availablePlayers.length > 0) {
            setSelectedPlayerId(availablePlayers[0].id);
        }
    }, [availablePlayers, selectedPlayerId]);

    const resetManualForm = () => {
    setSelectedPlayerId('');
    setSelectedLobbyId(availableLobbies[0]?.id ?? '');
    };

    const handleRandomAssignment = () => {
        if (!hasUnassigned) {
            setFeedback({ type: 'info', message: 'All players are already seated in a lobby.' });
            return;
        }
        startTransition(async () => {
            const unassignedIds = unassignedPlayers.map(p => p.id);
            const result = await assignPlayersRandomly(gameId, unassignedIds, lobbySize);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
            } else {
                setFeedback({ type: 'success', message: 'Players assigned. Refresh to see updated lobbies.' });
                router.refresh();
            }
        });
    };

    const handleManualAssignment = () => {
        if (!selectedPlayerId || !selectedLobbyId) {
            setFeedback({ type: 'info', message: 'Select both a player and a lobby to complete the assignment.' });
            return;
        }

        startTransition(async () => {
            const result = await manualAssignPlayer(gameId, selectedLobbyId, selectedPlayerId);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
                return;
            }

            setFeedback({ type: 'success', message: 'Player assigned to lobby.' });
            resetManualForm();
            router.refresh();
        });
    };

    const handleCreateLobby = () => {
        const trimmedName = newLobbyName.trim();
        if (!trimmedName) {
            setFeedback({ type: 'info', message: 'Enter a name for the new lobby before creating it.' });
            return;
        }

        startTransition(async () => {
            const result = await createLobby(gameId, trimmedName);
            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
                return;
            }

            setFeedback({ type: 'success', message: `Lobby '${trimmedName}' created.` });
            setNewLobbyName('');
            setSelectedLobbyId(result.lobby?.id ?? result?.lobby?.id ?? '');
            router.refresh();
        });
    };

    return (
        <section className="rounded-3xl border border-white/12 bg-white/10 p-6 text-white shadow-2xl backdrop-blur">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-lg font-semibold">Lobby management</h2>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Balance the playing field</p>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                    {initialLobbies.length} configured
                </span>
            </header>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-lg shadow-slate-900/25">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Random assignment</p>
                            <p className="text-sm text-white/80">Seat every player with balanced lobbies.</p>
                        </div>
                        <div className="flex flex-1 items-center justify-end gap-3">
                            <label className="text-xs uppercase tracking-[0.2em] text-white/60">Lobby size</label>
                            <input
                                type="number"
                                value={lobbySize}
                                onChange={(e) => setLobbySize(Number(e.target.value))}
                                min="1"
                                className="w-20 rounded-full border border-white/15 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                            />
                            <button
                                onClick={handleRandomAssignment}
                                disabled={isPending || !hasUnassigned}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-[1px] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isPending ? (
                                    <>
                                        <span className="flex h-4 w-4 items-center justify-center">
                                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900/60 border-t-transparent" />
                                        </span>
                                        Assigning
                                    </>
                                ) : (
                                    <>
                                        <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-500">{unassignedPlayers.length}</span>
                                        Assign players
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    {hasUnassigned && lobbySize > 0 && unassignedPlayers.length % lobbySize !== 0 && (
                        <p className="mt-3 rounded-2xl border border-amber-200/40 bg-amber-500/20 px-4 py-2 text-xs text-amber-50">
                            {unassignedPlayers.length % lobbySize} player(s) will remain unassigned with the current lobby size.
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/5 p-5 text-sm shadow-lg shadow-slate-900/25">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Status</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-white/80">
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs">
                            Unassigned: {unassignedPlayers.length}
                        </span>
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs">
                            Assigned: {assignedPlayers.length}
                        </span>
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs">
                            Players total: {playerPool.length}
                        </span>
                    </div>
                    {feedback && (
                        <div
                            className={`mt-4 rounded-2xl px-4 py-3 text-xs font-medium ${feedback.type === 'error'
                                    ? 'border border-rose-300/50 bg-rose-400/20 text-rose-100'
                                    : feedback.type === 'success'
                                        ? 'border border-emerald-300/50 bg-emerald-400/20 text-emerald-50'
                                        : 'border border-sky-300/50 bg-sky-400/15 text-sky-50'
                                }`}
                        >
                            {feedback.message}
                        </div>
                    )}
                    {nonPlayerAssignments.length > 0 && (
                        <div className="mt-3 rounded-2xl border border-amber-200/50 bg-amber-500/20 px-4 py-3 text-xs text-amber-50">
                            {nonPlayerAssignments.length} non-player account(s) are present in a lobby. Remove them to keep admin seats separate.
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-lg shadow-slate-900/25">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Manual assignment</p>
                            <p className="text-sm text-white/80">Place a specific player into a lobby.</p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/60">
                            Player
                            <select
                                value={selectedPlayerId}
                                onChange={(event) => setSelectedPlayerId(event.target.value)}
                                className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                                disabled={!manualAssignmentReady || isPending}
                            >
                                <option value="">{manualAssignmentReady ? 'Select a player' : 'No players available'}</option>
                                {availablePlayers.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.username}{player.status === 'assigned' ? ' • currently seated' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/60">
                            Lobby
                            <select
                                value={selectedLobbyId}
                                onChange={(event) => setSelectedLobbyId(event.target.value)}
                                className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                                disabled={!manualAssignmentReady || isPending}
                            >
                                {availableLobbies.length === 0 ? (
                                    <option value="">No lobbies available</option>
                                ) : (
                                    availableLobbies.map(lobby => (
                                        <option key={lobby.id} value={lobby.id}>
                                            {lobby.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleManualAssignment}
                            disabled={!manualAssignmentReady || !selectedPlayerId || !selectedLobbyId || isPending}
                            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-[1px] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isPending ? 'Assigning…' : 'Assign player'}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-lg shadow-slate-900/25">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Create new lobby</p>
                            <p className="text-sm text-white/80">Spin up an extra table for overflow or special cases.</p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex-1 space-y-2 text-xs uppercase tracking-[0.2em] text-white/60">
                            Lobby name
                            <input
                                type="text"
                                value={newLobbyName}
                                onChange={(event) => setNewLobbyName(event.target.value)}
                                placeholder={`Lobby ${initialLobbies.length + 1}`}
                                className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-black/10 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                                disabled={isPending}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleCreateLobby}
                            disabled={!newLobbyName.trim() || isPending}
                            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-[1px] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isPending ? 'Creating…' : 'Create lobby'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-lg shadow-slate-900/25">
                    <h3 className="text-sm font-semibold text-white">Unassigned players</h3>
                    <p className="text-xs text-white/60">{unassignedPlayers.length ? 'Seat them via random assignment or custom lobbies.' : 'All players have a seat.'}</p>
                    <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-2">
                        {unassignedPlayers.length > 0 ? (
                            unassignedPlayers.map(player => (
                                <div key={player.id} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90">
                                    {player.username}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/60">
                                No unassigned players.
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-lg shadow-slate-900/25">
                    <h3 className="text-sm font-semibold text-white">Current lobbies</h3>
                    <p className="text-xs text-white/60">{initialLobbies.length ? 'Review seating for each lobby below.' : 'Create your first lobby to get started.'}</p>
                    <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2">
                        {initialLobbies.length > 0 ? (
                            initialLobbies.map(lobby => {
                                const participants = lobby.lobby_participants.map((participant, index) => {
                                    const player = playerPool.find(p => p.id === participant.profile_id);
                                    if (player) {
                                        return { id: player.id, label: player.username, isPlayer: true };
                                    }
                                    const rawId = participant.profile_id || `non-player-${index}`;
                                    const shortId = rawId.length > 8 ? `${rawId.slice(0, 8)}…` : rawId;
                                    return { id: rawId, label: `Non-player profile (${shortId})`, isPlayer: false };
                                });
                                return (
                                    <article key={lobby.id} className="rounded-2xl border border-white/12 bg-white/10 p-4 text-sm text-white/90 shadow">
                                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
                                            <span>{lobby.name}</span>
                                            <span>{participants.length} members</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {participants.map(participant => (
                                                <span
                                                    key={participant.id}
                                                    className={`rounded-full border px-3 py-1 text-xs ${participant.isPlayer ? 'border-white/15 bg-white/10 text-white/80' : 'border-amber-200/50 bg-amber-500/20 text-amber-50'}`}
                                                >
                                                    {participant.label}
                                                </span>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/60">
                                No lobbies created yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}