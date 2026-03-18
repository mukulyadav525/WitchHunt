import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeStore } from '../store/realtimeStore'
import { useUIStore } from '../store/uiStore'

export function useRealtime() {
    const { incrementComplaints, incrementDefects, addAlert, addActivity } = useRealtimeStore()
    const { addToast } = useUIStore()

    useEffect(() => {
        // 1. Subscribe to new complaints
        const complaintSub = supabase
            .channel('complaints-live')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'complaints' },
                (payload) => {
                    const complaint = payload.new
                    incrementComplaints()
                    addActivity({
                        id: complaint.id,
                        type: 'complaint',
                        description: `New complaint: ${complaint.complaint_text?.slice(0, 60)}...`,
                        timestamp: complaint.created_at,
                        metadata: { urgency: complaint.urgency_score }
                    })

                    if (complaint.urgency_score >= 4) {
                        addToast({
                            type: 'error',
                            title: '🚨 Critical Complaint',
                            message: `Urgency ${complaint.urgency_score}/5 — ${complaint.road_name || 'Unknown road'}`,
                            duration: 8000
                        })
                        addAlert({
                            id: complaint.id,
                            type: 'complaint',
                            severity: complaint.urgency_score,
                            message: complaint.complaint_text?.slice(0, 100),
                            road_name: complaint.road_name || 'Unknown',
                            created_at: complaint.created_at
                        })
                    }
                }
            )
            .subscribe()

        // 2. Subscribe to new defects
        const defectSub = supabase
            .channel('defects-live')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'defects' },
                (payload) => {
                    const defect = payload.new
                    incrementDefects()
                    addActivity({
                        id: defect.id,
                        type: 'ai_analysis',
                        description: `AI detected ${defect.defect_type} (severity ${defect.severity})`,
                        timestamp: defect.created_at,
                        metadata: { confidence: defect.confidence }
                    })

                    if (parseInt(defect.severity) >= 4) {
                        addToast({
                            type: 'warning',
                            title: '⚠️ Critical Defect Detected',
                            message: `${defect.defect_type} severity ${defect.severity}/5`,
                            duration: 6000
                        })
                    }
                }
            )
            .subscribe()

        // 3. Subscribe to new predictions
        const predictionSub = supabase
            .channel('predictions-live')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'health_predictions' },
                (payload) => {
                    const pred = payload.new
                    addActivity({
                        id: pred.id,
                        type: 'prediction',
                        description: `Health prediction: ${pred.risk_level} risk, score ${pred.health_score}`,
                        timestamp: pred.created_at
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(complaintSub)
            supabase.removeChannel(defectSub)
            supabase.removeChannel(predictionSub)
        }
    }, [])
}
