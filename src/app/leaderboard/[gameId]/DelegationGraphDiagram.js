'use client';

import { useId, useMemo } from 'react';

function polarToCartesian(angle, radius, center) {
    return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
    };
}

function getNodePositions(nodes) {
    const count = nodes.length;
    const size = 420;
    const center = size / 2;

    if (count === 0) {
        return { size, center, positions: new Map() };
    }

    if (count === 1) {
        return {
            size,
            center,
            positions: new Map([[nodes[0].id, { ...nodes[0], x: center, y: center }]]),
        };
    }

    const angleStep = (2 * Math.PI) / count;
    const radius = Math.max(110, Math.min(160, center - 40));

    const positions = new Map();
    nodes.forEach((node, index) => {
        const angle = -Math.PI / 2 + index * angleStep;
        const { x, y } = polarToCartesian(angle, radius, center);
        positions.set(node.id, { ...node, x, y });
    });

    return { size, center, positions };
}

export default function DelegationGraphDiagram({ graph }) {
    const markerId = useId();
    const edges = graph?.edges || [];
    const nodes = graph?.nodes || [];

    const { size, positions } = useMemo(() => getNodePositions(nodes), [nodes]);

    if (nodes.length === 0) {
        return null;
    }

    return (
        <svg
            role="img"
            aria-label="Delegation graph"
            viewBox={`0 0 ${size} ${size}`}
            className="h-full w-full"
        >
            <defs>
                <marker
                    id={`arrow-${markerId}`}
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(129, 140, 248, 0.9)" />
                </marker>
            </defs>

            <g>
                {edges.map((edge, index) => {
                    const from = positions.get(edge.fromId);
                    const to = positions.get(edge.toId);
                    if (!from || !to) return null;

                    const dx = to.x - from.x;
                    const dy = to.y - from.y;
                    const length = Math.sqrt(dx * dx + dy * dy) || 1;
                    const offsetRatio = 32 / length;
                    const startX = from.x + dx * offsetRatio;
                    const startY = from.y + dy * offsetRatio;
                    const endX = to.x - dx * offsetRatio;
                    const endY = to.y - dy * offsetRatio;

                    return (
                        <line
                            key={`${edge.fromId}-${edge.toId}-${index}`}
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="rgba(129, 140, 248, 0.6)"
                            strokeWidth="2"
                            markerEnd={`url(#arrow-${markerId})`}
                        />
                    );
                })}
            </g>

            <g>
                {nodes.map((node) => {
                    const point = positions.get(node.id);
                    if (!point) return null;
                    return (
                        <g key={node.id} className="transition-transform hover:scale-105">
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={20}
                                fill="rgba(255,255,255,0.12)"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="1.5"
                            />
                            <text
                                x={point.x}
                                y={point.y + 36}
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.85)"
                                fontSize="11"
                                fontWeight="600"
                            >
                                {node.name || 'Unknown'}
                            </text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
