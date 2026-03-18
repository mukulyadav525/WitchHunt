import { create } from 'zustand'

interface Alert {
    id: string
    type: 'complaint' | 'defect' | 'prediction'
    severity: number
    message: string
    road_name: string
    created_at: string
}

interface ActivityItem {
    id: string
    type: 'ai_analysis' | 'complaint' | 'permit' | 'prediction'
    description: string
    timestamp: string
    metadata?: Record<string, unknown>
}

interface RealtimeState {
    liveComplaints: number
    liveDefects: number
    criticalAlerts: Alert[]
    lastActivity: ActivityItem[]
    incrementComplaints: () => void
    incrementDefects: () => void
    addAlert: (alert: Alert) => void
    addActivity: (item: ActivityItem) => void
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
    liveComplaints: 0,
    liveDefects: 0,
    criticalAlerts: [],
    lastActivity: [],
    incrementComplaints: () => set((s) => ({ liveComplaints: s.liveComplaints + 1 })),
    incrementDefects: () => set((s) => ({ liveDefects: s.liveDefects + 1 })),
    addAlert: (alert) => set((s) => ({
        criticalAlerts: [alert, ...s.criticalAlerts].slice(0, 10)
    })),
    addActivity: (item) => set((s) => ({
        lastActivity: [item, ...s.lastActivity].slice(0, 20)
    }))
}))
