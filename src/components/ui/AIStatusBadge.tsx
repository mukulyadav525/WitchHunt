import React from 'react';
import { Sparkles, Activity } from 'lucide-react';

export function AIStatusBadge({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) {
    if (status === 'loading') {
        return (
            <div className="ai-badge" style={{ animation: 'ai-pulse 2s infinite' }}>
                <Activity size={14} className="animate-spin" />
                <span style={{ fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.04em' }}>AI Processing...</span>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <span className="ai-badge">
                <span className="ai-dot" />
                <span>AI Verified</span>
            </span>
        );
    }

    return null;
}
