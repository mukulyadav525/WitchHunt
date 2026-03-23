import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { UserRole } from '../../types'

interface Props {
    children: React.ReactNode
    requiredRole?: UserRole
    requireAdmin?: boolean
}

export function ProtectedRoute({ children, requiredRole, requireAdmin }: Props) {
    const { user, profile, isLoading } = useAuthStore()

    if (isLoading) {
        return (
            <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
                <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Verifying Identity</div>
            </div>
        )
    }

    if (!user) return <Navigate to="/auth" replace />

    if (requireAdmin && profile?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }

    if (requiredRole) {
        const hierarchy: UserRole[] = ['citizen', 'inspector', 'engineer', 'admin']
        const userLevel = hierarchy.indexOf(profile?.role || 'citizen')
        const requiredLevel = hierarchy.indexOf(requiredRole)
        if (userLevel < requiredLevel) return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}
