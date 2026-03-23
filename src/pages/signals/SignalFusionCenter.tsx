import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
import {
    createWorkOrderFromSignalFusionData,
    listComplaintsData,
    listFieldCaptureDraftsData,
    listFleetCameraEventsData,
    listRoadSurveysData,
    listSignalFusionCasesData,
    saveSignalFusionCaseData
} from '../../lib/supabaseData';
import type { Complaint, FieldCaptureDraft, FleetCameraEvent, RoadImageSurvey, SignalFusionCase } from '../../types';
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, Layers3, Search, ShieldCheck, Siren, Users } from 'lucide-react';
import toast from 'react-hot-toast';

function severityVariant(severity: SignalFusionCase['severity']) {
    switch (severity) {
        case 'critical':
            return 'error';
        case 'high':
            return 'warning';
        case 'medium':
            return 'info';
        default:
            return 'success';
    }
}

function validationVariant(status: SignalFusionCase['validation_status']) {
    switch (status) {
        case 'work_ordered':
            return 'success';
        case 'engineer_validated':
            return 'info';
        case 'auto_escalated':
            return 'warning';
        default:
            return 'info';
    }
}

export function SignalFusionCenter() {
    const navigate = useNavigate();
    const [cases, setCases] = useState<SignalFusionCase[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [fleetEvents, setFleetEvents] = useState<FleetCameraEvent[]>([]);
    const [surveys, setSurveys] = useState<RoadImageSurvey[]>([]);
    const [fieldDrafts, setFieldDrafts] = useState<FieldCaptureDraft[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        try {
            const [nextCases, nextComplaints, nextFleet, nextSurveys, nextFieldDrafts] = await Promise.all([
                listSignalFusionCasesData(),
                listComplaintsData(),
                listFleetCameraEventsData(),
                listRoadSurveysData(),
                listFieldCaptureDraftsData()
            ]);
            setCases(nextCases);
            setComplaints(nextComplaints);
            setFleetEvents(nextFleet);
            setSurveys(nextSurveys);
            setFieldDrafts(nextFieldDrafts);
            setSelectedId((current) => current || nextCases[0]?.id || '');
        } catch (error: any) {
            toast.error(error.message || 'Unable to load signal fusion data from Supabase.');
        }
    }

    const filteredCases = useMemo(() => cases.filter((item) => {
        const haystack = `${item.road_name} ${item.ward} ${item.defect_focus} ${item.validation_status}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
    }), [cases, searchQuery]);

    const selectedCase = filteredCases.find((item) => item.id === selectedId)
        || cases.find((item) => item.id === selectedId)
        || filteredCases[0]
        || cases[0]
        || null;

    const relatedComplaints = selectedCase
        ? complaints.filter((item) => item.road_name === selectedCase.road_name).slice(0, 4)
        : [];
    const relatedFleet = selectedCase
        ? fleetEvents.filter((item) => item.road_name === selectedCase.road_name).slice(0, 4)
        : [];
    const relatedSurveys = selectedCase
        ? surveys.filter((item) => item.road_name === selectedCase.road_name).slice(0, 3)
        : [];
    const relatedDrafts = selectedCase
        ? fieldDrafts.filter((item) => item.road_name === selectedCase.road_name).slice(0, 3)
        : [];

    const stats = useMemo(() => ({
        autoEscalated: cases.filter((item) => item.auto_escalated).length,
        engineerValidated: cases.filter((item) => item.validation_status === 'engineer_validated').length,
        workOrdered: cases.filter((item) => item.validation_status === 'work_ordered').length,
        highConfidence: cases.filter((item) => item.confidence_score >= 0.75).length
    }), [cases]);

    const handleValidate = async () => {
        if (!selectedCase) return;
        try {
            await saveSignalFusionCaseData({
                ...selectedCase,
                validation_status: selectedCase.linked_work_order_id ? 'work_ordered' : 'engineer_validated',
                engineer_note: 'Engineer reviewed the fused evidence pack and confirmed corridor-level action is warranted.'
            });
            await loadData();
            toast.success('Signal cluster validated by the engineer desk.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to validate this signal cluster.');
        }
    };

    const handleEscalate = async () => {
        if (!selectedCase) return;
        try {
            await saveSignalFusionCaseData({
                ...selectedCase,
                validation_status: selectedCase.linked_work_order_id ? 'work_ordered' : 'auto_escalated',
                engineer_note: 'Escalated because repeated reports and corroborating signals crossed the action threshold.'
            });
            await loadData();
            toast.success('Signal cluster escalated for corridor action.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to escalate this signal cluster.');
        }
    };

    const handleCreateOrder = async () => {
        if (!selectedCase) return;
        try {
            const result = await createWorkOrderFromSignalFusionData(selectedCase);
            await loadData();
            toast.success(result.created ? 'Work order generated from fused signals.' : 'Existing road work order linked to this signal cluster.');
            navigate('/work-orders');
        } catch (error: any) {
            toast.error(error.message || 'Unable to create a work order from this signal cluster.');
        }
    };

    if (!selectedCase) {
        return <div className="page-container">No signal fusion cases available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Signal Fusion Center <Layers3 className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Crowd-validated escalation across citizen complaints, fleet detections, surveys, and field captures with 48-hour auto-trigger rules.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">F-01 Signal Fusion</Badge>
                    <Button variant="ghost" onClick={() => navigate('/complaints')}>
                        Complaints
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/work-orders')}>
                        Work Orders
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Auto Escalated</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.autoEscalated}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Engineer Validated</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.engineerValidated}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Work Ordered</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.workOrdered}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">High Confidence</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{stats.highConfidence}</div>
                </Card>
            </div>

            <div className="grid xl:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Fusion Queue</div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <Input
                                className="pl-9"
                                placeholder="Search road, ward, or defect..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filteredCases.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedId(item.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === item.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{item.road_name}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {item.ward} · {item.defect_focus.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                    <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Badge variant={validationVariant(item.validation_status)}>{item.validation_status.replace(/_/g, ' ')}</Badge>
                                    <Badge variant="info">{Math.round(item.confidence_score * 100)}% confidence</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Signal Case</div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] break-words">{selectedCase.road_name}</h2>
                                    <Badge variant={severityVariant(selectedCase.severity)}>{selectedCase.severity}</Badge>
                                    <Badge variant={validationVariant(selectedCase.validation_status)}>{selectedCase.validation_status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {selectedCase.ward} · confidence {Math.round(selectedCase.confidence_score * 100)}% · {selectedCase.source_mix.join(' + ')}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button variant="ghost" onClick={handleValidate}>
                                    <ShieldCheck size={14} /> Validate
                                </Button>
                                <Button variant="ghost" onClick={handleEscalate}>
                                    <Siren size={14} /> Escalate
                                </Button>
                                <Button onClick={handleCreateOrder}>
                                    <ArrowRight size={14} /> Create Work Order
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Users size={12} /> Citizen 48h
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedCase.citizen_reports_48h}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <AlertTriangle size={12} /> Fleet Hits
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedCase.fleet_hits}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Camera size={12} /> Survey Hits
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedCase.survey_hits}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <CheckCircle2 size={12} /> Field Hits
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedCase.field_hits}</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Escalation Summary</div>
                                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">{selectedCase.summary}</div>
                                    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                        {selectedCase.recommended_action}
                                    </div>
                                    {selectedCase.engineer_note && (
                                        <div className="mt-4 rounded-xl border border-[var(--blue-border)] bg-[var(--blue-bg)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                                            {selectedCase.engineer_note}
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Time Window</div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">First seen</span><span className="metric-value">{new Date(selectedCase.first_seen_at).toLocaleString()}</span></div>
                                        <div className="metric-row"><span className="metric-label">Last seen</span><span className="metric-value">{new Date(selectedCase.last_seen_at).toLocaleString()}</span></div>
                                        <div className="metric-row"><span className="metric-label">Total citizen reports</span><span className="metric-value">{selectedCase.total_citizen_reports}</span></div>
                                        <div className="metric-row"><span className="metric-label">Auto-escalated</span><span className="metric-value">{selectedCase.auto_escalated ? 'Yes' : 'No'}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Flow Links</div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/complaints')}>
                                            Complaints <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/dashcam')}>
                                            Fleet Feed <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/surveys')}>
                                            Surveys <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/field')}>
                                            Field Console <ArrowRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="grid xl:grid-cols-2 gap-8">
                        <Card className="p-6 space-y-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Citizen + Fleet Evidence</div>
                            <div className="space-y-4">
                                {relatedComplaints.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-sm font-black text-[var(--text-primary)]">{item.ticket_number}</div>
                                            <Badge variant={severityVariant(item.priority || 'medium')}>{item.priority || 'medium'}</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{item.complaint_text}</div>
                                    </div>
                                ))}
                                {relatedFleet.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-sm font-black text-[var(--text-primary)]">{item.partner}</div>
                                            <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">
                                            {item.event_type.replace(/_/g, ' ')} on {item.route_name} · confidence {Math.round(item.confidence * 100)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-6 space-y-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Survey + Field Evidence</div>
                            <div className="space-y-4">
                                {relatedSurveys.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-sm font-black text-[var(--text-primary)]">{item.title}</div>
                                            <Badge variant={item.ai_health_score < 50 ? 'error' : item.ai_health_score < 70 ? 'warning' : 'info'}>
                                                health {item.ai_health_score}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{item.ai_condition}</div>
                                    </div>
                                ))}
                                {relatedDrafts.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-sm font-black text-[var(--text-primary)]">{item.title}</div>
                                            <Badge variant="info">{item.status.replace(/_/g, ' ')}</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{item.summary}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
