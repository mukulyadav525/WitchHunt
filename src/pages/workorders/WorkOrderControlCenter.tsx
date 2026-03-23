import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import {
    createWorkOrderFromComplaintData,
    createWorkOrderFromEmergencyData,
    createWorkOrderFromPredictionData,
    listClosureProofPackagesData,
    listComplaintsData,
    listEmergencyIncidentsData,
    listHealthPredictionsData,
    listPaymentMilestonesData,
    listRoadSegmentsData,
    listWorkOrdersData,
    saveWorkOrderData
} from '../../lib/supabaseData';
import type { ClosureProofPackage, Complaint, EmergencyIncident, HealthPrediction, PaymentMilestone, RoadSegment, WorkOrder } from '../../types';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Languages, ShieldAlert, Sparkles, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

function priorityVariant(priority: WorkOrder['priority']) {
    switch (priority) {
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

function statusVariant(status: WorkOrder['status']) {
    switch (status) {
        case 'completed':
            return 'success';
        case 'in_progress':
            return 'warning';
        case 'assigned':
            return 'info';
        default:
            return 'error';
    }
}

function nextStatus(status: WorkOrder['status']): WorkOrder['status'] {
    if (status === 'queued') return 'assigned';
    if (status === 'assigned') return 'in_progress';
    if (status === 'in_progress') return 'completed';
    return 'completed';
}

export function WorkOrderControlCenter() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [proofs, setProofs] = useState<ClosureProofPackage[]>([]);
    const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
    const [predictions, setPredictions] = useState<HealthPrediction[]>([]);
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        try {
            const [
                nextOrders,
                nextProofs,
                nextMilestones,
                nextComplaints,
                nextEmergencies,
                nextPredictions,
                nextRoads
            ] = await Promise.all([
                listWorkOrdersData(),
                listClosureProofPackagesData(),
                listPaymentMilestonesData(),
                listComplaintsData(),
                listEmergencyIncidentsData(),
                listHealthPredictionsData(),
                listRoadSegmentsData()
            ]);

            setOrders(nextOrders);
            setProofs(nextProofs);
            setMilestones(nextMilestones);
            setComplaints(nextComplaints);
            setEmergencies(nextEmergencies);
            setPredictions(nextPredictions);
            setRoads(nextRoads);
            setSelectedId((current) => current || nextOrders[0]?.id || '');
        } catch (error: any) {
            toast.error(error.message || 'Unable to load work-order data from Supabase.');
        }
    }

    const selectedOrder = orders.find((order) => order.id === selectedId) || orders[0] || null;
    const linkedProof = selectedOrder
        ? proofs.find((record) =>
            record.work_order_id === selectedOrder.id ||
            (selectedOrder.permit_number ? record.permit_number === selectedOrder.permit_number : record.road_name === selectedOrder.road_name)
        ) || null
        : null;
    const linkedMilestones = linkedProof
        ? milestones.filter((milestone) => milestone.closure_proof_id === linkedProof.id)
        : [];

    const predictionCandidates = useMemo(() => predictions
        .map((prediction) => ({
            prediction,
            road: roads.find((road) => road.id === prediction.road_segment_id) || null
        }))
        .filter((item) => item.road && !orders.some((order) => order.source === 'prediction' && order.source_id === item.prediction.id))
    , [orders, predictions, roads]);

    const complaintCandidates = complaints.filter((complaint) =>
        (complaint.priority === 'high' || complaint.priority === 'critical' || (complaint.urgency_score || 0) >= 4) &&
        !orders.some((order) => order.source === 'complaint' && order.source_id === complaint.id)
    );

    const emergencyCandidates = emergencies.filter((incident) =>
        incident.status !== 'closed' &&
        !orders.some((order) => order.source === 'emergency' && order.source_id === incident.id)
    );

    const stats = useMemo(() => ({
        queued: orders.filter((order) => order.status === 'queued').length,
        active: orders.filter((order) => order.status === 'assigned' || order.status === 'in_progress').length,
        completed: orders.filter((order) => order.status === 'completed').length,
        critical: orders.filter((order) => order.priority === 'critical' && order.status !== 'completed').length
    }), [orders]);

    const persistOrder = async (order: WorkOrder) => {
        const saved = await saveWorkOrderData(order);
        setOrders((current) => current.map((item) => item.id === saved.id ? saved : item));
        return saved;
    };

    const handleAdvanceStatus = async () => {
        if (!selectedOrder) return;
        const next = nextStatus(selectedOrder.status);
        const nextOrder: WorkOrder = {
            ...selectedOrder,
            status: next,
            completed_at: next === 'completed' ? new Date().toISOString() : selectedOrder.completed_at
        };
        try {
            await persistOrder(nextOrder);
            toast.success(`Work order moved to ${next.replace(/_/g, ' ')}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to advance this work order.');
        }
    };

    const handleCreateFromComplaint = async (complaintId: string) => {
        const complaint = complaints.find((item) => item.id === complaintId);
        if (!complaint) return;
        try {
            const result = await createWorkOrderFromComplaintData(complaint);
            await loadData();
            setSelectedId(result.order.id);
            toast.success(result.created ? 'Work order generated from complaint.' : 'Open work order already exists for this complaint.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to generate a work order from this complaint.');
        }
    };

    const handleCreateFromPrediction = async (predictionId: string) => {
        const prediction = predictions.find((item) => item.id === predictionId);
        const road = prediction ? roads.find((item) => item.id === prediction.road_segment_id) : null;
        if (!prediction || !road) return;
        try {
            const result = await createWorkOrderFromPredictionData(road, prediction);
            await loadData();
            setSelectedId(result.order.id);
            toast.success(result.created ? 'Preventive work order generated from prediction.' : 'Open work order already exists for this prediction.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to generate a preventive work order.');
        }
    };

    const handleCreateFromEmergency = async (incidentId: string) => {
        const incident = emergencies.find((item) => item.id === incidentId);
        if (!incident) return;
        try {
            const result = await createWorkOrderFromEmergencyData(incident);
            await loadData();
            setSelectedId(result.order.id);
            toast.success(result.created ? 'Emergency restoration order generated.' : 'Open work order already exists for this emergency.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to generate an emergency restoration order.');
        }
    };

    if (!selectedOrder) {
        return <div className="page-container">No work orders available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Work Order Control Center <Wrench className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Dispatch-ready repair tickets generated from complaints, predictions, and emergency recovery workflows.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">Auto Work Orders</Badge>
                    <Button variant="ghost" onClick={() => navigate('/field')}>
                        Field Console
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/closure-proof')}>
                        Closure Desk
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Queued</div>
                    <div className="text-3xl font-black text-[var(--brand)]">{stats.queued}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Active</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.active}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Completed</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.completed}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Critical</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.critical}</div>
                </Card>
            </div>

            <div className="grid xl:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Dispatch Queue</div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {orders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => setSelectedId(order.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === order.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{order.title}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {order.order_number} · {order.road_name}
                                        </div>
                                    </div>
                                    <Badge variant={statusVariant(order.status)}>{order.status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Badge variant={priorityVariant(order.priority)}>{order.priority}</Badge>
                                    <Badge variant="info">{order.source}</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Work Order</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2 break-words">{selectedOrder.order_number}</h2>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {selectedOrder.road_name} · {selectedOrder.assigned_department}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant={priorityVariant(selectedOrder.priority)}>{selectedOrder.priority}</Badge>
                                <Button onClick={handleAdvanceStatus} disabled={selectedOrder.status === 'completed'}>
                                    Advance Status <ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Crew</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedOrder.assigned_crew}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Due By</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{new Date(selectedOrder.due_by).toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Cost</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">₹{selectedOrder.estimated_cost_inr.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Status</div>
                                <div className="text-sm font-black text-[var(--text-primary)] uppercase">{selectedOrder.status.replace(/_/g, ' ')}</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Bilingual Summary</div>
                                    <div className="space-y-4 text-sm">
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-secondary)] break-words">
                                            {selectedOrder.bilingual_summary.en}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-secondary)] break-words">
                                            {selectedOrder.bilingual_summary.hi}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Workflow Links</div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/complaints')}>
                                            Complaints <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/predictions')}>
                                            Predictions <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/emergency')}>
                                            Emergency Ops <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/closure-proof')}>
                                            Closure Desk <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/field')}>
                                            Field Console <ArrowRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Languages size={16} className="text-[var(--blue)]" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Dispatch Guidance</div>
                                    </div>
                                    <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            Source: {selectedOrder.source} · Source record: {selectedOrder.source_id}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            Ward: {selectedOrder.ward}{selectedOrder.permit_number ? ` · Permit ${selectedOrder.permit_number}` : ''}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            {selectedOrder.completed_at
                                                ? `Completed at ${new Date(selectedOrder.completed_at).toLocaleString()}`
                                                : 'Completion proof pending. Field team should upload closure evidence after execution.'}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            {linkedProof
                                                ? `Closure package ${linkedProof.status.replace(/_/g, ' ')} · ${linkedProof.payout_completion_percent}% payout released`
                                                : 'No closure-proof package linked yet. Route this order to the closure desk after field execution.'}
                                        </div>
                                        {linkedProof && (
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                {linkedMilestones.length} payout milestone{linkedMilestones.length === 1 ? '' : 's'} tracked for this delivery package.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {linkedProof && (
                                    <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <ClipboardCheck size={16} className="text-[var(--green)]" />
                                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Closure Governance</div>
                                        </div>
                                        <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                Proof status: {linkedProof.status.replace(/_/g, ' ')}
                                            </div>
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                Evidence count: {linkedProof.before_count + linkedProof.during_count + linkedProof.after_count} items
                                            </div>
                                        </div>
                                        <Button className="w-full mt-4 justify-between" variant="ghost" onClick={() => navigate('/closure-proof')}>
                                            Open Closure Desk
                                            <ArrowRight size={14} />
                                        </Button>
                                    </div>
                                )}

                                <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                                    <div className="flex items-start gap-3">
                                        <ShieldAlert className="text-[var(--yellow)] shrink-0 mt-0.5" size={18} />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-[var(--text-primary)]">PWD workflow note</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                                High-priority complaints and low-health predictions should now become dispatchable tickets, not just analysis views. This is the bridge from AI insight to field execution.
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-5">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Auto-Generation Opportunities</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-2">
                                    Generate work orders directly from unresolved signal sources.
                                </div>
                            </div>
                            <Badge variant="warning">{complaintCandidates.length + predictionCandidates.length + emergencyCandidates.length} candidates</Badge>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">High-Priority Complaints</div>
                                {complaintCandidates.slice(0, 3).map((complaint) => (
                                    <div key={complaint.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="text-sm font-black text-[var(--text-primary)]">{complaint.ticket_number}</div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{complaint.complaint_text}</div>
                                        <Button className="w-full mt-4" size="sm" onClick={() => handleCreateFromComplaint(complaint.id)}>
                                            <ClipboardList size={14} /> Generate Work Order
                                        </Button>
                                    </div>
                                ))}
                                {complaintCandidates.length === 0 && <div className="text-sm text-[var(--text-muted)]">No open complaint candidates.</div>}
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Predictive Tickets</div>
                                {predictionCandidates.slice(0, 3).map(({ prediction, road }) => (
                                    <div key={prediction.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="text-sm font-black text-[var(--text-primary)]">{road?.name}</div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{prediction.recommendation}</div>
                                        <Button className="w-full mt-4" size="sm" onClick={() => handleCreateFromPrediction(prediction.id)}>
                                            <Sparkles size={14} /> Generate Preventive Ticket
                                        </Button>
                                    </div>
                                ))}
                                {predictionCandidates.length === 0 && <div className="text-sm text-[var(--text-muted)]">No predictive ticket candidates.</div>}
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Emergency Restoration</div>
                                {emergencyCandidates.slice(0, 3).map((incident) => (
                                    <div key={incident.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-[var(--red)]" />
                                            <div className="text-sm font-black text-[var(--text-primary)]">{incident.road_name}</div>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{incident.summary}</div>
                                        <Button className="w-full mt-4" size="sm" onClick={() => handleCreateFromEmergency(incident.id)}>
                                            <CheckCircle2 size={14} /> Generate Restoration Order
                                        </Button>
                                    </div>
                                ))}
                                {emergencyCandidates.length === 0 && <div className="text-sm text-[var(--text-muted)]">No emergency restoration candidates.</div>}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
