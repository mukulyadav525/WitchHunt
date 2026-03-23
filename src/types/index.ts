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
    depth_min_m?: number | null
    depth_max_m?: number | null
    depth_avg_m: number
    diameter_mm?: number
    material?: string
    installation_date?: string | null
    spec_value?: string
    safety_score?: number
    is_abandoned?: boolean
    condition: 'good' | 'fair' | 'poor' | 'critical'
    condition_score?: number | null
    risk_level?: string | null
    last_inspection_date?: string | null
    start_location: { lat: number; lng: number }
    end_location: { lat: number; lng: number }
    geom: any
}

export interface UtilityConflictZone {
    id: string
    conflict_type: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    notes: string
    detected_at: string
}

export interface CoordinationBundle {
    id: string
    bundle_code: string
    road_name: string
    permit_count: number
    recommended_start: string
    recommended_end: string
    traffic_impact_score: number
    delay_probability: number
    cost_savings_inr: number
    coordination_dept: string
    rationale: string
    permits: string[]
    recommended_window: string
    emergency_protocol: string
    notification_plan: string
    qr_board_url: string
}

export interface AIAuditLog {
    id: string
    module: string
    config_key?: string | null
    model_provider: string
    model_name: string
    input_tokens: number
    output_tokens: number
    latency_ms: number
    success: boolean
    error_message?: string | null
    created_at: string
}

export interface PermitActionAuditLog {
    id: string
    permit_number: string
    road_name: string
    entity_type: 'approval' | 'closure_proof' | 'payment' | 'public_feedback'
    entity_id: string
    actor_name: string
    actor_role: string
    action: string
    details: string
    immutable_hash: string
    created_at: string
}

export interface PublicVerificationEvent {
    id: string
    permit_number: string
    road_name: string
    ward: string
    source: 'qr_scan' | 'tracker_search' | 'public_portal'
    outcome: 'verified' | 'flagged'
    viewer_ref: string
    created_at: string
}

export interface PolicyAlert {
    id: string
    category: 'repeat_dig' | 'emergency_abuse' | 'closure_gap' | 'public_trust'
    severity: 'medium' | 'high' | 'critical'
    title: string
    description: string
    owner: string
    road_name: string
    permit_number?: string | null
    created_at: string
}

export interface AccessProfile {
    id: string
    full_name: string
    email: string
    role: UserRole | 'field_supervisor'
    department: string | null
    city: string
    is_active: boolean
    last_active_at: string
    clearance: 'restricted' | 'standard' | 'elevated' | 'admin'
}

export interface FleetCameraEvent {
    id: string
    partner: string
    route_name: string
    camera_id: string
    event_type: 'pothole' | 'water_logging' | 'manhole' | 'debris' | 'surface_damage'
    severity: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
    captured_at: string
    road_name: string
    status: 'queued' | 'triaged' | 'dispatched' | 'resolved'
}

export interface PublicWorksiteTimelineItem {
    label: string
    date: string
    done: boolean
    note?: string
}

export type ClosureEvidenceStage = 'before' | 'during' | 'after'
export type ClosureProofStatus = 'collecting' | 'ready_for_review' | 'approved' | 'rejected' | 'paid'
export type PaymentMilestoneStatus = 'pending' | 'verified' | 'released'

export interface ClosureEvidenceItem {
    id: string
    stage: ClosureEvidenceStage
    captured_at: string
    uploaded_by: string
    note: string
    photo_url: string
    utility_depth_found_m?: number | null
    geo_tag?: { lat: number; lng: number } | null
}

export interface ClosureProofPackage {
    id: string
    worksite_id: string
    permit_number: string
    work_order_id?: string | null
    road_name: string
    ward: string
    contractor: string
    status: ClosureProofStatus
    before_count: number
    during_count: number
    after_count: number
    geo_tag_coverage_percent: number
    utility_depth_verified: boolean
    surface_reinstatement_score: number
    payout_completion_percent: number
    engineer_sign_off?: string | null
    payment_hold_reason?: string | null
    proof_notes: string
    updated_at: string
}

export interface PaymentMilestone {
    id: string
    closure_proof_id: string
    permit_number: string
    label: string
    amount_inr: number
    due_on: string
    status: PaymentMilestoneStatus
    released_at?: string | null
    note: string
}

export interface CitizenCompletionFeedback {
    id: string
    permit_number: string
    road_name: string
    ward: string
    citizen_name: string
    rating: number
    feedback: string
    photo_url?: string | null
    submitted_at: string
}

export interface PublicWorksite {
    id: string
    permit_number: string
    road_name: string
    ward?: string
    zone?: string
    location?: { lat: number; lng: number }
    purpose: string
    department: string
    contractor: string
    status: 'planned' | 'active' | 'delayed' | 'completed'
    progress_percent: number
    requested_start_date: string
    requested_end_date: string
    estimated_completion: string
    budget_inr: number
    traffic_impact_score: number
    delay_probability: number
    delay_reason?: string | null
    detour: string
    qr_verified: boolean
    blockchain_hash: string
    contact_name: string
    contact_phone: string
    subscriber_count?: number
    citizen_rating?: number
    closure_type?: 'full' | 'partial' | 'night_only'
    photo_urls?: string[]
    photo_timeline?: ClosureEvidenceItem[]
    archive_ready?: boolean
    updates: PublicWorksiteTimelineItem[]
}

export interface NotificationSubscription {
    id: string
    worksite_id: string
    permit_number: string
    road_name: string
    ward: string
    subscriber_name: string
    subscriber_phone: string
    channel: 'sms' | 'whatsapp' | 'push'
    language: string
    radius_m: number
    source: 'public_portal' | 'field_qr'
    status: 'active' | 'muted'
    created_at: string
}

export interface SmartNotification {
    id: string
    title: string
    body: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    channel: 'sms' | 'whatsapp' | 'push' | 'ivr'
    audience: 'citizens' | 'traffic_police' | 'shopkeepers' | 'fleet_operators' | 'utility_teams'
    status: 'draft' | 'scheduled' | 'sent' | 'delivered'
    road_name: string
    ward: string
    scheduled_for: string
    radius_m: number
    related_permit_number?: string | null
    detour?: string | null
    language: string
}

export interface CitizenChampion {
    id: string
    name: string
    ward: string
    points: number
    badge: string
    validated_reports: number
    streak_days: number
    recent_win: string
}

export interface WardLeaderboardEntry {
    ward: string
    total_points: number
    validated_reports: number
    fix_rate_percent: number
    top_badge: string
}

export interface CivicRewardRule {
    id: string
    action: string
    points: number
    description: string
}

export interface RoadTwinSnapshot {
    year: number
    health_score: number
    defect_count: number
    visible_utilities: number
    active_workzones: number
    note: string
}

export interface PermitApprovalStep {
    id: string
    role: string
    approver_name: string
    status: 'pending' | 'approved' | 'flagged' | 'provisional'
    approved_at?: string | null
    note?: string | null
    required: boolean
}

export interface PermitApprovalRecord {
    id: string
    permit_id: string
    permit_number: string
    road_name: string
    purpose: string
    emergency: boolean
    road_protection_rule: boolean
    status: 'draft' | 'under_review' | 'approved' | 'flagged' | 'provisional'
    required_signatures: number
    collected_signatures: number
    blockchain_hash: string
    qr_code_url: string
    public_verification_url: string
    compliance_flags: string[]
    post_audit_due?: string | null
    closure_state: 'pending' | 'documenting' | 'ready_for_archive' | 'archived'
    closure_evidence: ClosureEvidenceItem[]
    steps: PermitApprovalStep[]
}

export interface RouteAlertSubscription {
    id: string
    subscriber_name: string
    subscriber_phone: string
    channel: 'sms' | 'whatsapp' | 'push'
    language: string
    ward: string
    route_name: string
    city: string
    commute_window: string
    source: 'public_portal' | 'notification_center'
    status: 'active' | 'muted'
    created_at: string
}

export interface EmergencyChecklistItem {
    id: string
    label: string
    owner: string
    done: boolean
}

export interface EmergencyIncident {
    id: string
    permit_number: string
    road_name: string
    ward: string
    incident_type: 'gas_leak' | 'electrical_fault' | 'burst_main' | 'road_collapse'
    protocol: 'Protocol A' | 'Protocol B' | 'Protocol C' | 'Protocol D'
    severity: RiskLevel
    status: 'new' | 'mobilized' | 'stabilized' | 'post_audit_due' | 'closed'
    summary: string
    triggered_at: string
    response_sla_minutes: number
    affected_radius_m: number
    diversion_route: string
    field_language: string
    nearest_utilities: string[]
    notified_departments: string[]
    permit_approval_id?: string | null
    post_audit_due?: string | null
    checklist: EmergencyChecklistItem[]
}

export interface ContractorScorecard {
    id: string
    contractor: string
    active_projects: number
    completed_projects: number
    on_time_rate_percent: number
    closure_evidence_rate_percent: number
    citizen_rating: number
    repeat_dig_penalties: number
    safety_incidents: number
    coordination_score: number
    delay_risk: number
    last_audit_at: string
    public_grade: 'A' | 'B' | 'C' | 'D'
    watchlist: boolean
    strongest_metric: string
    risk_note: string
}

export type FieldWorkflowKind = 'road_survey' | 'emergency' | 'utility_marking'

export interface FieldCaptureDraft {
    id: string
    workflow: FieldWorkflowKind
    title: string
    road_name: string
    ward: string
    operator_name: string
    language: 'Hindi' | 'Hindi + English' | 'English'
    voice_note_text: string
    summary: string
    photo_count: number
    permit_number?: string | null
    emergency_type?: EmergencyIncident['incident_type'] | null
    status: 'queued_offline' | 'ready_to_sync' | 'synced'
    lat: number
    lng: number
    captured_at: string
    synced_at?: string | null
}

export type SignalFusionSource = 'complaint' | 'fleet' | 'survey' | 'field'

export interface SignalFusionCase {
    id: string
    road_name: string
    ward: string
    defect_focus: string
    citizen_reports_48h: number
    total_citizen_reports: number
    fleet_hits: number
    survey_hits: number
    field_hits: number
    severity: Priority
    confidence_score: number
    auto_escalated: boolean
    validation_status: 'monitoring' | 'auto_escalated' | 'engineer_validated' | 'work_ordered'
    linked_work_order_id?: string | null
    source_mix: SignalFusionSource[]
    summary: string
    recommended_action: string
    engineer_note?: string | null
    first_seen_at: string
    last_seen_at: string
}

export type WorkOrderSource = 'complaint' | 'prediction' | 'survey' | 'emergency' | 'fleet' | 'signal'
export type WorkOrderStatus = 'queued' | 'assigned' | 'in_progress' | 'completed'

export interface WorkOrder {
    id: string
    order_number: string
    title: string
    road_name: string
    ward: string
    source: WorkOrderSource
    source_id: string
    priority: Priority
    status: WorkOrderStatus
    assigned_department: string
    assigned_crew: string
    due_by: string
    estimated_cost_inr: number
    bilingual_summary: {
        en: string
        hi: string
    }
    permit_number?: string | null
    created_at: string
    completed_at?: string | null
}

export interface TrafficAdvisory {
    id: string
    permit_number: string
    road_name: string
    ward: string
    affected_routes: string[]
    estimated_delay_minutes: number
    disruption_score: number
    closure_window: string
    detour: string
    police_notified: boolean
    fleet_notified: boolean
    citizen_notice_status: 'draft' | 'scheduled' | 'sent'
    event_watch: string
    recommended_window: string
    status: 'planned' | 'active' | 'cleared'
}

export interface DelayRiskAssessment {
    id: string
    permit_number: string
    road_name: string
    ward: string
    contractor: string
    delay_probability: number
    suggested_buffer_days: number
    risk_factors: string[]
    required_sign_off: 'none' | 'city_engineer' | 'commissioner'
    escalation_status: 'monitoring' | 'needs_sign_off' | 'escalated' | 'mitigated'
    public_completion_date: string
    last_reviewed_at: string
}
