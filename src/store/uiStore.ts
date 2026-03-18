import { create } from 'zustand'

interface Toast {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
}

interface UIState {
    theme: 'dark' | 'light'
    sidebarOpen: boolean
    activeMapLayer: 'health' | 'defects' | 'excavations' | 'complaints'
    selectedRoadId: string | null
    toasts: Toast[]
    setTheme: (theme: 'dark' | 'light') => void
    toggleTheme: () => void
    setSidebar: (open: boolean) => void
    setMapLayer: (layer: UIState['activeMapLayer']) => void
    setSelectedRoad: (id: string | null) => void
    addToast: (toast: Omit<Toast, 'id'>) => void
    removeToast: (id: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
    theme: 'light',
    sidebarOpen: true,
    activeMapLayer: 'health',
    selectedRoadId: null,
    toasts: [],
    setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('roadtwin-theme', theme)
        set({ theme })
    },
    toggleTheme: () => set((s) => {
        const next = s.theme === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        localStorage.setItem('roadtwin-theme', next)
        return { theme: next }
    }),
    setSidebar: (sidebarOpen) => set({ sidebarOpen }),
    setMapLayer: (activeMapLayer) => set({ activeMapLayer }),
    setSelectedRoad: (selectedRoadId) => set({ selectedRoadId }),
    addToast: (toast) => {
        const id = Math.random().toString(36).substr(2, 9)
        set((s) => ({
            toasts: [...s.toasts, { ...toast, id }]
        }))
        if (toast.duration !== 0) {
            setTimeout(() => {
                set((s) => ({
                    toasts: s.toasts.filter((t) => t.id !== id)
                }))
            }, toast.duration || 5000)
        }
    },
    removeToast: (id) => set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== id)
    }))
}))
