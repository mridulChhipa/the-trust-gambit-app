// src/app/play/[gameId]/RoundResults.js
'use client';

const getActionDescription = (action) => {
    switch (action.action_type) {
    case 'solve':
        return 'Attempted to solve';
    case 'delegate':
        return `Delegated to ${action.profiles_delegated?.username || 'Unknown'}`;
    case 'pass':
        return 'Passed';
    default:
        return 'No action';
    }
};

export default function RoundResults({ results }) {
    if (!results) return null;

    const combinedData = results.actions.map(action => {
        const scoreInfo = results.scores.find(s => s.profile_id === action.profile_id);
        return {
            username: action.profiles.username,
            actionDescription: getActionDescription(action),
            scoreChange: scoreInfo?.score_change ?? 0,
            finalScore: scoreInfo?.final_score_after_round ?? 0,
        };
    }).sort((a, b) => b.finalScore - a.finalScore);

    return (
        <div className="space-y-6">
            <header className="rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Round {results.roundNumber}</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">Results recap</h2>
                    </div>
                    <span className="rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                        Correct answer
                    </span>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                    <p className="font-semibold text-white">{results.question}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/60">Answer</p>
                    <p className="mt-1 text-base font-semibold text-emerald-200">{results.answer}</p>
                </div>
            </header>

            <section className="rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/60">Sorted by total score</span>
                </div>
                <ul className="mt-4 space-y-3">
                    {combinedData.map((player, index) => (
                        <li
                            key={`${player.username}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                        >
                            <div>
                                <p className="text-sm font-semibold text-white">{player.username}</p>
                                <p className="text-xs text-white/60">{player.actionDescription}</p>
                            </div>
                            <div className="text-right">
                                <span className={`block text-sm font-semibold ${player.scoreChange >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                                    {player.scoreChange >= 0 ? '+' : ''}{player.scoreChange.toFixed(2)}
                                </span>
                                <span className="text-xs uppercase tracking-[0.2em] text-white/60">Total</span>
                                <p className="text-sm font-semibold text-white">{player.finalScore.toFixed(2)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
