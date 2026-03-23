import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card, Button, Input, Badge } from '../../components/ui';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Search, MapPin, Clock, CheckCircle, Shield, AlertTriangle, ArrowLeft, QrCode, HardHat, ImageOff, IndianRupee, Route, Phone, ShieldCheck, Camera } from 'lucide-react';
import {
    CitizenCompletionFeedback,
    ClosureProofPackage,
    Complaint,
    ContractorScorecard,
    DelayRiskAssessment,
    PaymentMilestone,
    PublicVerificationEvent,
    PublicWorksite,
    TrafficAdvisory,
    WorkOrder
} from '../../types';
import {
    findComplaintByTicketData,
    findPublicWorksiteByPermitData,
    listCitizenCompletionFeedbackData,
    listClosureProofPackagesData,
    listContractorScorecardsData,
    listDelayRiskAssessmentsData,
    listPaymentMilestonesData,
    listPublicVerificationEventsData,
    listTrafficAdvisoriesData,
    listWorkOrdersData,
    recordPublicVerificationEventData
} from '../../lib/supabaseData';
import { cn } from '../../lib/utils';

export function PublicTracker() {
    const { ticket } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState(ticket || '');
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [worksite, setWorksite] = useState<PublicWorksite | null>(null);
    const [relatedWorkOrders, setRelatedWorkOrders] = useState<WorkOrder[]>([]);
    const [relatedTraffic, setRelatedTraffic] = useState<TrafficAdvisory | null>(null);
    const [relatedDelayRisk, setRelatedDelayRisk] = useState<DelayRiskAssessment | null>(null);
    const [contractorScore, setContractorScore] = useState<ContractorScorecard | null>(null);
    const [relatedProof, setRelatedProof] = useState<ClosureProofPackage | null>(null);
    const [relatedMilestones, setRelatedMilestones] = useState<PaymentMilestone[]>([]);
    const [relatedFeedback, setRelatedFeedback] = useState<CitizenCompletionFeedback[]>([]);
    const [relatedVerifications, setRelatedVerifications] = useState<PublicVerificationEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecord = async (identifier: string) => {
        const normalized = identifier.trim().toUpperCase();
        if (!normalized) {
            setError('Enter a ticket or permit ID to continue.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setComplaint(null);
        setWorksite(null);
        setRelatedWorkOrders([]);
        setRelatedTraffic(null);
        setRelatedDelayRisk(null);
        setContractorScore(null);
        setRelatedProof(null);
        setRelatedMilestones([]);
        setRelatedFeedback([]);
        setRelatedVerifications([]);

        try {
            if (normalized.startsWith('CMP-')) {
                const complaintRecord = await findComplaintByTicketData(normalized);
                if (!complaintRecord) throw new Error('NOT_FOUND');
                setComplaint(complaintRecord);
            } else {
                const worksiteRecord = await findPublicWorksiteByPermitData(normalized);
                if (!worksiteRecord) throw new Error('NOT_FOUND');
                const [
                    workOrders,
                    traffic,
                    delayRisks,
                    contractorScores,
                    proofs,
                    milestones,
                    feedback,
                    verifications
                ] = await Promise.all([
                    listWorkOrdersData(),
                    listTrafficAdvisoriesData(),
                    listDelayRiskAssessmentsData(),
                    listContractorScorecardsData(),
                    listClosureProofPackagesData(),
                    listPaymentMilestonesData(),
                    listCitizenCompletionFeedbackData(),
                    listPublicVerificationEventsData()
                ]);

                const insertedVerification = await recordPublicVerificationEventData({
                    permit_number: worksiteRecord.permit_number,
                    road_name: worksiteRecord.road_name,
                    ward: worksiteRecord.ward || 'Ward not tagged',
                    source: 'tracker_search',
                    outcome: 'verified'
                });

                const proof = proofs.find((item) => item.permit_number === worksiteRecord.permit_number || item.worksite_id === worksiteRecord.id) || null;
                setWorksite(worksiteRecord);
                setRelatedWorkOrders(workOrders.filter((order) => order.permit_number === worksiteRecord.permit_number || order.road_name === worksiteRecord.road_name));
                setRelatedTraffic(traffic.find((item) => item.permit_number === worksiteRecord.permit_number || item.road_name === worksiteRecord.road_name) || null);
                setRelatedDelayRisk(delayRisks.find((item) => item.permit_number === worksiteRecord.permit_number) || null);
                setContractorScore(contractorScores.find((item) => item.contractor === worksiteRecord.contractor) || null);
                setRelatedProof(proof);
                setRelatedMilestones(proof ? milestones.filter((item) => item.closure_proof_id === proof.id) : []);
                setRelatedFeedback(feedback.filter((item) => item.permit_number === worksiteRecord.permit_number));

                setRelatedVerifications(
                    [
                        ...verifications.filter((item) => item.permit_number === worksiteRecord.permit_number),
                        insertedVerification
                    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                );
            }
        } catch {
            setError('Record not found. Please verify the ticket or permit ID.');
        } finally {
            setIsLoading(false);
        }
    };

    const triggerSearch = () => {
        const normalized = searchQuery.trim().toUpperCase();
        if (!normalized) return;
        navigate(`/track/${normalized}`);
    };

    useEffect(() => {
        if (ticket) {
            setSearchQuery(ticket.toUpperCase());
            void fetchRecord(ticket);
        }
    }, [ticket]);

    return (
        <div className="min-h-screen bg-[var(--bg-base)] px-4 py-6 sm:p-6 flex flex-col items-center">
            <div className="w-full max-w-4xl flex items-center justify-between mb-8 sm:mb-12 gap-4 flex-wrap">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <Shield className="text-[var(--blue)]" size={24} />
                    <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">RoadTwin <span className="text-[var(--blue)]">Pulse</span></span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <ThemeToggle size="sm" />
                    <Button variant="ghost" onClick={() => navigate('/')} className="text-[var(--text-muted)]">
                        <ArrowLeft size={16} /> Exit Tracker
                    </Button>
                </div>
            </div>

            <div className="w-full max-w-4xl space-y-8">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="text-[var(--text-muted)] group-focus-within:text-[var(--blue)] transition-colors" size={20} />
                    </div>
                    <Input
                        className="pl-12 pr-4 sm:pr-32 h-14 sm:h-16 bg-[var(--bg-panel)] border-[var(--border)] text-sm sm:text-lg font-bold tracking-[0.18em] sm:tracking-widest text-[var(--blue)] placeholder:text-[var(--text-disabled)]"
                        placeholder="ENTER CMP-2026-1042 OR PERMIT-7A1C9E20"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value.toUpperCase())}
                        onKeyDown={(event) => event.key === 'Enter' && triggerSearch()}
                    />
                    <Button
                        onClick={triggerSearch}
                        className="mt-3 w-full sm:w-auto sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 h-10 px-6"
                    >
                        TRACK
                    </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/60">
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Public Complaint</div>
                        <div className="text-xs text-[var(--text-secondary)]">Example: <span className="text-[var(--blue)] font-black">CMP-2026-1042</span></div>
                    </Card>
                    <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/60">
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">QR Worksite</div>
                        <div className="text-xs text-[var(--text-secondary)]">Example: <span className="text-[var(--blue)] font-black">PERMIT-7A1C9E20</span></div>
                    </Card>
                    <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/60">
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">What You See</div>
                        <div className="text-xs text-[var(--text-secondary)]">Status, timeline, contact, budget, detour, and QR verification.</div>
                    </Card>
                </div>

                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="spinner w-8 h-8" />
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Searching civic records...</span>
                    </div>
                )}

                {error && (
                    <div className="p-8 rounded-xl bg-red-600/5 border border-[var(--red-border)] text-center space-y-2">
                        <AlertTriangle className="mx-auto text-[var(--red)]" size={24} />
                        <p className="text-sm font-bold text-[var(--red)]">{error}</p>
                    </div>
                )}

                {complaint && !isLoading && (
                    <Card className="bg-[var(--bg-hover)] border-[var(--border)] backdrop-blur-xl overflow-hidden leading-none">
                        <div className="p-8 border-b border-[var(--border)] flex justify-between items-start gap-4 flex-wrap">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Citizen Signal Record</span>
                                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-[0.16em] sm:tracking-widest">{complaint.ticket_number}</h2>
                            </div>
                            <StatusBadge
                                status={complaint.status}
                                variant={complaint.status === 'resolved' ? 'success' : complaint.status === 'in_progress' ? 'warning' : 'orange'}
                                className="h-8 px-4 text-xs"
                            />
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> Submission Time
                                    </label>
                                    <p className="text-xs font-bold text-[var(--text-secondary)]">
                                        {new Date(complaint.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Location
                                    </label>
                                    <p className="text-xs font-bold text-[var(--text-secondary)]">
                                        {complaint.road_name || 'Citizen-submitted location'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Signal Category</label>
                                    <p className="text-xs font-bold text-[var(--blue)] uppercase tracking-widest">{complaint.defect_type || 'General Infra Anomaly'}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Citizen Narrative</label>
                                    <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium italic">
                                        "{complaint.complaint_text}"
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Workflow Stage</label>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { label: 'Signal Received', done: true },
                                            { label: 'AI Triage Complete', done: true },
                                            { label: 'Assigned to Department', done: complaint.status !== 'open' },
                                            { label: 'Resolution Confirmed', done: complaint.status === 'resolved' }
                                        ].map((step, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className={cn(
                                                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                                    step.done ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : 'border-[var(--border)]'
                                                )}>
                                                    {step.done && <CheckCircle size={10} className="text-[var(--green)]" />}
                                                </div>
                                                <span className={cn('text-[10px] font-bold uppercase tracking-widest', step.done ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]')}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-hover)] border-t border-[var(--border)] text-center">
                            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em]">Secure civic tracking channel</span>
                        </div>
                    </Card>
                )}

                {worksite && !isLoading && (
                    <Card className="bg-[var(--bg-hover)] border-[var(--border)] backdrop-blur-xl overflow-hidden leading-none">
                        <div className="p-8 border-b border-[var(--border)] flex justify-between items-start gap-4 flex-wrap">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Public Worksite Record</span>
                                    {worksite.qr_verified && (
                                        <Badge className="bg-[var(--green-bg)] text-[var(--green)] border-none">
                                            <ShieldCheck size={12} className="mr-1" /> QR Verified
                                        </Badge>
                                    )}
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-[0.16em] sm:tracking-widest">{worksite.permit_number}</h2>
                            </div>
                            <Badge variant={worksite.status === 'completed' ? 'success' : worksite.status === 'delayed' ? 'error' : 'warning'} className="h-8 px-4 text-xs uppercase">
                                {worksite.status}
                            </Badge>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid md:grid-cols-4 gap-4">
                                <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/70">
                                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Road</div>
                                    <div className="text-sm font-black text-[var(--text-primary)]">{worksite.road_name}</div>
                                </Card>
                                <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/70">
                                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Progress</div>
                                    <div className="text-sm font-black text-[var(--blue)]">{worksite.progress_percent}%</div>
                                </Card>
                                <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/70">
                                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Budget</div>
                                    <div className="text-sm font-black text-[var(--text-primary)]">₹{worksite.budget_inr.toLocaleString()}</div>
                                </Card>
                                <Card className="p-4 border-[var(--border)] bg-[var(--bg-panel)]/70">
                                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Impact Score</div>
                                    <div className="text-sm font-black text-[var(--yellow)]">{worksite.traffic_impact_score}/100</div>
                                </Card>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                            <HardHat size={12} /> Work Details
                                        </div>
                                        <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Purpose</span><br />{worksite.purpose}</div>
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Department</span><br />{worksite.department}</div>
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Contractor</span><br />{worksite.contractor}</div>
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Completion Target</span><br />{new Date(worksite.estimated_completion).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                            <Route size={12} /> Detour Guidance
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{worksite.detour}</p>
                                    </div>

                                    {relatedTraffic && (
                                        <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                                <Route size={12} /> Traffic Advisory
                                            </div>
                                            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Disruption Score</span><br />{relatedTraffic.disruption_score}/100</div>
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Estimated Delay</span><br />{relatedTraffic.estimated_delay_minutes} minutes</div>
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Recommended Window</span><br />{relatedTraffic.recommended_window}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                            <QrCode size={12} /> Verification
                                        </div>
                                        <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Blockchain Hash</span><br />{worksite.blockchain_hash}</div>
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Delay Risk</span><br />{Math.round(worksite.delay_probability * 100)}%</div>
                                            {worksite.delay_reason && (
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Delay Reason</span><br />{worksite.delay_reason}</div>
                                            )}
                                            {relatedDelayRisk && (
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Required Sign-Off</span><br />{relatedDelayRisk.required_sign_off.replace(/_/g, ' ')}</div>
                                            )}
                                            <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Public Verifications</span><br />{relatedVerifications.length} lookup{relatedVerifications.length === 1 ? '' : 's'}</div>
                                        </div>
                                    </div>

                                    {relatedProof && (
                                        <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                                <Camera size={12} /> Closure Proof
                                            </div>
                                            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Proof Status</span><br />{relatedProof.status.replace(/_/g, ' ')}</div>
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Payout Release</span><br />{relatedProof.payout_completion_percent}% · {relatedMilestones.filter((item) => item.status === 'released').length}/{relatedMilestones.length} milestones</div>
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Citizen Feedback</span><br />{relatedFeedback.length} response{relatedFeedback.length === 1 ? '' : 's'}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                            <Phone size={12} /> Site Contact
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {worksite.contact_name}<br />{worksite.contact_phone}
                                        </div>
                                    </div>

                                    {contractorScore && (
                                        <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                                <HardHat size={12} /> Contractor Score
                                            </div>
                                            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Public Grade</span><br />{contractorScore.public_grade}</div>
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Citizen Rating</span><br />{contractorScore.citizen_rating.toFixed(1)}/5</div>
                                                <div><span className="text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">Coordination Score</span><br />{contractorScore.coordination_score}/100</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {relatedWorkOrders.length > 0 && (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Linked Work Orders</div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {relatedWorkOrders.slice(0, 4).map((order) => (
                                            <div key={order.id} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">{order.order_number}</div>
                                                    <Badge variant={order.status === 'completed' ? 'success' : order.status === 'in_progress' ? 'warning' : 'info'}>
                                                        {order.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)]">{order.title}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                                    {order.assigned_crew} · due {new Date(order.due_by).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {worksite.photo_timeline && worksite.photo_timeline.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                            <Camera size={12} /> Photo Timeline
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {worksite.photo_timeline.map((item) => (
                                                <div key={item.id} className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-panel)]">
                                                    {item.photo_url ? (
                                                        <img src={item.photo_url} alt={item.stage} className="w-full h-36 object-cover" />
                                                    ) : (
                                                        <div className="w-full h-36 bg-[var(--bg-hover)] border-b border-[var(--border)] flex items-center justify-center gap-2 text-[var(--text-muted)]">
                                                            <ImageOff size={16} />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Photo pending upload</span>
                                                        </div>
                                                    )}
                                                    <div className="p-4 space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <Badge variant={item.stage === 'after' ? 'success' : item.stage === 'during' ? 'warning' : 'info'}>
                                                                {item.stage}
                                                            </Badge>
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                                                {new Date(item.captured_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-[var(--text-secondary)]">{item.note}</div>
                                                        {item.utility_depth_found_m != null && (
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--blue)]">
                                                                Utility depth found {item.utility_depth_found_m}m
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Timeline</div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {worksite.updates.map((update, index) => (
                                        <div key={index} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] flex gap-3">
                                            <div className={cn(
                                                'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                                                update.done ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : 'border-[var(--border)]'
                                            )}>
                                                {update.done && <CheckCircle size={12} className="text-[var(--green)]" />}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">{update.label}</div>
                                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{new Date(update.date).toLocaleString()}</div>
                                                {update.note && <div className="text-[11px] text-[var(--text-secondary)]">{update.note}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-hover)] border-t border-[var(--border)] text-center flex items-center justify-center gap-2">
                            <IndianRupee size={12} className="text-[var(--text-muted)]" />
                            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em]">Public transparency feed</span>
                        </div>
                    </Card>
                )}

                {!complaint && !worksite && !isLoading && !error && (
                    <div className="text-center p-20 opacity-30">
                        <Shield size={64} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting record lookup</p>
                    </div>
                )}
            </div>
        </div>
    );
}
