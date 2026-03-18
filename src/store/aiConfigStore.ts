import { create } from 'zustand'
import type { AIConfiguration } from '../types'

interface AIConfigState {
    configs: Record<string, AIConfiguration>
    isLoading: boolean
    lastFetched: Date | null
    setConfigs: (configs: Record<string, AIConfiguration>) => void
    updateConfig: (key: string, config: Partial<AIConfiguration>) => void
    setLoading: (loading: boolean) => void
    getConfig: (key: string) => AIConfiguration | null
    isStale: () => boolean
}

export const useAIConfigStore = create<AIConfigState>()((set, get) => ({
    configs: {},
    isLoading: false,
    lastFetched: null,
    setConfigs: (configs) => set({ configs, lastFetched: new Date() }),
    updateConfig: (key, config) => set((s) => ({
        configs: { ...s.configs, [key]: { ...s.configs[key], ...config } }
    })),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    getConfig: (key) => get().configs[key] || null,
    isStale: () => {
        const { lastFetched } = get()
        if (!lastFetched) return true
        return Date.now() - lastFetched.getTime() > 5 * 60 * 1000
    }
}))
