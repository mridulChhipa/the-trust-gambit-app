export default function StatCard({ label, value, hint, accent = 'from-slate-500 to-slate-600', valueClassName = '', className = '' }) {
    const containerClasses = ['rounded-2xl border border-white/15 bg-gradient-to-br', accent, 'px-4 py-5 shadow-lg shadow-black/30', className]
        .filter(Boolean)
        .join(' ');
    const valueClasses = ['mt-3 text-3xl font-bold text-white', valueClassName].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">{label}</p>
            <p className={valueClasses}>{value}</p>
            {hint ? <p className="text-xs text-white/70">{hint}</p> : null}
        </div>
    );
}
