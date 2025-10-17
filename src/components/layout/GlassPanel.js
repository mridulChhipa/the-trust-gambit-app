'use client';

export default function GlassPanel({ children, className = '' }) {
    const classes = ['rounded-2xl border border-white/12 bg-white/5 p-4', className].filter(Boolean).join(' ');
    return (
        <div className={classes}>
            {children}
        </div>
    );
}
