// src/app/leaderboard/[gameId]/page.js
import { notFound } from 'next/navigation';
import LeaderboardClient from './LeaderboardClient';
import { getLeaderboardData, getLeaderboardMeta } from '../../actions';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export default async function LeaderboardPage({ params }) {
    const { gameId } = await params;

    const supabase = await getServerSupabaseClient();

    const [{ data: userResult }, meta] = await Promise.all([
        supabase.auth.getUser(),
        (async () => {
            try {
                return await getLeaderboardMeta(gameId);
            } catch (error) {
                console.error('Failed to load leaderboard meta:', error);
                notFound();
            }
        })(),
    ]);

    const user = userResult?.user ?? null;

    let viewerLobbyId = null;
    let restrictToLobby = true;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        const role = profile?.role ?? 'player';
        restrictToLobby = role !== 'admin';

        if (restrictToLobby) {
            const { data: membership } = await supabase
                .from('lobby_participants')
                .select('lobby_id')
                .eq('profile_id', user.id)
                .maybeSingle();

            viewerLobbyId = membership?.lobby_id ?? null;
        }
    } else {
        restrictToLobby = false;
    }

    const initialData = restrictToLobby && !viewerLobbyId
        ? []
        : await getLeaderboardData(gameId, 'cumulative', viewerLobbyId);

    return (
        <div className="relative min-h-screen bg-slate-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(circle_at_85%_15%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.18),transparent_60%)]" />
            <LeaderboardClient
                gameId={gameId}
                gameName={meta.gameName}
                roundOptions={meta.roundNumbers}
                initialData={initialData}
                viewerLobbyId={viewerLobbyId}
                restrictToLobby={restrictToLobby}
            />
        </div>
    );
}