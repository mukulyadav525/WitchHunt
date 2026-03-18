// src/types/index.ts

export type UserRole = 'admin' | 'engineer' | 'inspector' | 'citizen'

export type RoadSurface = 'bitumen' | 'concrete' | 'interlocking_blocks' | 'gravel' | 'WBM' | 'other'

export type DefectType = 'pothole' | 'crack' | 'water_logging' | 'surface_damage' | 'edge_break' | 'patching_failure' | 'utility_cut'

export type SeverityLevel = '1' | '2' | '3' | '4' | '5'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type PermitStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'bundled'

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'rejected'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Profile {
    id: string
    email: string
    full_name: string | null
    role: UserRole
    department: string | null
    phone: string | null
    city: string
    avatar_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface RoadSegment {
    id: string
    road_id: string
    name: string
    city: string
    ward: string | null
    zone: string | null
    length_km: number | null
    width_m: number | null
    surface_type: RoadSurface
    last_paved_date: string | null
    avg_daily_traffic: number | null
    heavy_vehicle_percentage: number | null
    health_score: number
    total_defects: number
    last_health_update: string | null
    location: { lat: number; lng: number; bounds?: number[][] } | null
    created_at: string
    updated_at: string
}

export interface Defect {
    id: string
    road_segment_id: string
    defect_type: DefectType
    severity: SeverityLevel
    confidence: number | null
    source: string
    status: string
    photo_url: string | null
    location: { lat: number; lng: number; address?: string } | null
    area_sqm: number | null
    description: string | null
    ai_analysis: DefectAIAnalysis | null
    repair_priority: string | null
    estimated_cost_inr: number | null
    created_at: string
}

export interface DefectAIAnalysis {
    type: DefectType
    severity: number
    confidence: number
    description: string
    location_in_image: string
    area_sqm: number
    repair_priority: string
    estimated_repair_cost_inr: number
}

export interface HealthPrediction {
    id: string
    road_segment_id: string
    health_score: number
    predicted_failure_date: string
    months_remaining: number
    risk_level: RiskLevel
    deterioration_rate: number
    risk_factors: RiskFactor[]
    recommendation: string
    maintenance_schedule: MaintenanceItem[]
    budget_estimate_inr: number
    confidence: number
    created_at: string
}

export interface RiskFactor {
    factor: string
    impact: 'high' | 'medium' | 'low'
    description: string
    score_impact: number
}

export interface MaintenanceItem {
    action: string
    due_by: string
    estimated_cost_inr: number
    priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface ExcavationPermit {
    id: string
    permit_number: string
    organization: string
    contact_name: string | null
    contact_phone: string | null
    purpose: string
    road_segment_id: string | null
    road_name: string | null
    location_description: string | null
    requested_start_date: string
    requested_end_date: string
    depth_m: number
    width_m: number | null
    status: PermitStatus
    urgency: 'low' | 'normal' | 'urgent' | 'emergency'
    bundle_id: string | null
    ai_optimization: ExcavationBundle | null
    created_at: string
}

export interface ExcavationBundle {
    bundle_id: string
    permits: string[]
    road: string
    reason_for_bundling: string
    recommended_start: string
    recommended_end: string
    preferred_time_slot: string
    traffic_impact_score: number
    disruption_days: number
    coordination_lead_dept: string
    warnings: string[]
    cost_savings_inr: number
}

export interface Complaint {
    id: string
    ticket_number: string
    complaint_text: string
    status: ComplaintStatus
    priority?: Priority
    urgency_score: number | null
    sentiment: string | null
    latitude?: number
    longitude?: number
    image_url?: string
    ai_analysis?: ComplaintAIAnalysis | null
    citizen_id?: string
    citizen_name?: string | null
    citizen_phone?: string | null
    assigned_org_id?: string
    created_at: string
    resolved_at?: string
    road_name?: string
    defect_type?: string
}

export interface ComplaintAIAnalysis {
    urgency_score: number
    urgency_label: string
    defect_type: string
    detected_language: string
    sentiment: string
    sentiment_score: number
    routing_department: string
    response_time_hours: number
    population_impact: number
    location_hint: string | null
    keywords: string[]
    complaint_summary_english: string
    ai_recommendation: string
    escalate_immediately: boolean
    confidence: number
}

export interface AIConfiguration {
    id: string
    config_key: string
    module: 'pothole' | 'prediction' | 'excavation' | 'complaint' | 'global' | 'road_survey'
    display_name: string
    description: string | null
    system_prompt: string
    model_provider: string
    model_name: string
    temperature: number
    max_tokens: number
    parameters: Record<string, unknown>
    version: number
    previous_prompts: PreviousPrompt[]
    is_active: boolean
    is_locked: boolean
    last_tested_at: string | null
    test_result: Record<string, unknown> | null
    updated_by: string | null
    updated_at: string
}

export interface PreviousPrompt {
    prompt: string
    version: number
    changed_at: string
    changed_by: string | null
    change_note?: string
}

export interface RoadImageSurvey {
    id: string
    title: string
    road_segment_id: string | null
    road_name: string | null
    lat_center: number
    lng_center: number
    photo_url: string
    ai_health_score: number
    ai_condition: string
    ai_defects: any[]
    ai_confidence: number
    created_at: string
}

export interface UtilityOrganization {
    id: string
    code: string
    name: string
    type: string
    color_hex: string
    icon: string
}

export interface UtilityInfrastructure {
    id: string
    utility_org_id: string
    road_name: string
    utility_type: 'water' | 'electricity' | 'gas' | 'sewage' | 'telecom'
    status: 'active' | 'under_maintenance' | 'planned' | 'abandoned'
    depth_avg_meters: number
    diameter_mm?: number
    material?: string
    installation_date?: string
    spec_value?: string
    safety_score?: number
    is_abandoned?: boolean
    condition: 'good' | 'fair' | 'poor' | 'critical'
    last_inspected: string
    start_location: { lat: number; lng: number }
    end_location: { lat: number; lng: number }
    geom: any
}
