import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import {
    listDelayRiskAssessmentsData,
    listTrafficAdvisoriesData,
    saveDelayRiskAssessmentData,
    saveSmartNotificationData,
    saveTrafficAdvisoryData
} from '../../lib/supabaseData';
import type { DelayRiskAssessment, TrafficAdvisory } from '../../types';
import { AlertTriangle, ArrowRight, BellRing, Clock3, Route, ShieldAlert, ShieldCheck, TimerReset, TrafficCone } from 'lucide-react';
import toast from 'react-hot-toast';

function advisoryVariant(status: TrafficAdvisory['status']) {
    switch (status) {
        case 'cleared':
            return 'success';
        case 'active':
            return 'warning';
        default:
            return 'info';
    }
}

function escalationVariant(status: DelayRiskAssessment['escalation_status']) {
    switch (status) {
        case 'mitigated':
            return 'success';
        case 'monitoring':
            return 'info';
        case 'needs_sign_off':
            return 'warning';
        default:
            return 'error';
    }
}

export function TrafficDelayCommandCenter() {
    const navigate = useNavigate();
    const [advisories, setAdvisories] = useState<TrafficAdvisory[]>([]);
    const [delayRisks, setDelayRisks] = useState<DelayRiskAssessment[]>([]);
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        try {
            const [nextAdvisories, nextDelayRisks] = await Promise.all([
                listTrafficAdvisoriesData(),
                listDelayRiskAssessmentsData()
            ]);
            setAdvisories(nextAdvisories);
            setDelayRisks(nextDelayRisks);
            setSelectedId((current) => current || nextAdvisories[0]?.id || '');
        } catch (error: any) {
            toast.error(error.message || 'Unable to load traffic command data.');
        }
    }

    const selectedAdvisory = advisories.find((item) => item.id === selectedId) || advisories[0] || null;
    const linkedDelayRisk = selectedAdvisory
        ? delayRisks.find((item) => item.permit_number === selectedAdvisory.permit_number) || null
        : null;

    const stats = useMemo(() => ({
        active: advisories.filter((item) => item.status !== 'cleared').length,
        policeQueued: advisories.filter((item) => item.police_notified).length,
        avgDelay: advisories.length
            ? Math.round(advisories.reduce((sum, item) => sum + item.estimated_delay_minutes, 0) / advisories.length)
            : 0,
        signOffs: delayRisks.filter((item) => item.required_sign_off !== 'none' && item.escalation_status !== 'mitigated').length
    }), [advisories, delayRisks]);

    const persistAdvisory = async (advisory: TrafficAdvisory) => {
        const saved = await saveTrafficAdvisoryData(advisory);
        setAdvisories((current) => current.map((item) => item.id === saved.id ? saved : item));
        return saved;
    };

    const persistDelayRisk = async (assessment: DelayRiskAssessment) => {
        const saved = await saveDelayRiskAssessmentData(assessment);
        setDelayRisks((current) => current.map((item) => item.id === saved.id ? saved : item));
        return saved;
    };

    const handlePublishTrafficNotice = async () => {
        if (!selectedAdvisory) return;
        try {
            await saveSmartNotificationData({
            id: `notif-traffic-${Date.now()}`,
            title: `Traffic police advisory for ${selectedAdvisory.road_name}`,
            body: `Expected delay ${selectedAdvisory.estimated_delay_minutes} min. Detour: ${selectedAdvisory.detour}`,
            priority: selectedAdvisory.disruption_score >= 70 ? 'critical' : 'high',
            channel: 'sms',
            audience: 'traffic_police',
            status: 'scheduled',
            road_name: selectedAdvisory.road_name,
            ward: selectedAdvisory.ward,
            scheduled_for: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            radius_m: 1200,
            related_permit_number: selectedAdvisory.permit_number,
            detour: selectedAdvisory.detour,
            language: 'Hindi + English'
            });
            await persistAdvisory({
                ...selectedAdvisory,
                police_notified: true,
                fleet_notified: true,
                citizen_notice_status: selectedAdvisory.citizen_notice_status === 'draft' ? 'scheduled' : selectedAdvisory.citizen_notice_status
            });
            toast.success('Traffic police and fleet advisory queued.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to publish the traffic notice.');
        }
    };

    const handleAdvanceTrafficStatus = async () => {
        if (!selectedAdvisory) return;
        const nextStatus = selectedAdvisory.status === 'planned' ? 'active' : selectedAdvisory.status === 'active' ? 'cleared' : 'cleared';
        try {
            await persistAdvisory({
                ...selectedAdvisory,
                status: nextStatus
            });
            toast.success(`Traffic advisory moved to ${nextStatus}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to advance this advisory.');
        }
    };

    const handleEscalateDelay = async () => {
        if (!linkedDelayRisk) return;
        const nextStatus: DelayRiskAssessment['escalation_status'] = linkedDelayRisk.escalation_status === 'monitoring'
            ? 'needs_sign_off'
            : linkedDelayRisk.escalation_status === 'needs_sign_off'
                ? 'escalated'
                : 'mitigated';
        try {
            await persistDelayRisk({
                ...linkedDelayRisk,
                escalation_status: nextStatus,
                last_reviewed_at: new Date().toISOString()
            });
            toast.success(`Delay case moved to ${nextStatus.replace(/_/g, ' ')}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to update the delay-risk case.');
        }
    };

    if (!selectedAdvisory) {
        return <div className="page-container">No traffic advisories available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Traffic & Delay Command <TrafficCone className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Disruption scoring, delay-risk escalation, police coordination, and detour readiness for active road works.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">F-03 + F-06 Control</Badge>
                    <Button variant="ghost" onClick={() => navigate('/notifications')}>
                        Notification Center
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Active Corridors</div>
                    <div className="text-3xl font-black text-[var(--brand)]">{stats.active}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Police Notices</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.policeQueued}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Avg Delay</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">{stats.avgDelay}m</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Sign-Off Cases</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.signOffs}</div>
                </Card>
            </div>

            <div className="grid xl:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Traffic Advisories</div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {advisories.map((advisory) => (
                            <button
                                key={advisory.id}
                                type="button"
                                onClick={() => setSelectedId(advisory.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === advisory.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)]">{advisory.road_name}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {advisory.permit_number} · {advisory.closure_window}
                                        </div>
                                    </div>
                                    <Badge variant={advisoryVariant(advisory.status)}>{advisory.status}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Badge variant={advisory.disruption_score >= 70 ? 'error' : advisory.disruption_score >= 50 ? 'warning' : 'info'}>
                                        score {advisory.disruption_score}
                                    </Badge>
                                    <Badge variant="info">{advisory.estimated_delay_minutes} min</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Corridor</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedAdvisory.road_name}</h2>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {selectedAdvisory.permit_number} · {selectedAdvisory.ward}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button variant="secondary" onClick={handlePublishTrafficNotice}>
                                    <BellRing size={14} /> Publish Police Notice
                                </Button>
                                <Button onClick={handleAdvanceTrafficStatus} disabled={selectedAdvisory.status === 'cleared'}>
                                    Advance Advisory <ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <TimerReset size={12} /> Delay
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedAdvisory.estimated_delay_minutes} min</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Route size={12} /> Routes
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedAdvisory.affected_routes.length}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <ShieldCheck size={12} /> Police
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedAdvisory.police_notified ? 'Notified' : 'Pending'}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Clock3 size={12} /> Window
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedAdvisory.recommended_window}</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Traffic Plan</div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Closure window</span><span className="metric-value">{selectedAdvisory.closure_window}</span></div>
                                        <div className="metric-row"><span className="metric-label">Recommended window</span><span className="metric-value">{selectedAdvisory.recommended_window}</span></div>
                                        <div className="metric-row"><span className="metric-label">Event watch</span><span className="metric-value">{selectedAdvisory.event_watch}</span></div>
                                    </div>
                                    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-xs text-[var(--text-secondary)] break-words">
                                        Detour: {selectedAdvisory.detour}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {selectedAdvisory.affected_routes.map((routeName) => (
                                            <Badge key={routeName} variant="info">{routeName}</Badge>
                                        ))}
                                    </div>
                                </div>

                                {linkedDelayRisk && (
                                    <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Delay Risk Review</div>
                                            <Badge variant={escalationVariant(linkedDelayRisk.escalation_status)}>
                                                {linkedDelayRisk.escalation_status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm text-[var(--text-secondary)]">
                                            <div className="metric-row"><span className="metric-label">Contractor</span><span className="metric-value">{linkedDelayRisk.contractor}</span></div>
                                            <div className="metric-row"><span className="metric-label">Delay probability</span><span className="metric-value">{Math.round(linkedDelayRisk.delay_probability * 100)}%</span></div>
                                            <div className="metric-row"><span className="metric-label">Buffer</span><span className="metric-value">{linkedDelayRisk.suggested_buffer_days} days</span></div>
                                            <div className="metric-row"><span className="metric-label">Sign-off</span><span className="metric-value">{linkedDelayRisk.required_sign_off.replace(/_/g, ' ')}</span></div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            {linkedDelayRisk.risk_factors.map((factor) => (
                                                <div key={factor} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                                                    {factor}
                                                </div>
                                            ))}
                                        </div>
                                        <Button className="w-full mt-4" variant="secondary" onClick={handleEscalateDelay}>
                                            <ShieldAlert size={14} /> Advance Delay Escalation
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Notice State</div>
                                    <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            Police notice: {selectedAdvisory.police_notified ? 'sent' : 'pending'}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            Fleet notice: {selectedAdvisory.fleet_notified ? 'sent' : 'pending'}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            Citizen notice: {selectedAdvisory.citizen_notice_status}
                                        </div>
                                    </div>
                                </div>

                                <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-[var(--yellow)] shrink-0 mt-0.5" size={18} />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-[var(--text-primary)]">PRD escalation rule</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                                Delay probability above 80% should not stay as a passive label. It now drives sign-off visibility and escalation tracking from the traffic desk.
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
