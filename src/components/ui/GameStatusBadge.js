import BadgePill from './BadgePill';

export default function GameStatusBadge({ status, variant = 'on-dark', size = 'sm', className = '' }) {
    const normalized = (status || 'unknown').toLowerCase();
    const toneByStatus = {
        active: 'emerald',
        pending: 'amber',
        completed: 'slate',
        unknown: 'neutral',
    };

    const tone = toneByStatus[normalized] ?? toneByStatus.unknown;
    const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    const badgeVariant = variant === 'light' ? 'frost' : 'tint';

    return (
        <BadgePill tone={tone} variant={badgeVariant} size={size} className={className}>
            {label}
        </BadgePill>
    );
}
