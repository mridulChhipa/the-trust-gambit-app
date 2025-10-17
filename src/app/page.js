import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import BadgePill from '@/components/ui/BadgePill';
import StatCard from '@/components/ui/StatCard';
import GameStatusBadge from '@/components/ui/GameStatusBadge';

async function getDashboardData() {
    const supabase = await getServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { user: null };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', user.id)
        .maybeSingle();

    const role = profile?.role || 'player';
    const isAdmin = role === 'admin';

    const userData = { ...user, username: profile?.username || user.email, role };

    if (isAdmin) {
        // --- Admin Data Fetching ---
        const { data: games } = await supabase
            .from('games')
            .select('id, name, status, created_at')
            .order('created_at', { ascending: false });

        return { user: userData, isAdmin, games: games || [] };
    } else {
        // --- Player Data Fetching ---
        const { data: participant } = await supabase
            .from('lobby_participants')
            .select('lobbies(games(id, name, status))')
            .eq('profile_id', user.id)
            .maybeSingle();

        let gameInfo = participant?.lobbies?.games ?? null;

        if (!gameInfo) {
            const { data: fallbackGame } = await supabase
                .from('games')
                .select('id, name, status')
                .in('status', ['active', 'pending'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            gameInfo = fallbackGame ?? null;
        }

        return { user: userData, isAdmin, game: gameInfo };
    }
}

export default async function DashboardPage() {
    const data = await getDashboardData();

    if (!data.user) {
        redirect('/login');
    }

    // Conditionally render the correct dashboard based on the user's role
    if (data.isAdmin) {
        return <AdminDashboard user={data.user} games={data.games} />;
    } else {
        return <PlayerDashboard user={data.user} game={data.game} />;
    }
}

// =============================================
//          ADMIN DASHBOARD COMPONENT
// =============================================
function AdminDashboard({ user, games }) {
    const statusCounts = games.reduce(
        (acc, game) => {
            const key = game.status ?? 'unknown';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        },
        { active: 0, pending: 0, completed: 0, unknown: 0 }
    );

    const totalGames = games.length;
    const spotlightGame = games.find(game => game.status === 'active') || games[0] || null;

    return (
        <div className="relative min-h-[calc(100vh-4rem)] bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(circle_at_85%_15%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.18),transparent_60%)]" />
            <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 space-y-12">
                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-slate-100 shadow-2xl backdrop-blur">
                        <BadgePill>Administrator</BadgePill>
                        <h1 className="mt-6 text-4xl font-bold leading-tight">Welcome back, {user.username}</h1>
                        <p className="mt-4 max-w-md text-white/80">
                            Keep the momentum going—prepare rounds, orchestrate lobbies, and keep every player aligned.
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <StatCard label="Total games" value={totalGames} accent="from-indigo-500 to-sky-500" hint="Across all stages" />
                            <StatCard label="Active" value={statusCounts.active} accent="from-emerald-500 to-teal-400" hint="Running right now" />
                            <StatCard label="Pending" value={statusCounts.pending} accent="from-amber-500 to-orange-400" hint="Awaiting kickoff" />
                        </div>

                        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5">
                            {spotlightGame ? (
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Spotlight</p>
                                        <p className="text-lg font-semibold">{spotlightGame.name}</p>
                                        <p className="text-sm text-white/70">Status: <GameStatusBadge status={spotlightGame.status} variant="on-dark" /></p>
                                    </div>
                                    <Link
                                        href={`/admin/manage/${spotlightGame.id}`}
                                        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/20 transition hover:shadow-lg"
                                    >
                                        Manage this game
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-lg font-semibold">No games yet</p>
                                        <p className="text-sm text-white/70">Create your first game to start building trust battles.</p>
                                    </div>
                                    <Link
                                        href="/admin/create-game"
                                        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/20 transition hover:shadow-lg"
                                    >
                                        Launch game
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-white p-8 shadow-xl shadow-indigo-500/10">
                        <h2 className="text-xl font-semibold text-slate-900">Command Center</h2>
                        <p className="mt-2 text-sm text-slate-500">Jump straight into the tasks that keep the competition moving.</p>

                        <nav className="mt-6 space-y-4">
                            <QuickAction
                                title="Create a new game"
                                description="Set trust parameters, tune difficulty, and invite players."
                                href="/admin/create-game"
                                accent="bg-indigo-100 text-indigo-600"
                            />
                            <QuickAction
                                title="Go to live controls"
                                description="Advance rounds, broadcast scores, and keep games on tempo."
                                href={spotlightGame ? `/admin/manage/${spotlightGame.id}` : '/admin/create-game'}
                                accent="bg-emerald-100 text-emerald-600"
                                disabled={!spotlightGame}
                            />
                            <QuickAction
                                title="Manage lobbies"
                                description="Balance expertise and diversity before each round begins."
                                href={spotlightGame ? `/admin/manage/${spotlightGame.id}` : '/admin/create-game'}
                                accent="bg-sky-100 text-sky-600"
                                disabled={!spotlightGame}
                            />
                        </nav>
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-slate-900/20 backdrop-blur">
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 text-white">
                        <div>
                            <h3 className="text-lg font-semibold">Games overview</h3>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Latest activity</p>
                        </div>
                        <BadgePill size="sm" variant="frost">{totalGames} total</BadgePill>
                    </div>

                    <div className="divide-y divide-white/10">
                        {games.length > 0 ? (
                            games.slice(0, 8).map(game => (
                                <Link
                                    key={game.id}
                                    href={`/admin/manage/${game.id}`}
                                    className="flex items-center justify-between px-6 py-4 transition hover:bg-white/10"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-white">{game.name}</p>
                                        <p className="text-xs text-white/70">Created {new Date(game.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <GameStatusBadge status={game.status} variant="on-dark" />
                                </Link>
                            ))
                        ) : (
                            <div className="px-6 py-8 text-center text-sm text-white/70">
                                No games yet. Start with a fresh scenario to see it here.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}


// =============================================
//          PLAYER DASHBOARD COMPONENT
// =============================================
function PlayerDashboard({ user, game }) {
    const status = game?.status ?? 'pending';

    return (
        <div className="relative min-h-[calc(100vh-4rem)] bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(circle_at_90%_15%,rgba(129,140,248,0.3),transparent_55%),radial-gradient(circle_at_50%_85%,rgba(59,130,246,0.25),transparent_55%)]" />
            <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 space-y-12">
                <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr] items-stretch">
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-slate-100 shadow-2xl backdrop-blur">
                        <BadgePill>Player Dashboard</BadgePill>
                        <h1 className="mt-6 text-4xl font-bold leading-tight">Welcome back, {user.username}</h1>
                        <p className="mt-4 max-w-xl text-white/80">
                            Stay sharp. Each round rewards strategic delegation and confident solves. Track your position and prepare for the next decision point.
                        </p>

                        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Current game</p>
                                    {game ? (
                                        <>
                                            <p className="text-lg font-semibold">{game.name}</p>
                                            <p className="text-sm text-white/70">Status: <GameStatusBadge status={status} variant="on-dark" /></p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-lg font-semibold">Your next challenge is loading…</p>
                                            <p className="text-sm text-white/70">
                                                As soon as your admin opens the session you will launch from here, even if your lobby assignment arrives later.
                                            </p>
                                        </>
                                    )}
                                </div>
                                {game ? (
                                    <Link
                                        href={`/play/${game.id}`}
                                        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/20 transition hover:shadow-lg"
                                    >
                                        {status === 'completed' ? 'See final results' : 'Enter live round'}
                                    </Link>
                                ) : (
                                    <span
                                        className="inline-flex items-center justify-center rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white/70 shadow-md shadow-slate-900/10"
                                        aria-disabled="true"
                                    >
                                        Enter game
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-white p-8 shadow-xl shadow-slate-900/15">
                        <h2 className="text-xl font-semibold text-slate-900">Boost your edge</h2>
                        <p className="mt-2 text-sm text-slate-500">Refresh your profile so teammates know when to trust you with the solve.</p>

                        <div className="mt-6 space-y-4">
                            <QuickAction
                                title="Update domain ratings"
                                description="Log your current strengths to influence delegation."
                                href="/rate-domains"
                                accent="bg-indigo-100 text-indigo-600"
                            />
                            <QuickAction
                                title="Review last round"
                                description="Check how your lobby performed to refine your strategy."
                                href={game ? `/play/${game.id}` : '/play'}
                                accent="bg-sky-100 text-sky-600"
                                disabled={!game}
                            />
                            <QuickAction
                                title="Complete your profile"
                                description="Add context that helps the admin place you in the right team."
                                href="/setup-profile"
                                accent="bg-emerald-100 text-emerald-600"
                            />
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-2xl backdrop-blur">
                        <h3 className="text-lg font-semibold">Round readiness</h3>
                        <p className="mt-2 text-sm text-white/70">
                            Make sure you’re prepared for the next trust dilemma.
                        </p>
                        <ul className="mt-5 space-y-3 text-sm text-white/80">
                            <li className="flex items-start gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-500/80 text-xs font-semibold">1</span>
                                Confirm you can spot the experts in your lobby before delegating.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sky-500/80 text-xs font-semibold">2</span>
                                Review past scores to see who consistently delivers under pressure.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/80 text-xs font-semibold">3</span>
                                Stay ready with a backup solve—delegation works best with contingency plans.
                            </li>
                        </ul>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-white p-6 shadow-xl shadow-slate-900/15">
                        <h3 className="text-lg font-semibold text-slate-900">Need a refresher?</h3>
                        <p className="mt-2 text-sm text-slate-500">Trust is earned every round. Keep these essentials in your rotation.</p>
                        <div className="mt-5 grid gap-4 text-sm text-slate-600">
                            <ResourceCard
                                title="Game rules"
                                description="Understand scoring, delegation penalties, and cycle detection."
                                disabled
                            />
                            <ResourceCard
                                title="Lobby chat"
                                description="Sync strategy with your teammates before the timer starts."
                                href={game ? `/play/${game.id}` : '/play'}
                                disabled={!game}
                            />
                            <ResourceCard
                                title="Feedback loop"
                                description="Share insights after each round to build smarter trust networks."
                                disabled
                            />
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

function QuickAction({ title, description, href, accent, disabled = false }) {
    const content = (
        <div className={`flex my-2 items-start justify-between rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-4 transition ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-200 hover:bg-white'}`}>
            <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            <span className={`ml-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${accent}`}>{disabled ? 'Soon' : 'Go'}</span>
        </div>
    );

    if (disabled) {
        return <div>{content}</div>;
    }

    return <Link href={href}>{content}</Link>;
}

function ResourceCard({ title, description, href, disabled = false }) {
    const content = (
        <div className={`rounded-2xl border border-slate-200/60 px-4 py-4 transition ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-200 hover:bg-slate-50'}`}>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
    );

    if (disabled) {
        return <div>{content}</div>;
    }

    return <Link href={href}>{content}</Link>;
}