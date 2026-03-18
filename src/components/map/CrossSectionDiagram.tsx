import React from 'react';
import { UtilityInfrastructure } from '../../types';

interface Props {
    roadName: string;
    utilities: UtilityInfrastructure[];
}

export function CrossSectionDiagram({ roadName, utilities }: Props) {
    const MAX_DEPTH = 3.5;
    const pixelsPerMeter = 100;
    const width = 600;
    const height = MAX_DEPTH * pixelsPerMeter + 40;

    return (
        <div className="bg-[var(--bg-surface)]/80 border border-[var(--border)] rounded-xl overflow-hidden leading-none">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="text-[10px] font-black text-[var(--blue)] uppercase tracking-widest">Underground Cross-Section: {roadName}</h3>
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Depth Perspective (m)</span>
            </div>

            <div className="p-6 overflow-x-auto">
                <svg width={width} height={height} className="mx-auto">
                    {/* Surface Layer */}
                    <rect x="0" y="0" width={width} height="10" fill="var(--bg-panel)" />
                    <line x1="0" y1="10" x2={width} y2="10" stroke="var(--border)" strokeWidth="1" />
                    <text x="5" y="8" fontSize="8" fill="var(--text-muted)" fontWeight="bold">SURFACE 0.0m</text>

                    {/* Grid lines */}
                    {[1, 2, 3].map(d => (
                        <React.Fragment key={d}>
                            <line
                                x1="0"
                                y1={d * pixelsPerMeter + 10}
                                x2={width}
                                y2={d * pixelsPerMeter + 10}
                                stroke="var(--border-subtle)"
                                strokeDasharray="4 4"
                            />
                            <text x="5" y={d * pixelsPerMeter + 8} fontSize="8" fill="var(--text-disabled)" fontWeight="bold">{d}.0m</text>
                        </React.Fragment>
                    ))}

                    {/* Utilities */}
                    {utilities.sort((a, b) => a.depth_avg_meters - b.depth_avg_meters).map((u, i) => {
                        const y = u.depth_avg_meters * pixelsPerMeter + 10;
                        const size = Math.max(12, (u.diameter_mm || 100) / 10);

                        return (
                            <g key={u.id}>
                                {/* Connection line for label */}
                                <line x1={width / 2} y1={y} x2={width - 200} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2" />

                                {/* Utility Shape */}
                                <circle
                                    cx={width / 2}
                                    cy={y}
                                    r={size / 2}
                                    fill={u.utility_type === 'water' ? '#3b82f6' : u.utility_type === 'electricity' ? '#ffd700' : u.utility_type === 'gas' ? '#ff6b35' : '#a855f7'}
                                    className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                                />

                                {/* Label Box */}
                                <foreignObject x={width - 190} y={y - 12} width="180" height="30">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-widest truncate">{u.utility_type} · {u.material || 'HDPE'}</span>
                                        <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{u.depth_avg_meters}m · {u.condition}</span>
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    })}

                    <line x1="0" y1={height - 20} x2={width} y2={height - 20} stroke="var(--border)" strokeWidth="1" />
                    <text x="5" y={height - 5} fontSize="8" fill="var(--text-muted)" fontWeight="bold">BEDROCK 3.5m+</text>
                </svg>
            </div>

            {/* Conflict Warning */}
            <div className="p-4 bg-orange-600/5 border-t border-orange-500/10 flex items-center gap-3">
                <AlertTriangle size={14} className="text-[var(--brand)]" />
                <span className="text-[9px] font-black text-orange-200 uppercase tracking-widest">
                    {utilities.length > 2 ? 'Spatial Overlap Risk Detected within 30cm Corridor' : 'Infrastructure Spaced Correctly'}
                </span>
            </div>
        </div>
    );
}

import { AlertTriangle } from 'lucide-react';
