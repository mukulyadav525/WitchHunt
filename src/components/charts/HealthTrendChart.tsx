import React from 'react';

export function HealthTrendChart({ roadId }: { roadId: string }) {
    // Mock data for the sparkline/trend
    const points = [85, 82, 83, 78, 75, 76, 72, 68, 65, 62];
    const max = 100;
    const min = 0;
    const width = 1000;
    const height = 200;

    const getX = (i: number) => (i / (points.length - 1)) * width;
    const getY = (v: number) => height - ((v - min) / (max - min)) * height;

    const pathData = points.reduce((acc, v, i) =>
        acc + (i === 0 ? `M ${getX(i)} ${getY(v)}` : ` L ${getX(i)} ${getY(v)}`),
        "");

    const areaData = pathData + ` L ${getX(points.length - 1)} ${height} L 0 ${height} Z`;

    return (
        <div className="w-full h-full relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Area Fill */}
                <path d={areaData} fill="url(#healthGradient)" opacity="0.1" />

                {/* Trend Line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_var(--accent-dim)]"
                />

                {/* Dynamic Nodes */}
                {points.map((v, i) => (
                    <circle
                        key={i}
                        cx={getX(i)}
                        cy={getY(v)}
                        r="4"
                        fill="var(--bg-base)"
                        stroke="var(--accent)"
                        strokeWidth="2"
                    />
                ))}

                <defs>
                    <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Overlay Labels */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest pt-4">
                <span>Survey Cycle Q1 '24</span>
                <span>Current Status</span>
                <span>Forecast Q4 '26</span>
            </div>
        </div>
    );
}
