import { supabase } from './supabase';
import type {
    AccessProfile,
    AIAuditLog,
    CitizenCompletionFeedback,
    CitizenChampion,
    ClosureProofPackage,
    Complaint,
    ContractorScorecard,
    CoordinationBundle,
    DelayRiskAssessment,
    Defect,
    EmergencyIncident,
    ExcavationPermit,
    FieldCaptureDraft,
    FleetCameraEvent,
    HealthPrediction,
    NotificationSubscription,
    PaymentMilestone,
    PermitActionAuditLog,
    PermitApprovalRecord,
    PolicyAlert,
    PreDigChecklistItem,
    PreDigClearanceRecord,
    PublicVerificationEvent,
    PublicWorksite,
    RoadImageSurvey,
    RoadSegment,
    RoadTwinSnapshot,
    RouteAlertSubscription,
    SignalFusionCase,
    SmartNotification,
    TrafficAdvisory,
    UtilityConflictZone,
    UtilityInfrastructure,
    UtilityOrganization,
    WardLeaderboardEntry,
    CivicRewardRule,
    WorkOrder
} from '../types';

type TableName =
    | 'app_settings'
    | 'ai_usage_logs'
    | 'citizen_completion_feedback'
    | 'citizen_champions'
    | 'closure_proof_packages'
    | 'complaints'
    | 'contractor_scorecards'
    | 'delay_risk_assessments'
    | 'defects'
    | 'emergency_incidents'
    | 'excavation_bundles'
    | 'excavation_permits'
    | 'field_capture_drafts'
    | 'fleet_camera_events'
    | 'health_predictions'
    | 'notification_subscriptions'
    | 'payment_milestones'
    | 'permit_action_audit_logs'
    | 'permit_approval_records'
    | 'pre_dig_clearances'
    | 'profiles'
    | 'public_verification_events'
    | 'public_worksites'
    | 'road_image_surveys'
    | 'road_segments'
    | 'road_twin_snapshots'
    | 'route_alert_subscriptions'
    | 'signal_fusion_cases'
    | 'smart_notifications'
    | 'traffic_advisories'
    | 'utility_conflict_zones'
    | 'utility_infrastructure'
    | 'utility_organizations'
    | 'ward_leaderboard'
    | 'civic_reward_rules'
    | 'work_orders';

type RoadTwinSnapshotRow = {
    id: string;
    road_segment_id: string;
    snapshot_year: number;
    health_score: number;
    defect_count: number;
    visible_utilities: number;
    active_workzones: number;
    note: string | null;
    created_at: string;
};

type AppSettingRow = {
    setting_key: string;
    description?: string | null;
    value: any;
    updated_at?: string;
};

type GeoDefaults = {
    default_city: string;
    unassigned_ward_label: string;
};

type BrandingDefaults = {
    supported_cities: string[];
    department_node_label: string;
    platform_name: string;
    public_tracker_name: string;
};

type CoordinationDefaults = {
    department: string;
    fallback_road_name: string;
    rationale: string;
    recommended_window: string;
    summary_window_label: string;
    standard_emergency_protocol: string;
    urgent_emergency_protocol: string;
    notification_plan: string;
};

type WorkOrderDefaults = {
    complaint: {
        department: string;
        crews: { critical: string; standard: string; };
        due_hours: { critical: number; standard: number; };
        estimated_cost_inr: { critical: number; standard: number; };
        fallback_road_name: string;
        fallback_title_suffix: string;
    };
    prediction: {
        department: string;
        crews: { critical: string; standard: string; };
        due_hours: { critical: number; standard: number; };
        default_budget_inr: number;
    };
    emergency: {
        department: string;
        crew: string;
        due_hours: number;
        estimated_cost_inr: { critical: number; high: number; };
    };
    signal: {
        department: string;
        crews: { critical: string; standard: string; };
        due_hours: { critical: number; high: number; standard: number; };
    };
    fleet: {
        department: string;
        crews: { critical: string; standard: string; };
        due_hours: { critical: number; standard: number; };
        estimated_cost_inr: { critical: number; standard: number; };
    };
};

type FieldSyncDefaults = {
    survey: {
        health_score: number;
        condition: string;
        confidence: number;
    };
    emergency: {
        protocol_by_type: Record<NonNullable<FieldCaptureDraft['emergency_type']>, EmergencyIncident['protocol']>;
        severity_by_type: Record<NonNullable<FieldCaptureDraft['emergency_type']>, EmergencyIncident['severity']>;
        sla_minutes: Record<NonNullable<FieldCaptureDraft['emergency_type']>, number>;
        radius_m: Record<NonNullable<FieldCaptureDraft['emergency_type']>, number>;
        diversion_route: string;
        nearest_utilities: string[];
        notified_departments: string[];
        checklist_owners: {
            supervisor_review: string;
            detour_notice_release: string;
        };
    };
    notification: {
        delay_minutes: number;
        default_radius_m: number;
        emergency_radius_m: number;
        utility_audience: SmartNotification['audience'];
        emergency_detour_text: string;
    };
};

type PreDigDefaults = {
    buffer_m: number;
    gpr_trigger_gap_m: number;
    risk_thresholds: {
        critical: number;
        high: number;
        medium: number;
    };
    decision_owner: string;
    required_actions: {
        critical_conflict: string;
        gpr: string;
        field_marking: string;
        approval_flag: string;
        qr_board: string;
        standard: string;
    };
    checklist_owners: {
        conflict_review: string;
        field_marking: string;
        traffic_notice: string;
        qr_board: string;
    };
};

let appSettingsCache: Map<string, any> | null = null;

function isUuid(value?: string | null) {
    return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function selectRows<T>(table: TableName, orderBy?: string, ascending = false) {
    let query = supabase.from(table).select('*');
    if (orderBy) {
        query = query.order(orderBy, { ascending });
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as T[];
}

async function selectSingleRow<T>(table: TableName, column: string, value: string) {
    const { data, error } = await supabase.from(table).select('*').eq(column, value).maybeSingle();
    if (error) throw error;
    return (data || null) as T | null;
}

async function insertRow<T>(table: TableName, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return data as T;
}

async function updateRow<T>(table: TableName, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as T;
}

async function getAppSettingsCache() {
    if (appSettingsCache) {
        return appSettingsCache;
    }

    const rows = await selectRows<AppSettingRow>('app_settings', 'setting_key', true);
    appSettingsCache = new Map(rows.map((row) => [row.setting_key, row.value]));
    return appSettingsCache;
}

async function getAppSettingData<T>(settingKey: string) {
    const settings = await getAppSettingsCache();
    if (!settings.has(settingKey)) {
        throw new Error(`Missing required app setting: ${settingKey}`);
    }

    return settings.get(settingKey) as T;
}

export async function getGeoDefaultsData() {
    return getAppSettingData<GeoDefaults>('geo_defaults');
}

export async function getBrandingDefaultsData() {
    return getAppSettingData<BrandingDefaults>('branding_defaults');
}

export async function getCoordinationDefaultsData() {
    return getAppSettingData<CoordinationDefaults>('coordination_defaults');
}

async function getWorkOrderDefaultsData() {
    return getAppSettingData<WorkOrderDefaults>('work_order_defaults');
}

async function getFieldSyncDefaultsData() {
    return getAppSettingData<FieldSyncDefaults>('field_sync_defaults');
}

export async function getPreDigDefaultsData() {
    return getAppSettingData<PreDigDefaults>('pre_dig_defaults');
}

export async function resolveWardLabelData(ward?: string | null) {
    const { unassigned_ward_label } = await getGeoDefaultsData();
    return ward?.trim() || unassigned_ward_label;
}

async function resolveWardForRoad(roadName?: string | null, fallback?: string | null) {
    if (fallback) return fallback;
    const { unassigned_ward_label } = await getGeoDefaultsData();
    if (!roadName) return unassigned_ward_label;
    const road = await selectSingleRow<RoadSegment>('road_segments', 'name', roadName);
    return road?.ward || unassigned_ward_label;
}

function normalizeUtilityInfrastructureRecord(item: any): UtilityInfrastructure {
    return {
        ...item,
        depth_avg_m: item.depth_avg_m ?? item.depth_avg_meters ?? 0,
        depth_min_m: item.depth_min_m ?? item.depth_min_meters ?? null,
        depth_max_m: item.depth_max_m ?? item.depth_max_meters ?? null,
        last_inspection_date: item.last_inspection_date ?? item.last_inspected ?? null
    };
}

function sortByDateDesc<T>(records: T[], key: keyof T) {
    return [...records].sort((a, b) => {
        const aTime = new Date(String(a[key] || '')).getTime();
        const bTime = new Date(String(b[key] || '')).getTime();
        return bTime - aTime;
    });
}

function clearanceForRole(role: string): AccessProfile['clearance'] {
    if (role === 'admin') return 'admin';
    if (role === 'engineer' || role === 'field_supervisor') return 'elevated';
    if (role === 'inspector') return 'standard';
    return 'restricted';
}

async function syncWorksiteSubscriberCount(worksiteId: string) {
    const { count, error } = await supabase
        .from('notification_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('worksite_id', worksiteId)
        .eq('status', 'active');
    if (error) throw error;
    await updateRow<PublicWorksite>('public_worksites', worksiteId, {
        subscriber_count: count || 0
    });
}

function nextWorkOrderNumber() {
    return `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

async function findOpenWorkOrderBySource(source: WorkOrder['source'], sourceId: string) {
    const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('source', source)
        .eq('source_id', sourceId)
        .neq('status', 'completed')
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return (data || null) as WorkOrder | null;
}

async function findOpenWorkOrderByRoad(roadName: string) {
    const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('road_name', roadName)
        .neq('status', 'completed')
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return (data || null) as WorkOrder | null;
}

export async function listComplaintsData() {
    return selectRows<Complaint>('complaints', 'created_at', false);
}

export async function findComplaintByTicketData(ticketNumber: string) {
    return selectSingleRow<Complaint>('complaints', 'ticket_number', ticketNumber);
}

export async function listRoadSegmentsData() {
    return selectRows<RoadSegment>('road_segments', 'name', true);
}

export async function listDefectsData() {
    return selectRows<Defect>('defects', 'created_at', false);
}

export async function saveDefectData(defect: Defect) {
    const payload = {
        road_segment_id: defect.road_segment_id,
        defect_type: defect.defect_type,
        severity: defect.severity,
        confidence: defect.confidence ?? null,
        source: defect.source || null,
        status: defect.status,
        photo_url: defect.photo_url || null,
        location: defect.location || null,
        area_sqm: defect.area_sqm ?? null,
        description: defect.description || null,
        ai_analysis: defect.ai_analysis || null,
        repair_priority: defect.repair_priority || null,
        estimated_cost_inr: defect.estimated_cost_inr ?? null
    };

    if (isUuid(defect.id)) {
        return updateRow<Defect>('defects', defect.id, payload);
    }

    return insertRow<Defect>('defects', payload);
}

export async function listHealthPredictionsData() {
    return selectRows<HealthPrediction>('health_predictions', 'created_at', false);
}

export async function saveHealthPredictionData(prediction: HealthPrediction, options?: {
    created_by?: string | null;
    ai_provider?: string | null;
    ai_model_version?: string | null;
    raw_ai_response?: unknown;
}) {
    const payload = {
        road_segment_id: prediction.road_segment_id,
        health_score: prediction.health_score,
        predicted_failure_date: prediction.predicted_failure_date || null,
        months_remaining: prediction.months_remaining ?? null,
        risk_level: prediction.risk_level || null,
        deterioration_rate: prediction.deterioration_rate ?? null,
        risk_factors: prediction.risk_factors || [],
        recommendation: prediction.recommendation || null,
        maintenance_schedule: prediction.maintenance_schedule || [],
        budget_estimate_inr: prediction.budget_estimate_inr ?? null,
        confidence: prediction.confidence ?? null,
        ai_provider: options?.ai_provider || null,
        ai_model_version: options?.ai_model_version || null,
        raw_ai_response: options?.raw_ai_response ?? null,
        created_by: options?.created_by || null
    };

    if (isUuid(prediction.id)) {
        return updateRow<HealthPrediction>('health_predictions', prediction.id, payload);
    }

    return insertRow<HealthPrediction>('health_predictions', payload);
}

export async function listPublicWorksitesData() {
    return selectRows<PublicWorksite>('public_worksites', 'requested_start_date', false);
}

export async function findPublicWorksiteByPermitData(permitNumber: string) {
    return selectSingleRow<PublicWorksite>('public_worksites', 'permit_number', permitNumber);
}

export async function savePublicWorksiteData(worksite: PublicWorksite) {
    const payload = {
        permit_number: worksite.permit_number,
        road_name: worksite.road_name,
        ward: worksite.ward || null,
        zone: worksite.zone || null,
        location: worksite.location || null,
        purpose: worksite.purpose,
        department: worksite.department,
        contractor: worksite.contractor,
        status: worksite.status,
        progress_percent: worksite.progress_percent,
        requested_start_date: worksite.requested_start_date,
        requested_end_date: worksite.requested_end_date,
        estimated_completion: worksite.estimated_completion,
        budget_inr: worksite.budget_inr,
        traffic_impact_score: worksite.traffic_impact_score,
        delay_probability: worksite.delay_probability,
        delay_reason: worksite.delay_reason || null,
        detour: worksite.detour,
        qr_verified: worksite.qr_verified,
        blockchain_hash: worksite.blockchain_hash,
        contact_name: worksite.contact_name,
        contact_phone: worksite.contact_phone,
        subscriber_count: worksite.subscriber_count || 0,
        citizen_rating: worksite.citizen_rating || null,
        closure_type: worksite.closure_type || null,
        photo_urls: worksite.photo_urls || [],
        photo_timeline: worksite.photo_timeline || [],
        archive_ready: Boolean(worksite.archive_ready),
        updates: worksite.updates || []
    };

    if (isUuid(worksite.id)) {
        return updateRow<PublicWorksite>('public_worksites', worksite.id, payload);
    }

    return insertRow<PublicWorksite>('public_worksites', payload);
}

export async function listNotificationSubscriptionsData() {
    return selectRows<NotificationSubscription>('notification_subscriptions', 'created_at', false);
}

export async function createNotificationSubscriptionData(input: Omit<NotificationSubscription, 'id' | 'created_at' | 'status' | 'source'> & {
    source?: NotificationSubscription['source'];
    status?: NotificationSubscription['status'];
}) {
    try {
        const subscription = await insertRow<NotificationSubscription>('notification_subscriptions', {
            worksite_id: input.worksite_id,
            permit_number: input.permit_number,
            road_name: input.road_name,
            ward: input.ward,
            subscriber_name: input.subscriber_name,
            subscriber_phone: input.subscriber_phone,
            channel: input.channel,
            language: input.language,
            radius_m: input.radius_m,
            source: input.source || 'public_portal',
            status: input.status || 'active'
        });
        await syncWorksiteSubscriberCount(input.worksite_id);
        return { subscription, created: true as const };
    } catch (error: any) {
        if (error?.code === '23505') {
            return { subscription: null, created: false as const };
        }
        throw error;
    }
}

export async function listRouteAlertSubscriptionsData() {
    return selectRows<RouteAlertSubscription>('route_alert_subscriptions', 'created_at', false);
}

export async function createRouteAlertSubscriptionData(input: Omit<RouteAlertSubscription, 'id' | 'created_at' | 'status' | 'city'> & {
    city?: string;
    status?: RouteAlertSubscription['status'];
}) {
    try {
        const subscription = await insertRow<RouteAlertSubscription>('route_alert_subscriptions', {
            subscriber_name: input.subscriber_name,
            subscriber_phone: input.subscriber_phone,
            channel: input.channel,
            language: input.language,
            ward: input.ward,
            route_name: input.route_name,
            ...(input.city ? { city: input.city } : {}),
            commute_window: input.commute_window,
            source: input.source,
            status: input.status || 'active'
        });
        return { subscription, created: true as const };
    } catch (error: any) {
        if (error?.code === '23505') {
            return { subscription: null, created: false as const };
        }
        throw error;
    }
}

export async function listSmartNotificationsData() {
    return selectRows<SmartNotification>('smart_notifications', 'scheduled_for', false);
}

export async function saveSmartNotificationData(notification: SmartNotification) {
    const payload = {
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        channel: notification.channel,
        audience: notification.audience,
        status: notification.status,
        road_name: notification.road_name,
        ward: notification.ward,
        scheduled_for: notification.scheduled_for,
        radius_m: notification.radius_m,
        related_permit_number: notification.related_permit_number || null,
        detour: notification.detour || null,
        language: notification.language
    };

    if (isUuid(notification.id)) {
        return updateRow<SmartNotification>('smart_notifications', notification.id, payload);
    }

    return insertRow<SmartNotification>('smart_notifications', payload);
}

export async function listClosureProofPackagesData() {
    return selectRows<ClosureProofPackage>('closure_proof_packages', 'updated_at', false);
}

export async function saveClosureProofPackageData(record: ClosureProofPackage) {
    const payload = {
        worksite_id: record.worksite_id || null,
        permit_number: record.permit_number,
        work_order_id: record.work_order_id || null,
        road_name: record.road_name,
        ward: record.ward,
        contractor: record.contractor,
        status: record.status,
        before_count: record.before_count,
        during_count: record.during_count,
        after_count: record.after_count,
        geo_tag_coverage_percent: record.geo_tag_coverage_percent,
        utility_depth_verified: record.utility_depth_verified,
        surface_reinstatement_score: record.surface_reinstatement_score,
        payout_completion_percent: record.payout_completion_percent,
        engineer_sign_off: record.engineer_sign_off || null,
        payment_hold_reason: record.payment_hold_reason || null,
        proof_notes: record.proof_notes || null
    };

    if (isUuid(record.id)) {
        return updateRow<ClosureProofPackage>('closure_proof_packages', record.id, payload);
    }

    return insertRow<ClosureProofPackage>('closure_proof_packages', payload);
}

export async function listPaymentMilestonesData() {
    return selectRows<PaymentMilestone>('payment_milestones', 'due_on', true);
}

export async function savePaymentMilestoneData(record: PaymentMilestone) {
    const payload = {
        closure_proof_id: record.closure_proof_id,
        permit_number: record.permit_number,
        label: record.label,
        amount_inr: record.amount_inr,
        due_on: record.due_on,
        status: record.status,
        released_at: record.released_at || null,
        note: record.note || null
    };

    if (isUuid(record.id)) {
        return updateRow<PaymentMilestone>('payment_milestones', record.id, payload);
    }

    return insertRow<PaymentMilestone>('payment_milestones', payload);
}

export async function listCitizenCompletionFeedbackData() {
    return selectRows<CitizenCompletionFeedback>('citizen_completion_feedback', 'submitted_at', false);
}

export async function createCitizenCompletionFeedbackData(input: Omit<CitizenCompletionFeedback, 'id' | 'submitted_at'>) {
    return insertRow<CitizenCompletionFeedback>('citizen_completion_feedback', {
        permit_number: input.permit_number,
        road_name: input.road_name,
        ward: input.ward,
        citizen_name: input.citizen_name,
        rating: input.rating,
        feedback: input.feedback,
        photo_url: input.photo_url || null
    });
}

export async function listPermitApprovalsData() {
    return selectRows<PermitApprovalRecord>('permit_approval_records', 'updated_at', false);
}

export async function savePermitApprovalRecordData(record: PermitApprovalRecord) {
    const payload = {
        permit_id: record.permit_id || null,
        permit_number: record.permit_number,
        road_name: record.road_name,
        purpose: record.purpose,
        emergency: record.emergency,
        road_protection_rule: record.road_protection_rule,
        status: record.status,
        required_signatures: record.required_signatures,
        collected_signatures: record.collected_signatures,
        blockchain_hash: record.blockchain_hash,
        qr_code_url: record.qr_code_url,
        public_verification_url: record.public_verification_url,
        compliance_flags: record.compliance_flags,
        post_audit_due: record.post_audit_due || null,
        closure_state: record.closure_state,
        closure_evidence: record.closure_evidence,
        steps: record.steps
    };

    if (isUuid(record.id)) {
        return updateRow<PermitApprovalRecord>('permit_approval_records', record.id, payload);
    }

    return insertRow<PermitApprovalRecord>('permit_approval_records', payload);
}

function riskLevelFromScore(score: number, thresholds: PreDigDefaults['risk_thresholds']): PreDigClearanceRecord['risk_level'] {
    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
}

function mergeChecklistItems(
    derived: PreDigChecklistItem[],
    saved: PreDigChecklistItem[] = []
) {
    return derived.map((item) => {
        const savedItem = saved.find((candidate) => candidate.label === item.label) || null;
        return savedItem
            ? { ...item, done: savedItem.done, note: savedItem.note || item.note || null }
            : item;
    });
}

export async function listPreDigClearancesData() {
    const [
        permits,
        approvals,
        worksites,
        roads,
        utilities,
        conflicts,
        fieldDrafts,
        twinRows,
        savedRows,
        defaults,
        geoDefaults
    ] = await Promise.all([
        listExcavationPermitsData(),
        listPermitApprovalsData(),
        listPublicWorksitesData(),
        listRoadSegmentsData(),
        listUtilityInfrastructureData(),
        listUtilityConflictZonesData(),
        listFieldCaptureDraftsData(),
        listRoadTwinSnapshotsData(),
        selectRows<PreDigClearanceRecord>('pre_dig_clearances', 'updated_at', false),
        getPreDigDefaultsData(),
        getGeoDefaultsData()
    ]);

    const relevantPermits = permits.filter((permit) => permit.status !== 'completed' && permit.status !== 'rejected');

    const clearances = relevantPermits.map((permit) => {
        const roadName = permit.road_name || permit.location_description || permit.permit_number;
        const road = roads.find((item) => item.id === permit.road_segment_id || item.name === roadName) || null;
        const worksite = worksites.find((item) => item.permit_number === permit.permit_number) || null;
        const approval = approvals.find((item) => item.permit_number === permit.permit_number) || null;
        const roadUtilities = utilities.filter((item) => item.road_name === roadName && item.status !== 'abandoned');
        const utilityIds = new Set(roadUtilities.map((item) => item.id));
        const relatedConflicts = conflicts.filter((item) =>
            Boolean(item.infra_id_1 && utilityIds.has(item.infra_id_1))
            || Boolean(item.infra_id_2 && utilityIds.has(item.infra_id_2))
        );
        const conflictCount = relatedConflicts.length;
        const criticalConflictCount = relatedConflicts.filter((item) => item.risk_level === 'critical').length;
        const nearestUtilityDepth = roadUtilities.length
            ? roadUtilities.reduce((min, item) => Math.min(min, item.depth_avg_m || Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY)
            : null;
        const safeMargin = nearestUtilityDepth !== null && Number.isFinite(nearestUtilityDepth)
            ? Number((nearestUtilityDepth - permit.depth_m).toFixed(2))
            : null;
        const utilityTypes = Array.from(new Set(roadUtilities.map((item) => item.utility_type)));
        const latestDraft = [...fieldDrafts]
            .filter((draft) =>
                draft.workflow === 'utility_marking'
                && (draft.permit_number === permit.permit_number || draft.road_name === roadName)
            )
            .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())[0] || null;
        const latestTwin = road
            ? [...twinRows]
                .filter((row) => row.road_segment_id === road.id)
                .sort((a, b) => b.snapshot_year - a.snapshot_year)[0] || null
            : null;
        const approvalFlagged = Boolean(approval?.status === 'flagged' || approval?.compliance_flags?.length);
        const qrBoardReady = Boolean(approval?.qr_code_url || worksite?.permit_number);
        const blockchainVerified = Boolean(approval?.blockchain_hash || worksite?.blockchain_hash);
        const fieldMarkingStatus = latestDraft?.status || 'not_started';
        const gprDepthTrigger = nearestUtilityDepth !== null && Number.isFinite(nearestUtilityDepth)
            ? permit.depth_m >= nearestUtilityDepth - defaults.gpr_trigger_gap_m
            : false;

        let riskScore = 0;
        riskScore += criticalConflictCount * 32;
        riskScore += relatedConflicts.filter((item) => item.risk_level === 'high').length * 18;
        riskScore += relatedConflicts.filter((item) => item.risk_level === 'medium').length * 10;
        riskScore += relatedConflicts.filter((item) => item.risk_level === 'low').length * 4;
        if (gprDepthTrigger) riskScore += 18;
        if (fieldMarkingStatus !== 'synced') riskScore += 12;
        if (approvalFlagged) riskScore += 14;
        if (permit.urgency === 'emergency') riskScore += 8;
        if (!qrBoardReady) riskScore += 5;
        if ((road?.health_score || 100) < 45) riskScore += 7;
        riskScore = Math.min(100, riskScore);

        const riskLevel = riskLevelFromScore(riskScore, defaults.risk_thresholds);
        const gprRequired = conflictCount > 0 && (criticalConflictCount > 0 || gprDepthTrigger);

        const requiredActions = [
            criticalConflictCount > 0 ? defaults.required_actions.critical_conflict : null,
            gprRequired ? defaults.required_actions.gpr : null,
            fieldMarkingStatus !== 'synced' ? defaults.required_actions.field_marking : null,
            approvalFlagged ? defaults.required_actions.approval_flag : null,
            !qrBoardReady ? defaults.required_actions.qr_board : null
        ].filter(Boolean) as string[];

        if (requiredActions.length === 0) {
            requiredActions.push(defaults.required_actions.standard);
        }

        const derivedChecklist: PreDigChecklistItem[] = [
            {
                id: `check-conflict-${permit.id}`,
                label: 'Underground conflict review',
                owner: defaults.checklist_owners.conflict_review,
                done: conflictCount === 0 || riskLevel === 'low',
                note: conflictCount > 0 ? `${conflictCount} mapped utility conflict zone(s) need review.` : 'No mapped conflicts on this corridor.'
            },
            {
                id: `check-field-${permit.id}`,
                label: 'Field utility marking synced',
                owner: defaults.checklist_owners.field_marking,
                done: fieldMarkingStatus === 'synced',
                note: latestDraft?.summary || 'No utility-marking capture synced yet.'
            },
            {
                id: `check-traffic-${permit.id}`,
                label: 'Traffic and barricading notice prepared',
                owner: defaults.checklist_owners.traffic_notice,
                done: Boolean(worksite?.detour),
                note: worksite?.detour || 'Traffic notice still needs corridor confirmation.'
            },
            {
                id: `check-qr-${permit.id}`,
                label: 'QR board and public verification link ready',
                owner: defaults.checklist_owners.qr_board,
                done: qrBoardReady && blockchainVerified,
                note: qrBoardReady ? 'QR/public verification record is present.' : 'QR board still pending publication.'
            }
        ];

        const derivedStatus: PreDigClearanceRecord['status'] = criticalConflictCount > 0 && fieldMarkingStatus !== 'synced'
            ? 'blocked'
            : riskScore >= defaults.risk_thresholds.critical
                ? 'blocked'
                : gprRequired
                    ? 'gpr_required'
                    : riskScore >= defaults.risk_thresholds.medium || fieldMarkingStatus !== 'synced' || approvalFlagged
                        ? 'restricted'
                        : 'cleared';

        const override = savedRows.find((item) => item.permit_number === permit.permit_number) || null;

        return {
            id: override?.id || `clearance-${permit.permit_number.toLowerCase()}`,
            permit_id: permit.id,
            permit_number: permit.permit_number,
            road_name: roadName,
            ward: road?.ward || worksite?.ward || geoDefaults.unassigned_ward_label,
            organization: permit.organization,
            status: override?.status || derivedStatus,
            risk_level: override?.risk_level || riskLevel,
            risk_score: riskScore,
            requested_depth_m: permit.depth_m,
            nearest_utility_depth_m: nearestUtilityDepth && Number.isFinite(nearestUtilityDepth) ? Number(nearestUtilityDepth.toFixed(2)) : null,
            safe_clearance_margin_m: safeMargin,
            conflict_count: conflictCount,
            critical_conflict_count: criticalConflictCount,
            utility_types: utilityTypes,
            required_actions: override?.required_actions?.length ? override.required_actions : requiredActions,
            checklist: mergeChecklistItems(derivedChecklist, override?.checklist || []),
            field_marking_status: fieldMarkingStatus,
            latest_field_note: latestDraft?.summary || latestDraft?.voice_note_text || null,
            ar_overlay_status: utilityTypes.length >= 2 ? 'ready' : utilityTypes.length === 1 ? 'limited' : 'not_ready',
            gpr_required: gprRequired,
            blockchain_verified: blockchainVerified,
            qr_board_ready: qrBoardReady,
            twin_snapshot_year: latestTwin?.snapshot_year || null,
            twin_note: latestTwin?.note || null,
            decision_owner: override?.decision_owner || defaults.decision_owner,
            decision_note: override?.decision_note || (
                derivedStatus === 'blocked'
                    ? 'Permit should stay blocked until critical overlap and field marking issues are resolved.'
                    : derivedStatus === 'gpr_required'
                        ? 'Permit can move only after GPR or physical verification confirms the safe dig envelope.'
                        : derivedStatus === 'restricted'
                            ? 'Permit may proceed with hand-dig supervision, QR board deployment, and field oversight.'
                            : 'Permit is ready for standard supervised excavation.'
            ),
            approved_at: override?.approved_at || null,
            updated_at: override?.updated_at || new Date().toISOString()
        } as PreDigClearanceRecord;
    });

    const statusRank: Record<PreDigClearanceRecord['status'], number> = {
        blocked: 0,
        gpr_required: 1,
        restricted: 2,
        cleared: 3
    };

    return clearances.sort((a, b) =>
        statusRank[a.status] - statusRank[b.status]
        || b.risk_score - a.risk_score
        || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}

export async function savePreDigClearanceData(record: PreDigClearanceRecord) {
    const payload = {
        permit_id: record.permit_id || null,
        permit_number: record.permit_number,
        road_name: record.road_name,
        ward: record.ward,
        organization: record.organization,
        status: record.status,
        risk_level: record.risk_level,
        risk_score: record.risk_score,
        requested_depth_m: record.requested_depth_m,
        nearest_utility_depth_m: record.nearest_utility_depth_m ?? null,
        safe_clearance_margin_m: record.safe_clearance_margin_m ?? null,
        conflict_count: record.conflict_count,
        critical_conflict_count: record.critical_conflict_count,
        utility_types: record.utility_types,
        required_actions: record.required_actions,
        checklist: record.checklist,
        field_marking_status: record.field_marking_status,
        latest_field_note: record.latest_field_note || null,
        ar_overlay_status: record.ar_overlay_status,
        gpr_required: record.gpr_required,
        blockchain_verified: record.blockchain_verified,
        qr_board_ready: record.qr_board_ready,
        twin_snapshot_year: record.twin_snapshot_year ?? null,
        twin_note: record.twin_note || null,
        decision_owner: record.decision_owner,
        decision_note: record.decision_note || null,
        approved_at: record.approved_at || null
    };

    if (isUuid(record.id)) {
        return updateRow<PreDigClearanceRecord>('pre_dig_clearances', record.id, payload);
    }

    const existing = await selectSingleRow<PreDigClearanceRecord>('pre_dig_clearances', 'permit_number', record.permit_number);
    if (existing?.id) {
        return updateRow<PreDigClearanceRecord>('pre_dig_clearances', existing.id, payload);
    }

    return insertRow<PreDigClearanceRecord>('pre_dig_clearances', payload);
}

export async function listPermitActionAuditLogsData() {
    return selectRows<PermitActionAuditLog>('permit_action_audit_logs', 'created_at', false);
}

export async function listPublicVerificationEventsData() {
    return selectRows<PublicVerificationEvent>('public_verification_events', 'created_at', false);
}

export async function recordPublicVerificationEventData(input: {
    permit_number: string;
    road_name: string;
    ward: string;
    source: PublicVerificationEvent['source'];
    outcome?: PublicVerificationEvent['outcome'];
}) {
    return insertRow<PublicVerificationEvent>('public_verification_events', {
        permit_number: input.permit_number,
        road_name: input.road_name,
        ward: input.ward,
        source: input.source,
        outcome: input.outcome || 'verified',
        viewer_ref: `anon-${input.ward.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user'}-${String(Date.now()).slice(-4)}`
    });
}

export async function listTrafficAdvisoriesData() {
    return selectRows<TrafficAdvisory>('traffic_advisories', 'updated_at', false);
}

export async function saveTrafficAdvisoryData(advisory: TrafficAdvisory) {
    const payload = {
        permit_number: advisory.permit_number,
        road_name: advisory.road_name,
        ward: advisory.ward,
        affected_routes: advisory.affected_routes,
        estimated_delay_minutes: advisory.estimated_delay_minutes,
        disruption_score: advisory.disruption_score,
        closure_window: advisory.closure_window,
        detour: advisory.detour,
        police_notified: advisory.police_notified,
        fleet_notified: advisory.fleet_notified,
        citizen_notice_status: advisory.citizen_notice_status,
        event_watch: advisory.event_watch,
        recommended_window: advisory.recommended_window,
        status: advisory.status
    };

    if (isUuid(advisory.id)) {
        return updateRow<TrafficAdvisory>('traffic_advisories', advisory.id, payload);
    }

    return insertRow<TrafficAdvisory>('traffic_advisories', payload);
}

export async function listDelayRiskAssessmentsData() {
    return selectRows<DelayRiskAssessment>('delay_risk_assessments', 'last_reviewed_at', false);
}

export async function saveDelayRiskAssessmentData(assessment: DelayRiskAssessment) {
    const payload = {
        permit_number: assessment.permit_number,
        road_name: assessment.road_name,
        ward: assessment.ward,
        contractor: assessment.contractor,
        delay_probability: assessment.delay_probability,
        suggested_buffer_days: assessment.suggested_buffer_days,
        risk_factors: assessment.risk_factors,
        required_sign_off: assessment.required_sign_off,
        escalation_status: assessment.escalation_status,
        public_completion_date: assessment.public_completion_date,
        last_reviewed_at: assessment.last_reviewed_at
    };

    if (isUuid(assessment.id)) {
        return updateRow<DelayRiskAssessment>('delay_risk_assessments', assessment.id, payload);
    }

    return insertRow<DelayRiskAssessment>('delay_risk_assessments', payload);
}

export async function listEmergencyIncidentsData() {
    return selectRows<EmergencyIncident>('emergency_incidents', 'triggered_at', false);
}

export async function saveEmergencyIncidentData(incident: EmergencyIncident) {
    const payload = {
        permit_number: incident.permit_number,
        road_name: incident.road_name,
        ward: incident.ward,
        incident_type: incident.incident_type,
        protocol: incident.protocol,
        severity: incident.severity,
        status: incident.status,
        summary: incident.summary,
        triggered_at: incident.triggered_at,
        response_sla_minutes: incident.response_sla_minutes,
        affected_radius_m: incident.affected_radius_m,
        diversion_route: incident.diversion_route,
        field_language: incident.field_language,
        nearest_utilities: incident.nearest_utilities,
        notified_departments: incident.notified_departments,
        permit_approval_id: incident.permit_approval_id || null,
        post_audit_due: incident.post_audit_due || null,
        checklist: incident.checklist
    };

    if (isUuid(incident.id)) {
        return updateRow<EmergencyIncident>('emergency_incidents', incident.id, payload);
    }

    return insertRow<EmergencyIncident>('emergency_incidents', payload);
}

export async function listWorkOrdersData() {
    return selectRows<WorkOrder>('work_orders', 'created_at', false);
}

export async function saveWorkOrderData(order: WorkOrder) {
    const payload = {
        order_number: order.order_number,
        title: order.title,
        road_name: order.road_name,
        ward: order.ward,
        source: order.source,
        source_id: order.source_id,
        priority: order.priority,
        status: order.status,
        assigned_department: order.assigned_department,
        assigned_crew: order.assigned_crew,
        due_by: order.due_by,
        estimated_cost_inr: order.estimated_cost_inr,
        bilingual_summary: order.bilingual_summary,
        permit_number: order.permit_number || null,
        completed_at: order.completed_at || null
    };

    if (isUuid(order.id)) {
        return updateRow<WorkOrder>('work_orders', order.id, payload);
    }

    return insertRow<WorkOrder>('work_orders', payload);
}

export async function createWorkOrderFromComplaintData(complaint: Complaint) {
    const existing = await findOpenWorkOrderBySource('complaint', complaint.id);
    if (existing) {
        return { order: existing, created: false as const };
    }

    const defaults = await getWorkOrderDefaultsData();
    const complaintDefaults = defaults.complaint;

    const priority: WorkOrder['priority'] = complaint.priority || ((complaint.urgency_score || 0) >= 5
        ? 'critical'
        : (complaint.urgency_score || 0) >= 4
            ? 'high'
            : 'medium');
    const dueHours = priority === 'critical'
        ? complaintDefaults.due_hours.critical
        : complaintDefaults.due_hours.standard;
    const estimatedCost = priority === 'critical'
        ? complaintDefaults.estimated_cost_inr.critical
        : complaintDefaults.estimated_cost_inr.standard;
    const roadName = complaint.road_name || complaintDefaults.fallback_road_name;

    const order = await insertRow<WorkOrder>('work_orders', {
        order_number: nextWorkOrderNumber(),
        title: `${roadName} ${complaintDefaults.fallback_title_suffix}`,
        road_name: roadName,
        ward: await resolveWardForRoad(complaint.road_name),
        source: 'complaint',
        source_id: complaint.id,
        priority,
        status: 'queued',
        assigned_department: complaintDefaults.department,
        assigned_crew: priority === 'critical' ? complaintDefaults.crews.critical : complaintDefaults.crews.standard,
        due_by: new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString(),
        estimated_cost_inr: estimatedCost,
        bilingual_summary: {
            en: complaint.complaint_text,
            hi: `शिकायत आधारित कार्य आदेश: ${complaint.complaint_text}`
        },
        permit_number: null
    });

    return { order, created: true as const };
}

export async function createWorkOrderFromPredictionData(road: RoadSegment, prediction: HealthPrediction) {
    const existing = await findOpenWorkOrderBySource('prediction', prediction.id);
    if (existing) {
        return { order: existing, created: false as const };
    }

    const defaults = await getWorkOrderDefaultsData();
    const predictionDefaults = defaults.prediction;

    const priority: WorkOrder['priority'] = prediction.health_score < 20
        ? 'critical'
        : prediction.health_score < 40
            ? 'high'
            : 'medium';
    const dueHours = priority === 'critical'
        ? predictionDefaults.due_hours.critical
        : predictionDefaults.due_hours.standard;

    const order = await insertRow<WorkOrder>('work_orders', {
        order_number: nextWorkOrderNumber(),
        title: `${road.name} preventive repair ticket`,
        road_name: road.name,
        ward: await resolveWardForRoad(road.name, road.ward),
        source: 'prediction',
        source_id: prediction.id,
        priority,
        status: 'queued',
        assigned_department: predictionDefaults.department,
        assigned_crew: priority === 'critical' ? predictionDefaults.crews.critical : predictionDefaults.crews.standard,
        due_by: new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString(),
        estimated_cost_inr: prediction.budget_estimate_inr || predictionDefaults.default_budget_inr,
        bilingual_summary: {
            en: prediction.recommendation,
            hi: `एआई पूर्वानुमान के आधार पर कार्य आदेश: ${prediction.recommendation}`
        },
        permit_number: null
    });

    return { order, created: true as const };
}

export async function createWorkOrderFromEmergencyData(incident: EmergencyIncident) {
    const existing = await findOpenWorkOrderBySource('emergency', incident.id);
    if (existing) {
        return { order: existing, created: false as const };
    }

    const defaults = await getWorkOrderDefaultsData();
    const emergencyDefaults = defaults.emergency;

    const order = await insertRow<WorkOrder>('work_orders', {
        order_number: nextWorkOrderNumber(),
        title: `${incident.road_name} emergency restoration`,
        road_name: incident.road_name,
        ward: incident.ward,
        source: 'emergency',
        source_id: incident.id,
        priority: incident.severity === 'critical' ? 'critical' : 'high',
        status: 'queued',
        assigned_department: emergencyDefaults.department,
        assigned_crew: emergencyDefaults.crew,
        due_by: new Date(Date.now() + emergencyDefaults.due_hours * 60 * 60 * 1000).toISOString(),
        estimated_cost_inr: incident.severity === 'critical'
            ? emergencyDefaults.estimated_cost_inr.critical
            : emergencyDefaults.estimated_cost_inr.high,
        bilingual_summary: {
            en: incident.summary,
            hi: `आपातकालीन बहाली कार्य आदेश: ${incident.summary}`
        },
        permit_number: incident.permit_number
    });

    return { order, created: true as const };
}

export async function listRoadSurveysData() {
    return selectRows<RoadImageSurvey>('road_image_surveys', 'created_at', false);
}

export async function saveRoadSurveyData(survey: RoadImageSurvey) {
    const payload = {
        title: survey.title,
        road_segment_id: survey.road_segment_id || null,
        road_name: survey.road_name || null,
        lat_center: survey.lat_center,
        lng_center: survey.lng_center,
        photo_url: survey.photo_url || null,
        ai_health_score: survey.ai_health_score,
        ai_condition: survey.ai_condition,
        ai_defects: survey.ai_defects || [],
        ai_confidence: survey.ai_confidence
    };

    if (isUuid(survey.id)) {
        return updateRow<RoadImageSurvey>('road_image_surveys', survey.id, payload);
    }

    return insertRow<RoadImageSurvey>('road_image_surveys', payload);
}

export async function listFieldCaptureDraftsData() {
    return selectRows<FieldCaptureDraft>('field_capture_drafts', 'captured_at', false);
}

export async function saveFieldCaptureDraftData(draft: FieldCaptureDraft) {
    const payload = {
        workflow: draft.workflow,
        title: draft.title,
        road_name: draft.road_name,
        ward: draft.ward,
        operator_name: draft.operator_name,
        language: draft.language,
        voice_note_text: draft.voice_note_text,
        summary: draft.summary,
        photo_count: draft.photo_count,
        permit_number: draft.permit_number || null,
        emergency_type: draft.emergency_type || null,
        status: draft.status,
        lat: draft.lat,
        lng: draft.lng,
        captured_at: draft.captured_at,
        synced_at: draft.synced_at || null
    };

    if (isUuid(draft.id)) {
        return updateRow<FieldCaptureDraft>('field_capture_drafts', draft.id, payload);
    }

    return insertRow<FieldCaptureDraft>('field_capture_drafts', payload);
}

export async function createFieldCaptureDraftData(input: {
    workflow: FieldCaptureDraft['workflow'];
    road_name: string;
    ward: string;
    operator_name: string;
    language: FieldCaptureDraft['language'];
    voice_note_text: string;
    summary: string;
    photo_count: number;
    lat: number;
    lng: number;
    permit_number?: string | null;
    emergency_type?: FieldCaptureDraft['emergency_type'];
}) {
    const workflowLabels = {
        road_survey: 'Road Survey',
        emergency: 'Emergency Capture',
        utility_marking: 'Utility Marking'
    } as const;

    return insertRow<FieldCaptureDraft>('field_capture_drafts', {
        workflow: input.workflow,
        title: `${workflowLabels[input.workflow]} · ${input.road_name}`,
        road_name: input.road_name,
        ward: input.ward,
        operator_name: input.operator_name,
        language: input.language,
        voice_note_text: input.voice_note_text,
        summary: input.summary,
        photo_count: Math.max(1, input.photo_count),
        permit_number: input.permit_number || null,
        emergency_type: input.emergency_type || null,
        status: input.workflow === 'emergency' ? 'ready_to_sync' : 'queued_offline',
        lat: input.lat,
        lng: input.lng
    });
}

export async function listFleetCameraEventsData() {
    return selectRows<FleetCameraEvent>('fleet_camera_events', 'captured_at', false);
}

export async function saveFleetCameraEventData(event: FleetCameraEvent) {
    const payload = {
        partner: event.partner,
        route_name: event.route_name,
        camera_id: event.camera_id,
        event_type: event.event_type,
        severity: event.severity,
        confidence: event.confidence,
        captured_at: event.captured_at,
        road_name: event.road_name,
        status: event.status
    };

    if (isUuid(event.id)) {
        return updateRow<FleetCameraEvent>('fleet_camera_events', event.id, payload);
    }

    return insertRow<FleetCameraEvent>('fleet_camera_events', payload);
}

export async function listSignalFusionCasesData() {
    const { unassigned_ward_label } = await getGeoDefaultsData();
    const [
        complaints,
        fleetEvents,
        surveys,
        fieldDrafts,
        worksites,
        roads,
        workOrders,
        overrides
    ] = await Promise.all([
        listComplaintsData(),
        listFleetCameraEventsData(),
        listRoadSurveysData(),
        listFieldCaptureDraftsData(),
        listPublicWorksitesData(),
        listRoadSegmentsData(),
        listWorkOrdersData(),
        selectRows<SignalFusionCase>('signal_fusion_cases', 'updated_at', false)
    ]);

    const activeFleet = fleetEvents.filter((item) => item.status !== 'resolved');
    const threshold = Date.now() - 48 * 60 * 60 * 1000;

    const roadNames = new Set<string>([
        ...complaints.map((item) => item.road_name || 'Citizen-submitted location'),
        ...activeFleet.map((item) => item.road_name),
        ...surveys.map((item) => item.road_name || 'Survey corridor'),
        ...fieldDrafts.map((item) => item.road_name)
    ]);

    const cases = Array.from(roadNames).map((roadName) => {
        const caseComplaints = complaints.filter((item) => (item.road_name || 'Citizen-submitted location') === roadName);
        const recentComplaints = caseComplaints.filter((item) => new Date(item.created_at).getTime() >= threshold);
        const caseFleet = activeFleet.filter((item) => item.road_name === roadName);
        const caseSurveys = surveys.filter((item) => (item.road_name || 'Survey corridor') === roadName);
        const caseDrafts = fieldDrafts.filter((item) => item.road_name === roadName);
        const linkedOrder = workOrders.find((item) => item.road_name === roadName && item.status !== 'completed') || null;
        const override = overrides.find((item) => item.road_name === roadName) || null;
        const ward = worksites.find((item) => item.road_name === roadName)?.ward
            || roads.find((item) => item.name === roadName)?.ward
            || caseDrafts[0]?.ward
            || unassigned_ward_label;

        const focusCounts = new Map<string, number>();
        caseComplaints.forEach((item) => focusCounts.set(item.defect_type || 'surface_damage', (focusCounts.get(item.defect_type || 'surface_damage') || 0) + 1));
        caseFleet.forEach((item) => focusCounts.set(item.event_type, (focusCounts.get(item.event_type) || 0) + 1));
        const defectFocus = Array.from(focusCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'surface_damage';

        const fleetConfidence = caseFleet.length
            ? caseFleet.reduce((sum, item) => sum + item.confidence, 0) / caseFleet.length
            : 0;
        const surveyConfidence = caseSurveys.length
            ? caseSurveys.reduce((sum, item) => sum + item.ai_confidence, 0) / caseSurveys.length
            : 0;
        const sourceMix = [
            caseComplaints.length > 0 ? 'complaint' : null,
            caseFleet.length > 0 ? 'fleet' : null,
            caseSurveys.length > 0 ? 'survey' : null,
            caseDrafts.length > 0 ? 'field' : null
        ].filter(Boolean) as SignalFusionCase['source_mix'];
        const autoEscalated = recentComplaints.length >= 3;
        const severity: SignalFusionCase['severity'] = autoEscalated || caseFleet.some((item) => item.severity === 'critical')
            ? 'critical'
            : recentComplaints.length >= 2 || caseFleet.some((item) => item.severity === 'high') || caseSurveys.some((item) => item.ai_health_score < 50)
                ? 'high'
                : sourceMix.length >= 2
                    ? 'medium'
                    : 'low';
        const confidenceScore = Math.max(0.24, Math.min(
            0.22 +
            Math.min(recentComplaints.length * 0.14, 0.42) +
            Math.min(caseComplaints.length * 0.03, 0.12) +
            fleetConfidence * 0.24 +
            surveyConfidence * 0.12 +
            Math.min(caseDrafts.length * 0.1, 0.18) +
            sourceMix.length * 0.05,
            0.98
        ));

        const firstSeenAt = [caseComplaints[0]?.created_at, caseFleet[0]?.captured_at, caseSurveys[0]?.created_at, caseDrafts[0]?.captured_at]
            .filter(Boolean)
            .sort()[0] || new Date().toISOString();
        const lastSeenAt = [caseComplaints.slice(-1)[0]?.created_at, caseFleet.slice(-1)[0]?.captured_at, caseSurveys.slice(-1)[0]?.created_at, caseDrafts.slice(-1)[0]?.captured_at]
            .filter(Boolean)
            .sort()
            .slice(-1)[0] || firstSeenAt;

        const derivedCase: SignalFusionCase = {
            id: override?.id || `fusion-${roadName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            road_name: roadName,
            ward,
            defect_focus: defectFocus,
            citizen_reports_48h: recentComplaints.length,
            total_citizen_reports: caseComplaints.length,
            fleet_hits: caseFleet.length,
            survey_hits: caseSurveys.length,
            field_hits: caseDrafts.length,
            severity,
            confidence_score: Number(confidenceScore.toFixed(2)),
            auto_escalated: autoEscalated,
            validation_status: linkedOrder
                ? 'work_ordered'
                : autoEscalated || (confidenceScore >= 0.7 && sourceMix.length >= 2)
                    ? 'auto_escalated'
                    : 'monitoring',
            linked_work_order_id: linkedOrder?.id || null,
            source_mix: sourceMix,
            summary: autoEscalated
                ? `${recentComplaints.length} citizen reports landed within 48 hours on ${roadName}, triggering automatic escalation.`
                : `${sourceMix.length} signal source${sourceMix.length === 1 ? '' : 's'} are pointing to ${defectFocus.replace(/_/g, ' ')} risk on ${roadName}.`,
            recommended_action: linkedOrder
                ? 'Track linked work order and field validation.'
                : autoEscalated
                    ? 'Escalate to engineer review and generate a field or repair order immediately.'
                    : confidenceScore >= 0.72
                        ? 'Validate with field evidence and pre-stage a work order.'
                        : 'Continue monitoring and wait for another corroborating signal.',
            engineer_note: null,
            first_seen_at: firstSeenAt,
            last_seen_at: lastSeenAt
        };

        return override ? {
            ...derivedCase,
            validation_status: override.linked_work_order_id || derivedCase.linked_work_order_id
                ? 'work_ordered'
                : override.validation_status,
            linked_work_order_id: override.linked_work_order_id || derivedCase.linked_work_order_id,
            engineer_note: override.engineer_note || null
        } : derivedCase;
    });

    return cases.sort((a, b) => {
        const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityRank[a.severity] - priorityRank[b.severity]
            || b.confidence_score - a.confidence_score
            || new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });
}

export async function saveSignalFusionCaseData(record: SignalFusionCase) {
    const payload = {
        road_name: record.road_name,
        ward: record.ward,
        defect_focus: record.defect_focus,
        citizen_reports_48h: record.citizen_reports_48h,
        total_citizen_reports: record.total_citizen_reports,
        fleet_hits: record.fleet_hits,
        survey_hits: record.survey_hits,
        field_hits: record.field_hits,
        severity: record.severity,
        confidence_score: record.confidence_score,
        auto_escalated: record.auto_escalated,
        validation_status: record.validation_status,
        linked_work_order_id: record.linked_work_order_id || null,
        source_mix: record.source_mix,
        summary: record.summary,
        recommended_action: record.recommended_action,
        engineer_note: record.engineer_note || null,
        first_seen_at: record.first_seen_at,
        last_seen_at: record.last_seen_at
    };

    if (isUuid(record.id)) {
        return updateRow<SignalFusionCase>('signal_fusion_cases', record.id, payload);
    }

    const existing = await selectSingleRow<SignalFusionCase>('signal_fusion_cases', 'road_name', record.road_name);
    if (existing?.id) {
        return updateRow<SignalFusionCase>('signal_fusion_cases', existing.id, payload);
    }

    return insertRow<SignalFusionCase>('signal_fusion_cases', payload);
}

export async function createWorkOrderFromSignalFusionData(signalCase: SignalFusionCase) {
    const existing = await findOpenWorkOrderByRoad(signalCase.road_name);
    if (existing) {
        await saveSignalFusionCaseData({
            ...signalCase,
            validation_status: 'work_ordered',
            linked_work_order_id: existing.id,
            engineer_note: signalCase.engineer_note || 'Linked to an existing open work order on the same corridor.'
        });
        return { order: existing, created: false as const };
    }

    const defaults = await getWorkOrderDefaultsData();
    const signalDefaults = defaults.signal;
    const dueHours = signalCase.severity === 'critical'
        ? signalDefaults.due_hours.critical
        : signalCase.severity === 'high'
            ? signalDefaults.due_hours.high
            : signalDefaults.due_hours.standard;

    const order = await insertRow<WorkOrder>('work_orders', {
        order_number: nextWorkOrderNumber(),
        title: `${signalCase.road_name} fused signal response`,
        road_name: signalCase.road_name,
        ward: signalCase.ward,
        source: 'signal',
        source_id: signalCase.id,
        priority: signalCase.severity,
        status: 'queued',
        assigned_department: signalDefaults.department,
        assigned_crew: signalCase.severity === 'critical' ? signalDefaults.crews.critical : signalDefaults.crews.standard,
        due_by: new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString(),
        estimated_cost_inr: 70000 + signalCase.fleet_hits * 25000 + signalCase.survey_hits * 15000 + signalCase.field_hits * 12000 + signalCase.citizen_reports_48h * 10000,
        bilingual_summary: {
            en: `${signalCase.summary} Recommended action: ${signalCase.recommended_action}`,
            hi: `${signalCase.road_name} पर कई संकेत एक ही समस्या की ओर इशारा कर रहे हैं। सुझाया गया कदम: ${signalCase.recommended_action}`
        },
        permit_number: null
    });

    await saveSignalFusionCaseData({
        ...signalCase,
        validation_status: 'work_ordered',
        linked_work_order_id: order.id,
        engineer_note: signalCase.engineer_note || 'Auto-converted into a repair ticket from fused multi-source evidence.'
    });

    return { order, created: true as const };
}

export async function createWorkOrderFromFleetEventData(event: FleetCameraEvent) {
    const existing = await findOpenWorkOrderBySource('fleet', event.id);
    if (existing) {
        return { order: existing, created: false as const };
    }

    const defaults = await getWorkOrderDefaultsData();
    const fleetDefaults = defaults.fleet;

    const priority: WorkOrder['priority'] = event.severity === 'critical'
        ? 'critical'
        : event.severity === 'high'
            ? 'high'
            : 'medium';
    const ward = await resolveWardForRoad(event.road_name);
    const dueHours = priority === 'critical'
        ? fleetDefaults.due_hours.critical
        : fleetDefaults.due_hours.standard;

    const order = await insertRow<WorkOrder>('work_orders', {
        order_number: nextWorkOrderNumber(),
        title: `${event.road_name} ${event.event_type.replace(/_/g, ' ')} dispatch`,
        road_name: event.road_name,
        ward,
        source: 'fleet',
        source_id: event.id,
        priority,
        status: 'queued',
        assigned_department: fleetDefaults.department,
        assigned_crew: priority === 'critical' ? fleetDefaults.crews.critical : fleetDefaults.crews.standard,
        due_by: new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString(),
        estimated_cost_inr: priority === 'critical' ? fleetDefaults.estimated_cost_inr.critical : fleetDefaults.estimated_cost_inr.standard,
        bilingual_summary: {
            en: `${event.event_type.replace(/_/g, ' ')} detected by ${event.partner} on ${event.route_name}.`,
            hi: `${event.partner} द्वारा ${event.route_name} पर ${event.event_type.replace(/_/g, ' ')} का पता चला।`
        },
        permit_number: null
    });

    if (isUuid(event.id)) {
        await saveFleetCameraEventData({
            ...event,
            status: 'dispatched'
        });
    }

    return { order, created: true as const };
}

export async function listContractorScorecardsData() {
    return selectRows<ContractorScorecard>('contractor_scorecards', 'updated_at', false);
}

export async function saveContractorScorecardData(record: ContractorScorecard) {
    const payload = {
        contractor: record.contractor,
        active_projects: record.active_projects,
        completed_projects: record.completed_projects,
        on_time_rate_percent: record.on_time_rate_percent,
        closure_evidence_rate_percent: record.closure_evidence_rate_percent,
        citizen_rating: record.citizen_rating,
        repeat_dig_penalties: record.repeat_dig_penalties,
        safety_incidents: record.safety_incidents,
        coordination_score: record.coordination_score,
        delay_risk: record.delay_risk,
        last_audit_at: record.last_audit_at || null,
        public_grade: record.public_grade,
        watchlist: record.watchlist,
        strongest_metric: record.strongest_metric || null,
        risk_note: record.risk_note || null
    };

    if (isUuid(record.id)) {
        return updateRow<ContractorScorecard>('contractor_scorecards', record.id, payload);
    }

    return insertRow<ContractorScorecard>('contractor_scorecards', payload);
}

export async function listCitizenChampionsData() {
    return selectRows<CitizenChampion>('citizen_champions', 'updated_at', false);
}

export async function listWardLeaderboardData() {
    return selectRows<WardLeaderboardEntry>('ward_leaderboard', 'total_points', false);
}

export async function listCivicRewardRulesData() {
    return selectRows<CivicRewardRule>('civic_reward_rules', 'points', false);
}

export async function listUtilityOrganizationsData() {
    return selectRows<UtilityOrganization>('utility_organizations', 'name', true);
}

export async function listUtilityInfrastructureData() {
    const rows = await selectRows<any>('utility_infrastructure', 'updated_at', false);
    return rows.map(normalizeUtilityInfrastructureRecord);
}

export async function listUtilityConflictZonesData() {
    return selectRows<UtilityConflictZone>('utility_conflict_zones', 'detected_at', false);
}

export async function listExcavationPermitsData() {
    return selectRows<ExcavationPermit>('excavation_permits', 'created_at', false);
}

export async function listCoordinationBundlesData() {
    const rows = await selectRows<any>('excavation_bundles', 'updated_at', false);
    const defaults = await getCoordinationDefaultsData();
    return rows.map((row) => ({
        id: row.id,
        bundle_code: row.bundle_code,
        road_name: row.road_name,
        permit_count: row.permit_count,
        recommended_start: row.recommended_start,
        recommended_end: row.recommended_end,
        traffic_impact_score: row.traffic_impact_score,
        rationale: row.rationale,
        coordination_dept: row.coordination_dept,
        cost_savings_inr: row.cost_savings_inr,
        delay_probability: row.delay_probability,
        permits: row.permits || [],
        recommended_window: row.recommended_window || row.preferred_time_slot || defaults.recommended_window,
        emergency_protocol: row.emergency_protocol || defaults.standard_emergency_protocol,
        notification_plan: row.notification_plan || defaults.notification_plan,
        qr_board_url: row.qr_board_url || ''
    })) as CoordinationBundle[];
}

export async function saveCoordinationBundleData(bundle: CoordinationBundle) {
    const payload = {
        bundle_code: bundle.bundle_code,
        road_name: bundle.road_name,
        permit_count: bundle.permit_count,
        recommended_start: bundle.recommended_start,
        recommended_end: bundle.recommended_end,
        preferred_time_slot: bundle.recommended_window,
        traffic_impact_score: bundle.traffic_impact_score,
        rationale: bundle.rationale,
        coordination_dept: bundle.coordination_dept,
        cost_savings_inr: bundle.cost_savings_inr,
        delay_probability: bundle.delay_probability,
        permits: bundle.permits,
        recommended_window: bundle.recommended_window,
        emergency_protocol: bundle.emergency_protocol,
        notification_plan: bundle.notification_plan,
        qr_board_url: bundle.qr_board_url
    };

    if (isUuid(bundle.id)) {
        return updateRow<CoordinationBundle>('excavation_bundles', bundle.id, payload);
    }

    return insertRow<CoordinationBundle>('excavation_bundles', payload);
}

export async function listRoadTwinSnapshotsData() {
    const rows = await selectRows<RoadTwinSnapshotRow>('road_twin_snapshots', 'snapshot_year', false);
    return rows;
}

export async function listAccessProfilesData() {
    const rows = await selectRows<any>('profiles', 'updated_at', false);
    const { default_city } = await getGeoDefaultsData();
    return rows.map((row) => ({
        id: row.id,
        full_name: row.full_name || row.email || 'Unnamed user',
        email: row.email,
        role: row.role,
        department: row.department || null,
        city: row.city || default_city,
        is_active: Boolean(row.is_active),
        last_active_at: row.updated_at || row.created_at,
        clearance: clearanceForRole(row.role)
    })) as AccessProfile[];
}

export async function listAIAuditLogsData() {
    return selectRows<AIAuditLog>('ai_usage_logs', 'created_at', false);
}

export async function syncFieldCaptureDraftData(draftId: string) {
    const draft = await selectSingleRow<FieldCaptureDraft>('field_capture_drafts', 'id', draftId);
    if (!draft) {
        return null;
    }

    const defaults = await getFieldSyncDefaultsData();

    const syncedAt = new Date().toISOString();
    const syncedDraft = await saveFieldCaptureDraftData({
        ...draft,
        status: 'synced',
        synced_at: syncedAt
    });

    if (draft.workflow === 'road_survey') {
        await saveRoadSurveyData({
            id: `survey-${Date.now()}`,
            title: draft.title,
            road_segment_id: null,
            road_name: draft.road_name,
            lat_center: draft.lat,
            lng_center: draft.lng,
            photo_url: '',
            ai_health_score: defaults.survey.health_score,
            ai_condition: defaults.survey.condition,
            ai_defects: [],
            ai_confidence: defaults.survey.confidence,
            created_at: syncedAt
        });
    }

    if (draft.workflow === 'emergency') {
        const incidentType = draft.emergency_type || 'road_collapse';
        const emergencyDefaults = defaults.emergency;
        await saveEmergencyIncidentData({
            id: `incident-${Date.now()}`,
            permit_number: draft.permit_number || `EMR-${Date.now()}`,
            road_name: draft.road_name,
            ward: draft.ward,
            incident_type: incidentType,
            protocol: emergencyDefaults.protocol_by_type[incidentType],
            severity: emergencyDefaults.severity_by_type[incidentType],
            status: 'new',
            summary: draft.summary,
            triggered_at: syncedAt,
            response_sla_minutes: emergencyDefaults.sla_minutes[incidentType],
            affected_radius_m: emergencyDefaults.radius_m[incidentType],
            diversion_route: emergencyDefaults.diversion_route,
            field_language: draft.language,
            nearest_utilities: emergencyDefaults.nearest_utilities,
            notified_departments: emergencyDefaults.notified_departments,
            permit_approval_id: null,
            post_audit_due: draft.permit_number ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() : null,
            checklist: [
                { id: `check-${Date.now()}-1`, label: 'Field capture synced', owner: draft.operator_name, done: true },
                { id: `check-${Date.now()}-2`, label: 'Supervisor review', owner: emergencyDefaults.checklist_owners.supervisor_review, done: false },
                { id: `check-${Date.now()}-3`, label: 'Detour notice release', owner: emergencyDefaults.checklist_owners.detour_notice_release, done: false }
            ]
        });
    }

    await saveSmartNotificationData({
        id: `notif-field-${Date.now()}`,
        title: `${draft.workflow === 'emergency' ? 'Field emergency sync' : 'Field capture synced'} · ${draft.road_name}`,
        body: draft.summary,
        priority: draft.workflow === 'emergency' ? 'critical' : 'medium',
        channel: 'push',
        audience: draft.workflow === 'utility_marking' ? defaults.notification.utility_audience : 'citizens',
        status: 'scheduled',
        road_name: draft.road_name,
        ward: draft.ward,
        scheduled_for: new Date(Date.now() + defaults.notification.delay_minutes * 60 * 1000).toISOString(),
        radius_m: draft.workflow === 'emergency' ? defaults.notification.emergency_radius_m : defaults.notification.default_radius_m,
        related_permit_number: draft.permit_number || null,
        detour: draft.workflow === 'emergency' ? defaults.notification.emergency_detour_text : null,
        language: draft.language
    });

    return syncedDraft;
}

export async function listPolicyAlertsData() {
    const [approvals, proofs, verifications] = await Promise.all([
        listPermitApprovalsData(),
        listClosureProofPackagesData(),
        listPublicVerificationEventsData()
    ]);

    const alerts: PolicyAlert[] = [];

    approvals.forEach((record) => {
        if (record.compliance_flags.length > 0) {
            alerts.push({
                id: `policy-approval-${record.id}`,
                category: record.emergency ? 'emergency_abuse' : 'repeat_dig',
                severity: record.status === 'flagged' ? 'critical' : 'high',
                title: `${record.permit_number} requires policy attention`,
                description: record.compliance_flags.join(' '),
                owner: 'Permit Governance Cell',
                road_name: record.road_name,
                permit_number: record.permit_number,
                created_at: record.post_audit_due || new Date().toISOString()
            });
        }
    });

    proofs.forEach((proof) => {
        if (proof.status !== 'approved' && proof.status !== 'paid') {
            alerts.push({
                id: `policy-closure-${proof.id}`,
                category: 'closure_gap',
                severity: proof.utility_depth_verified ? 'high' : 'critical',
                title: `${proof.road_name} closure proof is incomplete`,
                description: proof.payment_hold_reason || proof.proof_notes || 'Closure proof package is still blocking final governance sign-off.',
                owner: 'Closure Proof Desk',
                road_name: proof.road_name,
                permit_number: proof.permit_number,
                created_at: proof.updated_at
            });
        }
    });

    verifications
        .filter((event) => event.outcome === 'flagged')
        .forEach((event) => {
            alerts.push({
                id: `policy-trust-${event.id}`,
                category: 'public_trust',
                severity: 'high',
                title: `${event.road_name} public record was flagged`,
                description: `A public verification lookup from ${event.source.replace(/_/g, ' ')} was flagged and should be reviewed.`,
                owner: 'Citizen Trust Desk',
                road_name: event.road_name,
                permit_number: event.permit_number,
                created_at: event.created_at
            });
        });

    return sortByDateDesc(alerts, 'created_at');
}
