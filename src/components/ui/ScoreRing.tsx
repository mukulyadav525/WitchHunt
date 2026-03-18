import React from 'react';

interface Props {
    score: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
}

export function ScoreRing({ score, size = 80, strokeWidth, label }: Props) {
    const sw = strokeWidth || size * 0.09;
    const r = size * 0.38;
    const circ = 2 * Math.PI * r;
    const color = score >= 70 ? 'var(--green-mid)'
        : score >= 45 ? 'var(--yellow-mid)'
            : 'var(--red-mid)';

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="var(--bg-panel)"
                    strokeWidth={sw}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={color}
                    strokeWidth={sw}
                    fill="none"
                    strokeDasharray={circ}
                    strokeDashoffset={circ - (score / 100) * circ}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: size * 0.26,
                    fontWeight: 500,
                    color,
                    lineHeight: 1
                }}>{Math.round(score)}</span>
                <span style={{
                    fontSize: size * 0.15,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em'
                }}>/ 100</span>
            </div>
        </div>
    );
}
