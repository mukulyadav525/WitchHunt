import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
import {
    listCitizenCompletionFeedbackData,
    listClosureProofPackagesData,
    listContractorScorecardsData,
    listPaymentMilestonesData,
    listPublicWorksitesData,
    listWorkOrdersData,
    saveClosureProofPackageData,
    saveContractorScorecardData,
    savePaymentMilestoneData,
    savePublicWorksiteData,
    saveWorkOrderData
} from '../../lib/supabaseData';
import type {
    CitizenCompletionFeedback,
    ClosureProofPackage,
    ContractorScorecard,
    PaymentMilestone,
    PublicWorksite,
    WorkOrder
} from '../../types';
import { ArrowRight, Camera, ClipboardCheck, Clock3, IndianRupee, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

type ProofFilter = 'all' | ClosureProofPackage['status'];

function proofVariant(status: ClosureProofPackage['status']) {
    switch (status) {
        case 'paid':
            return 'success';
        case 'approved':
            return 'info';
        case 'ready_for_review':
            return 'warning';
        case 'rejected':
            return 'error';
        default:
            return 'warning';
    }
}

function paymentVariant(status: PaymentMilestone['status']) {
    switch (status) {
        case 'released':
            return 'success';
        case 'verified':
            return 'info';
        default:
            return 'warning';
    }
}

function appendUpdate(worksite: PublicWorksite, label: string, note: string) {
    if (worksite.updates.some((item) => item.label === label)) {
        return worksite.updates;
    }

    return [
        ...worksite.updates,
        {
            label,
            date: new Date().toISOString(),
            done: true,
            note
        }
    ];
}

export function ClosureProofCenter() {
    const navigate = useNavigate();
    const [packages, setPackages] = useState<ClosureProofPackage[]>([]);
    const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [contractors, setContractors] = useState<ContractorScorecard[]>([]);
    const [feedback, setFeedback] = useState<CitizenCompletionFeedback[]>([]);
    const [filter, setFilter] = useState<ProofFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState('');

    const refreshState = async () => {
        const [nextPackages, nextMilestones, nextWorksites, nextOrders, nextContractors, nextFeedback] = await Promise.all([
            listClosureProofPackagesData(),
            listPaymentMilestonesData(),
            listPublicWorksitesData(),
            listWorkOrdersData(),
            listContractorScorecardsData(),
            listCitizenCompletionFeedbackData()
        ]);
        setPackages(nextPackages);
        setMilestones(nextMilestones);
        setWorksites(nextWorksites);
        setOrders(nextOrders);
        setContractors(nextContractors);
        setFeedback(nextFeedback);
        setSelectedId((current) => current || nextPackages[0]?.id || '');
    };

    useEffect(() => {
        void refreshState();
    }, []);

    const filteredPackages = useMemo(() => packages.filter((record) => {
        const matchesFilter = filter === 'all' || record.status === filter;
        const haystack = `${record.road_name} ${record.contractor} ${record.permit_number} ${record.ward}`.toLowerCase();
        return matchesFilter && haystack.includes(searchQuery.toLowerCase());
    }), [filter, packages, searchQuery]);

    const selectedPackage = filteredPackages.find((record) => record.id === selectedId)
        || packages.find((record) => record.id === selectedId)
        || filteredPackages[0]
        || packages[0]
        || null;

    const relatedWorksite = selectedPackage
        ? worksites.find((item) => item.id === selectedPackage.worksite_id || item.permit_number === selectedPackage.permit_number) || null
        : null;
    const relatedOrder = selectedPackage?.work_order_id
        ? orders.find((item) => item.id === selectedPackage.work_order_id) || null
        : orders.find((item) => item.permit_number === selectedPackage?.permit_number) || null;
    const relatedContractor = selectedPackage
        ? contractors.find((item) => item.contractor === selectedPackage.contractor) || null
        : null;
    const packageMilestones = selectedPackage
        ? milestones.filter((item) => item.closure_proof_id === selectedPackage.id)
        : [];
    const packageFeedback = selectedPackage
        ? feedback.filter((item) => item.permit_number === selectedPackage.permit_number)
        : [];

    const stats = useMemo(() => ({
        reviewQueue: packages.filter((record) => record.status === 'ready_for_review').length,
        paymentLocked: milestones.filter((item) => item.status !== 'released').length,
        citizenVoices: feedback.length,
        releasedAmount: milestones
            .filter((item) => item.status === 'released')
            .reduce((sum, item) => sum + item.amount_inr, 0)
    }), [feedback.length, milestones, packages]);

    const syncPackageFinancials = async (packageId: string) => {
        const [freshPackages, freshMilestones, freshWorksites] = await Promise.all([
            listClosureProofPackagesData(),
            listPaymentMilestonesData(),
            listPublicWorksitesData()
        ]);
        const proofRecord = freshPackages.find((item) => item.id === packageId);
        if (!proofRecord) return;

        const proofMilestones = freshMilestones.filter((item) => item.closure_proof_id === packageId);
        const totalAmount = proofMilestones.reduce((sum, item) => sum + item.amount_inr, 0);
        const releasedAmount = proofMilestones
            .filter((item) => item.status === 'released')
            .reduce((sum, item) => sum + item.amount_inr, 0);
        const nextPayoutPercent = totalAmount ? Math.round((releasedAmount / totalAmount) * 100) : proofRecord.payout_completion_percent;
        const allReleased = proofMilestones.length > 0 && proofMilestones.every((item) => item.status === 'released');
        const nextStatus = proofRecord.status === 'approved' && allReleased ? 'paid' : proofRecord.status;

        await saveClosureProofPackageData({
            ...proofRecord,
            payout_completion_percent: nextPayoutPercent,
            status: nextStatus,
            payment_hold_reason: nextStatus === 'paid'
                ? null
                : proofMilestones.some((item) => item.status !== 'released')
                    ? 'Finance release is still pending on one or more payout milestones.'
                    : proofRecord.payment_hold_reason,
            updated_at: new Date().toISOString()
        });

        const worksite = freshWorksites.find((item) => item.id === proofRecord.worksite_id || item.permit_number === proofRecord.permit_number);
        if (worksite && nextStatus === 'paid') {
            await savePublicWorksiteData({
                ...worksite,
                archive_ready: true,
                progress_percent: 100,
                status: 'completed',
                updates: appendUpdate(worksite, 'Contractor payout released', 'All payout milestones have been released after closure-proof approval.')
            });
        }

        await refreshState();
    };

    const handleAddAfterEvidence = () => {
        if (!selectedPackage || !relatedWorksite) return;
        if ((relatedWorksite.photo_timeline || []).some((item) => item.stage === 'after')) {
            toast.error('After-stage proof is already recorded for this package.');
            return;
        }

        void (async () => {
            await savePublicWorksiteData({
                ...relatedWorksite,
                status: 'completed',
                progress_percent: 100,
                photo_timeline: [
                    ...(relatedWorksite.photo_timeline || []),
                    {
                        id: `${selectedPackage.id}-after-${Date.now()}`,
                        stage: 'after',
                        captured_at: new Date().toISOString(),
                        uploaded_by: 'Ward Engineer Desk',
                        note: 'Final reinstatement photo uploaded from the closure-proof desk.',
                        photo_url: '',
                        utility_depth_found_m: 1.2,
                        geo_tag: relatedWorksite.location || null
                    }
                ],
                updates: appendUpdate(relatedWorksite, 'After-stage proof uploaded', 'Final reinstatement photo and geo-tag were appended from the closure-proof desk.')
            });

            await saveClosureProofPackageData({
                ...selectedPackage,
                after_count: selectedPackage.after_count + 1,
                utility_depth_verified: true,
                geo_tag_coverage_percent: Math.min(100, selectedPackage.geo_tag_coverage_percent + 12),
                surface_reinstatement_score: Math.max(selectedPackage.surface_reinstatement_score, 84),
                payment_hold_reason: 'Final proof captured. Awaiting engineer sign-off.',
                updated_at: new Date().toISOString()
            });

            await refreshState();
            toast.success('Final after-stage evidence added to the proof package.');
        })();
    };

    const handleAdvanceProof = () => {
        if (!selectedPackage) return;

        if (selectedPackage.status === 'collecting') {
            void (async () => {
                await saveClosureProofPackageData({
                    ...selectedPackage,
                    status: 'ready_for_review',
                    payment_hold_reason: selectedPackage.after_count > 0
                        ? 'Proof bundle is ready for engineer review.'
                        : 'Final after-stage proof is still pending before approval.',
                    updated_at: new Date().toISOString()
                });
                await refreshState();
                toast.success('Proof package moved to the review queue.');
            })();
            return;
        }

        if (selectedPackage.status === 'ready_for_review') {
            if (selectedPackage.after_count < 1 || !selectedPackage.utility_depth_verified) {
                toast.error('Add final after-stage proof and utility depth verification before approval.');
                return;
            }

            void (async () => {
                await saveClosureProofPackageData({
                    ...selectedPackage,
                    status: 'approved',
                    engineer_sign_off: 'Ward Engineer Desk',
                    payment_hold_reason: 'Proof approved. Finance release is pending on the remaining milestones.',
                    updated_at: new Date().toISOString()
                });

                if (relatedWorksite) {
                    await savePublicWorksiteData({
                        ...relatedWorksite,
                        status: 'completed',
                        progress_percent: 100,
                        archive_ready: true,
                        updates: appendUpdate(relatedWorksite, 'Closure proof approved', 'Engineer sign-off recorded and the package is now ready for finance release.')
                    });
                }

                if (relatedOrder && relatedOrder.status !== 'completed') {
                    await saveWorkOrderData({
                        ...relatedOrder,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    });
                }

                if (relatedContractor) {
                    await saveContractorScorecardData({
                        ...relatedContractor,
                        closure_evidence_rate_percent: Math.min(100, relatedContractor.closure_evidence_rate_percent + 4),
                        last_audit_at: new Date().toISOString()
                    });
                }

                await syncPackageFinancials(selectedPackage.id);
                toast.success('Closure proof approved and linked execution records updated.');
            })();
            return;
        }

        if (selectedPackage.status === 'approved') {
            if (packageMilestones.some((item) => item.status !== 'released')) {
                toast.error('Release all remaining payout milestones before closing this package as paid.');
                return;
            }
            void (async () => {
                await syncPackageFinancials(selectedPackage.id);
                toast.success('Proof package is now marked fully paid.');
            })();
            return;
        }
    };

    const handleAdvanceMilestone = (milestone: PaymentMilestone) => {
        if (milestone.status === 'released') {
            toast.error('This payout milestone is already released.');
            return;
        }

        const nextStatus: PaymentMilestone['status'] = milestone.status === 'pending' ? 'verified' : 'released';
        void (async () => {
            await savePaymentMilestoneData({
                ...milestone,
                status: nextStatus,
                released_at: nextStatus === 'released' ? new Date().toISOString() : milestone.released_at
            });

            await refreshState();
            await syncPackageFinancials(milestone.closure_proof_id);
            toast.success(nextStatus === 'released' ? 'Payout milestone released.' : 'Payout milestone verified.');
        })();
    };

    if (!selectedPackage) {
        return <div className="page-container">No closure-proof packages available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Closure Proof & Payment Desk <ClipboardCheck className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Verify before-during-after evidence, close field packages, and release contractor payouts without breaking public transparency.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">Completion Governance</Badge>
                    <Button variant="ghost" onClick={() => navigate('/contractors')}>
                        Contractor Hub
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Review Queue</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">{stats.reviewQueue}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Payment Locked</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.paymentLocked}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Citizen Feedback</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.citizenVoices}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Released Amount</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">₹{stats.releasedAmount.toLocaleString()}</div>
                </Card>
            </div>

            <div className="grid xl:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Proof Packages</div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <Input
                                className="pl-9"
                                placeholder="Search permit, road, contractor..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(['all', 'collecting', 'ready_for_review', 'approved', 'paid'] as ProofFilter[]).map((status) => (
                                <Button
                                    key={status}
                                    size="sm"
                                    variant={filter === status ? 'primary' : 'ghost'}
                                    onClick={() => setFilter(status)}
                                >
                                    {status.replace(/_/g, ' ')}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filteredPackages.map((record) => (
                            <button
                                key={record.id}
                                type="button"
                                onClick={() => setSelectedId(record.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === record.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{record.road_name}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {record.permit_number} · {record.contractor}
                                        </div>
                                    </div>
                                    <Badge variant={proofVariant(record.status)}>{record.status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Badge variant="info">{record.before_count + record.during_count + record.after_count} proof items</Badge>
                                    <Badge variant="success">{record.payout_completion_percent}% paid</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Package</div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] break-words">{selectedPackage.permit_number}</h2>
                                    <Badge variant={proofVariant(selectedPackage.status)}>{selectedPackage.status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {selectedPackage.road_name} · {selectedPackage.ward} · {selectedPackage.contractor}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                {selectedPackage.after_count === 0 && (
                                    <Button variant="ghost" onClick={handleAddAfterEvidence}>
                                        <Camera size={14} /> Add Final Evidence
                                    </Button>
                                )}
                                <Button onClick={handleAdvanceProof} disabled={selectedPackage.status === 'paid' || selectedPackage.status === 'rejected'}>
                                    Advance Package <ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Camera size={12} /> Proof Count
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedPackage.before_count}/{selectedPackage.during_count}/{selectedPackage.after_count}</div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-1">before / during / after</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <ShieldCheck size={12} /> Geo-tag Coverage
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedPackage.geo_tag_coverage_percent}%</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <ClipboardCheck size={12} /> Surface Score
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedPackage.surface_reinstatement_score}/100</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <IndianRupee size={12} /> Payout
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedPackage.payout_completion_percent}% released</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Evidence Summary</div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Utility depth verified</span><span className="metric-value">{selectedPackage.utility_depth_verified ? 'Yes' : 'No'}</span></div>
                                        <div className="metric-row"><span className="metric-label">Engineer sign-off</span><span className="metric-value">{selectedPackage.engineer_sign_off || 'Pending'}</span></div>
                                        <div className="metric-row"><span className="metric-label">Last update</span><span className="metric-value">{new Date(selectedPackage.updated_at).toLocaleString()}</span></div>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed break-words">
                                        {selectedPackage.proof_notes}
                                    </div>
                                    {selectedPackage.payment_hold_reason && (
                                        <div className="mt-4 rounded-xl border border-[var(--yellow-border)] bg-[var(--yellow-bg)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                                            {selectedPackage.payment_hold_reason}
                                        </div>
                                    )}
                                </div>

                                {relatedWorksite && (
                                    <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Linked Worksite</div>
                                        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                            <div className="metric-row"><span className="metric-label">Public status</span><span className="metric-value">{relatedWorksite.status}</span></div>
                                            <div className="metric-row"><span className="metric-label">Archive ready</span><span className="metric-value">{relatedWorksite.archive_ready ? 'Yes' : 'No'}</span></div>
                                            <div className="metric-row"><span className="metric-label">Citizen rating</span><span className="metric-value">{(relatedWorksite.citizen_rating || 0).toFixed(1)}/5</span></div>
                                        </div>
                                        <div className="grid sm:grid-cols-2 gap-3 mt-4">
                                            <Button variant="ghost" className="justify-between" onClick={() => navigate(`/track/${relatedWorksite.permit_number}`)}>
                                                Public Tracker <ArrowRight size={14} />
                                            </Button>
                                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/works')}>
                                                Public Works Portal <ArrowRight size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Linked Delivery Context</div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Contractor grade</span><span className="metric-value">{relatedContractor?.public_grade || 'N/A'}</span></div>
                                        <div className="metric-row"><span className="metric-label">Closure compliance</span><span className="metric-value">{relatedContractor?.closure_evidence_rate_percent || 0}%</span></div>
                                        <div className="metric-row"><span className="metric-label">Linked order</span><span className="metric-value">{relatedOrder?.order_number || 'Not linked'}</span></div>
                                        <div className="metric-row"><span className="metric-label">Work order status</span><span className="metric-value">{relatedOrder?.status || 'N/A'}</span></div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/work-orders')}>
                                            Work Orders <ArrowRight size={14} />
                                        </Button>
                                        <Button variant="ghost" className="justify-between" onClick={() => navigate('/contractors')}>
                                            Contractor Hub <ArrowRight size={14} />
                                        </Button>
                                    </div>
                                </div>

                                <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                                    <div className="flex items-start gap-3">
                                        <Clock3 className="text-[var(--blue)] shrink-0 mt-0.5" size={18} />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-[var(--text-primary)]">Closure governance note</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                                This desk enforces the PRD rule that permits should not quietly disappear after work finishes. Every package now has proof, finance state, and public feedback attached to it.
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </Card>

                    <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-8">
                        <Card className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Payment Milestones</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2">
                                        Verification and release controls for the selected proof package.
                                    </div>
                                </div>
                                <Badge variant="info">{packageMilestones.length} milestones</Badge>
                            </div>

                            <div className="space-y-4">
                                {packageMilestones.map((milestone) => (
                                    <div key={milestone.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-[var(--text-primary)] break-words">{milestone.label}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                                    Due {new Date(milestone.due_on).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <Badge variant={paymentVariant(milestone.status)}>{milestone.status}</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{milestone.note}</div>
                                        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-sm font-black text-[var(--text-primary)]">₹{milestone.amount_inr.toLocaleString()}</div>
                                            <Button size="sm" variant={milestone.status === 'released' ? 'ghost' : 'primary'} onClick={() => handleAdvanceMilestone(milestone)}>
                                                {milestone.status === 'pending' ? 'Verify' : milestone.status === 'verified' ? 'Release' : 'Released'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Citizen Completion Feedback</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2">
                                        Public ratings and comments linked directly to the same permit record.
                                    </div>
                                </div>
                                <Badge variant="success">{packageFeedback.length} responses</Badge>
                            </div>

                            <div className="space-y-4">
                                {packageFeedback.length > 0 ? packageFeedback.slice(0, 4).map((entry) => (
                                    <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="text-sm font-black text-[var(--text-primary)]">{entry.citizen_name}</div>
                                            <Badge variant={entry.rating >= 4 ? 'success' : 'warning'}>{entry.rating}/5</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{entry.feedback}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-3 flex items-center gap-2">
                                            <MessageSquare size={12} /> {new Date(entry.submitted_at).toLocaleString()}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-muted)]">
                                        No public completion feedback has been recorded for this permit yet.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
