import React from 'react';
import { cn } from '../../lib/utils';

interface Props {
    status: string;
    variant?: 'danger' | 'warning' | 'success' | 'info' | 'orange' | 'purple';
    className?: string;
}

export function StatusBadge({ status, variant = 'info', className }: Props) {
    return (
        <span className={cn(
            'badge',
            `badge-${variant}`,
            className
        )}>
            {status}
        </span>
    );
}
