export default function BadgePill({ children, tone = 'neutral', variant = 'frost', size = 'md', className = '' }) {
    const toneStyles = {
        neutral: {
            frost: 'border border-white/20 text-white/70',
            tint: 'border border-white/20 bg-white/10 text-white/80',
        },
        emerald: {
            frost: 'border border-emerald-300/60 text-emerald-100',
            tint: 'border border-emerald-200/40 bg-emerald-500/25 text-emerald-100',
        },
        amber: {
            frost: 'border border-amber-300/60 text-amber-100',
            tint: 'border border-amber-200/40 bg-amber-500/25 text-amber-100',
        },
        slate: {
            frost: 'border border-slate-200/50 text-slate-100',
            tint: 'border border-slate-200/40 bg-slate-500/25 text-slate-100',
        },
        sky: {
            frost: 'border border-sky-300/60 text-sky-100',
            tint: 'border border-sky-200/40 bg-sky-500/20 text-sky-100',
        },
        indigo: {
            frost: 'border border-indigo-300/60 text-indigo-100',
            tint: 'border border-indigo-200/40 bg-indigo-500/25 text-indigo-100',
        },
    };

    const sizeStyles = {
        sm: 'px-3 py-1 tracking-[0.25em]',
        md: 'px-4 py-1 tracking-[0.3em]',
        lg: 'px-5 py-1 tracking-[0.35em]',
    };

    const baseClasses = 'inline-flex items-center rounded-full text-xs font-semibold uppercase';
    const toneClass = toneStyles[tone]?.[variant] ?? toneStyles.neutral[variant] ?? toneStyles.neutral.frost;
    const sizeClass = sizeStyles[size] ?? sizeStyles.md;

    const classes = [baseClasses, sizeClass, toneClass, className].filter(Boolean).join(' ');

    return <span className={classes}>{children}</span>;
}
