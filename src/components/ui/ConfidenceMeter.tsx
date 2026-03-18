import React from 'react';

export function ConfidenceMeter({ confidence }: { confidence: number }) {
    const percentage = Math.round(confidence * 100);

    return (
        <div className="space-y-1.5 w-full">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                <span>AI Confidence</span>
                <span className={confidence > 0.8 ? 'text-[var(--green)]' : 'text-[var(--yellow)]'}>{percentage}%</span>
            </div>
            <div className="h-1 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
