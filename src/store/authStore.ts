import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '../types'

interface AuthState {
    user: User | null
    profile: Profile | null
    isLoading: boolean
    isAdmin: () => boolean
    canWrite: () => boolean
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    setLoading: (loading: boolean) => void
    clear: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            isLoading: true,
            isAdmin: () => get().profile?.role === 'admin',
            canWrite: () => ['admin', 'engineer', 'inspector'].includes(get().profile?.role || ''),
            setUser: (user) => set({ user }),
            setProfile: (profile) => set({ profile }),
            setLoading: (isLoading) => set({ isLoading }),
            clear: () => set({ user: null, profile: null }),
        }),
        {
            name: 'roadtwin-auth',
            partialize: (s) => ({ profile: s.profile })
        }
    )
)
