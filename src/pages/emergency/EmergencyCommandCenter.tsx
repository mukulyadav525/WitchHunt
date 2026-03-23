import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import {
    createWorkOrderFromEmergencyData,
    listEmergencyIncidentsData,
    listPermitApprovalsData,
    listPublicWorksitesData,
    saveEmergencyIncidentData,
    saveSmartNotificationData
} from '../../lib/supabaseData';
import type { EmergencyIncident, PermitApprovalRecord, PublicWorksite } from '../../types';
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, Clock3, Droplets, Flame, MapPin, Radio, ShieldAlert, ShieldCheck, Siren, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

type EmergencyStatus = EmergencyIncident['status'];

const STATUS_SEQUENCE: EmergencyStatus[] = ['new', 'mobilized', 'stabilized', 'post_audit_due', 'closed'];

const INCIDENT_COPY = {
    gas_leak: {
        title: 'Gas Leak',
        icon: Flame
    },
    electrical_fault: {
        title: 'Electrical Fault',
        icon: Zap
    },
    burst_main: {
        title: 'Burst Main',
        icon: Droplets
    },
    road_collapse: {
        title: 'Road Collapse',
        icon: AlertTriangle
    }
} as const;

function nextIncidentStatus(current: EmergencyStatus) {
    const index = STATUS_SEQUENCE.indexOf(current);
    return STATUS_SEQUENCE[Math.min(index + 1, STATUS_SEQUENCE.length - 1)];
}

function badgeVariant(status: EmergencyStatus) {
    switch (status) {
        case 'closed':
            return 'success';
        case 'post_audit_due':
            return 'warning';
        case 'mobilized':
        case 'stabilized':
            return 'info';
        default:
            return 'error';
    }
}

export function EmergencyCommandCenter() {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
    const [approvals, setApprovals] = useState<PermitApprovalRecord[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        try {
            const [nextIncidents, nextApprovals, nextWorksites] = await Promise.all([
                listEmergencyIncidentsData(),
                listPermitApprovalsData(),
                listPublicWorksitesData()
            ]);
            setIncidents(nextIncidents);
            setApprovals(nextApprovals);
            setWorksites(nextWorksites);
            setSelectedId((current) => current || nextIncidents[0]?.id || '');
        } catch (error: any) {
            toast.error(error.message || 'Unable to load emergency command data.');
        }
    }

    const selectedIncident = incidents.find((incident) => incident.id === selectedId) || incidents[0] || null;

    const stats = useMemo(() => ({
        active: incidents.filter((incident) => incident.status !== 'closed').length,
        critical: incidents.filter((incident) => incident.severity === 'critical' && incident.status !== 'closed').length,
        auditDue: incidents.filter((incident) => incident.status === 'post_audit_due').length,
        avgSlaMinutes: incidents.length
            ? Math.round(incidents.reduce((sum, incident) => sum + incident.response_sla_minutes, 0) / incidents.length)
            : 0
    }), [incidents]);

    const linkedApproval = selectedIncident
        ? approvals.find((record) => record.id === selectedIncident.permit_approval_id || record.permit_number === selectedIncident.permit_number) || null
        : null;
    const linkedWorksite = selectedIncident
        ? worksites.find((worksite) => worksite.permit_number === selectedIncident.permit_number || worksite.road_name === selectedIncident.road_name) || null
        : null;

    const persistIncident = async (incident: EmergencyIncident) => {
        const saved = await saveEmergencyIncidentData(incident);
        setIncidents((current) => current.map((item) => item.id === saved.id ? saved : item));
        return saved;
    };

    const handleAdvanceStatus = async () => {
        if (!selectedIncident) return;
        const nextStatus = nextIncidentStatus(selectedIncident.status);
        const nextIncident: EmergencyIncident = {
            ...selectedIncident,
            status: nextStatus,
            post_audit_due: nextStatus === 'post_audit_due' && !selectedIncident.post_audit_due
                ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
                : nextStatus === 'closed'
                    ? null
                    : selectedIncident.post_audit_due
        };
        try {
            await persistIncident(nextIncident);
            toast.success(`Incident moved to ${nextStatus.replace(/_/g, ' ')}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to update this incident.');
        }
    };

    const handleToggleChecklist = async (itemId: string) => {
        if (!selectedIncident) return;
        const nextIncident: EmergencyIncident = {
            ...selectedIncident,
            checklist: selectedIncident.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item
            )
        };
        try {
            await persistIncident(nextIncident);
        } catch (error: any) {
            toast.error(error.message || 'Unable to update the checklist.');
        }
    };

    const handleBroadcast = async () => {
        if (!selectedIncident) return;
        try {
            await saveSmartNotificationData({
            id: `notif-emergency-${Date.now()}`,
            title: `${INCIDENT_COPY[selectedIncident.incident_type].title} alert on ${selectedIncident.road_name}`,
            body: `${selectedIncident.summary} Detour: ${selectedIncident.diversion_route}`,
            priority: selectedIncident.severity === 'critical' ? 'critical' : 'high',
            channel: 'sms',
            audience: 'traffic_police',
            status: 'scheduled',
            road_name: selectedIncident.road_name,
            ward: selectedIncident.ward,
            scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            radius_m: selectedIncident.affected_radius_m,
            related_permit_number: selectedIncident.permit_number,
            detour: selectedIncident.diversion_route,
            language: selectedIncident.field_language
            });
            toast.success('Emergency broadcast queued for traffic and field teams.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to queue the emergency broadcast.');
        }
    };

    const handleCreateWorkOrder = async () => {
        if (!selectedIncident) return;
        try {
            const result = await createWorkOrderFromEmergencyData(selectedIncident);
            toast.success(result.created ? 'Emergency restoration order generated.' : 'Open work order already exists for this incident.');
            navigate('/work-orders');
        } catch (error: any) {
            toast.error(error.message || 'Unable to create an emergency work order.');
        }
    };

    if (!selectedIncident) {
        return <div className="page-container">No emergency incidents available.</div>;
    }

    const IncidentIcon = INCIDENT_COPY[selectedIncident.incident_type].icon;
    const checklistDone = selectedIncident.checklist.filter((item) => item.done).length;

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Emergency Command Center <Siren className="text-[var(--red)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Fast-track response, protocol checklists, radius notifications, and 48-hour post-audit control.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="error">F-07 Emergency Priority</Badge>
                    <Button variant="ghost" onClick={() => navigate('/work-orders')}>
                        Work Orders
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/excavations')}>
                        Back to Excavations
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Open Incidents</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.active}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Critical</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{stats.critical}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Post-Audit Due</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">{stats.auditDue}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Target SLA</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.avgSlaMinutes}m</div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-[0.9fr,2.1fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Emergency Queue</div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {incidents.map((incident) => {
                            const QueueIcon = INCIDENT_COPY[incident.incident_type].icon;
                            return (
                                <button
                                    key={incident.id}
                                    type="button"
                                    onClick={() => setSelectedId(incident.id)}
                                    className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                    style={selectedId === incident.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
                                                <QueueIcon size={16} className="shrink-0 text-[var(--red)]" />
                                                <span className="truncate">{incident.road_name}</span>
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                                {incident.protocol} · {incident.permit_number}
                                            </div>
                                        </div>
                                        <Badge variant={badgeVariant(incident.status)}>{incident.status.replace(/_/g, ' ')}</Badge>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-3 line-clamp-2 break-words">{incident.summary}</div>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Incident</div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <IncidentIcon size={22} className="text-[var(--red)] shrink-0" />
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] break-words">{selectedIncident.road_name}</h2>
                                    <Badge variant={selectedIncident.severity === 'critical' ? 'error' : 'warning'}>
                                        {selectedIncident.severity}
                                    </Badge>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {INCIDENT_COPY[selectedIncident.incident_type].title} · {selectedIncident.protocol} · {selectedIncident.ward}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <Button variant="secondary" onClick={handleBroadcast}>
                                    <BellRing size={14} /> Notify All
                                </Button>
                                <Button variant="secondary" onClick={handleCreateWorkOrder}>
                                    <ShieldCheck size={14} /> Create Restoration Order
                                </Button>
                                <Button onClick={handleAdvanceStatus} disabled={selectedIncident.status === 'closed'}>
                                    Advance Status <ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Clock3 size={12} /> Target SLA
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedIncident.response_sla_minutes} minutes</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Radio size={12} /> Field Language
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)] break-words">{selectedIncident.field_language}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <MapPin size={12} /> Impact Radius
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedIncident.affected_radius_m}m</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <ShieldCheck size={12} /> Checklist
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{checklistDone}/{selectedIncident.checklist.length} complete</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Protocol Summary</div>
                                    <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed break-words">
                                        {selectedIncident.summary}
                                    </p>
                                    <div className="text-xs text-[var(--text-secondary)] mt-4 break-words">
                                        Diversion route: {selectedIncident.diversion_route}
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Field Checklist</div>
                                    <div className="space-y-3">
                                        {selectedIncident.checklist.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleToggleChecklist(item.id)}
                                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${item.done ? 'border-[var(--green-border)] bg-[var(--green-bg)]' : 'border-[var(--border)]'}`}>
                                                        {item.done && <CheckCircle2 size={12} className="text-[var(--green)]" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{item.label}</div>
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                            {item.owner}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Nearby Utilities</div>
                                    <div className="space-y-2">
                                        {selectedIncident.nearest_utilities.map((utility) => (
                                            <div key={utility} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-xs text-[var(--text-secondary)] break-words">
                                                {utility}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Departments Notified</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedIncident.notified_departments.map((department) => (
                                            <Badge key={department} variant="info">{department}</Badge>
                                        ))}
                                    </div>
                                    {selectedIncident.post_audit_due && (
                                        <div className="mt-4 text-xs text-[var(--text-secondary)] break-words">
                                            Post-audit due: {new Date(selectedIncident.post_audit_due).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Linked Records</div>
                                    {linkedApproval ? (
                                        <Button className="w-full justify-between" variant="ghost" onClick={() => navigate('/approvals')}>
                                            Approval workflow
                                            <ArrowRight size={14} />
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-[var(--text-muted)]">No linked permit approval yet.</div>
                                    )}
                                    {linkedWorksite ? (
                                        <Button className="w-full justify-between" variant="ghost" onClick={() => navigate(`/track/${linkedWorksite.permit_number}`)}>
                                            Public tracker
                                            <ArrowRight size={14} />
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-[var(--text-muted)]">No public tracker attached.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/70">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="text-[var(--yellow)] shrink-0 mt-0.5" size={18} />
                            <div className="min-w-0">
                                <div className="text-sm font-black text-[var(--text-primary)]">Emergency SOP guardrails</div>
                                <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                    Genuine emergencies can fast-track approval, but field teams still need utility radius checks, bilingual safety instructions, and closure evidence within 48 hours.
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
