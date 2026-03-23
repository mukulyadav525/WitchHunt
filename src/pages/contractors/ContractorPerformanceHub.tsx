import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Input } from '../../components/ui';
import {
    listClosureProofPackagesData,
    listContractorScorecardsData,
    listPaymentMilestonesData,
    listPublicWorksitesData,
    saveContractorScorecardData
} from '../../lib/supabaseData';
import type { ClosureProofPackage, ContractorScorecard, PaymentMilestone, PublicWorksite } from '../../types';
import { AlertTriangle, ArrowRight, ClipboardCheck, HardHat, Search, ShieldCheck, Star, TimerReset, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

type GradeFilter = 'all' | 'A' | 'B' | 'C' | 'D' | 'watchlist';

function gradeVariant(grade: ContractorScorecard['public_grade']) {
    switch (grade) {
        case 'A':
            return 'success';
        case 'B':
            return 'info';
        case 'C':
            return 'warning';
        default:
            return 'error';
    }
}

export function ContractorPerformanceHub() {
    const navigate = useNavigate();
    const [scorecards, setScorecards] = useState<ContractorScorecard[]>([]);
    const [proofs, setProofs] = useState<ClosureProofPackage[]>([]);
    const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const [nextScorecards, nextProofs, nextMilestones, nextWorksites] = await Promise.all([
                listContractorScorecardsData(),
                listClosureProofPackagesData(),
                listPaymentMilestonesData(),
                listPublicWorksitesData()
            ]);
            setScorecards(nextScorecards);
            setProofs(nextProofs);
            setMilestones(nextMilestones);
            setWorksites(nextWorksites);
            setSelectedId((current) => current || nextScorecards[0]?.id || '');
        };

        void loadData();
    }, []);

    const filteredScorecards = useMemo(() => scorecards.filter((scorecard) => {
        const haystack = `${scorecard.contractor} ${scorecard.public_grade} ${scorecard.risk_note}`.toLowerCase();
        const matchesSearch = haystack.includes(searchQuery.toLowerCase());
        const matchesGrade = gradeFilter === 'all'
            ? true
            : gradeFilter === 'watchlist'
                ? scorecard.watchlist
                : scorecard.public_grade === gradeFilter;
        return matchesSearch && matchesGrade;
    }), [gradeFilter, scorecards, searchQuery]);

    const selectedScorecard = filteredScorecards.find((scorecard) => scorecard.id === selectedId)
        || scorecards.find((scorecard) => scorecard.id === selectedId)
        || filteredScorecards[0]
        || scorecards[0]
        || null;

    const stats = useMemo(() => ({
        watchlist: scorecards.filter((scorecard) => scorecard.watchlist).length,
        avgOnTime: scorecards.length
            ? Math.round(scorecards.reduce((sum, scorecard) => sum + scorecard.on_time_rate_percent, 0) / scorecards.length)
            : 0,
        avgRating: scorecards.length
            ? (scorecards.reduce((sum, scorecard) => sum + scorecard.citizen_rating, 0) / scorecards.length).toFixed(1)
            : '0.0',
        avgEvidence: scorecards.length
            ? Math.round(scorecards.reduce((sum, scorecard) => sum + scorecard.closure_evidence_rate_percent, 0) / scorecards.length)
            : 0
    }), [scorecards]);

    const handleToggleWatchlist = () => {
        if (!selectedScorecard) return;
        const nextScorecard: ContractorScorecard = {
            ...selectedScorecard,
            watchlist: !selectedScorecard.watchlist
        };
        void (async () => {
            const saved = await saveContractorScorecardData(nextScorecard);
            setScorecards((current) => current.map((item) => item.id === saved.id ? saved : item));
            toast.success(`${saved.contractor} ${saved.watchlist ? 'added to' : 'removed from'} watchlist.`);
        })();
    };

    if (!selectedScorecard) {
        return <div className="page-container">No contractor scorecards available.</div>;
    }

    const linkedWorksites = worksites.filter((worksite) => worksite.contractor === selectedScorecard.contractor);
    const linkedProofs = proofs.filter((record) => record.contractor === selectedScorecard.contractor);
    const linkedMilestones = milestones.filter((milestone) => linkedProofs.some((record) => record.id === milestone.closure_proof_id));
    const releasedAmount = linkedMilestones
        .filter((milestone) => milestone.status === 'released')
        .reduce((sum, milestone) => sum + milestone.amount_inr, 0);
    const lockedMilestones = linkedMilestones.filter((milestone) => milestone.status !== 'released').length;

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Contractor Performance Hub <HardHat className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Public-grade accountability for delivery quality, closure evidence, coordination, and repeat-dig risk.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">Roadmap Accountability Layer</Badge>
                    <Button variant="ghost" onClick={() => navigate('/works')}>
                        Public Works Portal
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/closure-proof')}>
                        Closure Desk
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Watchlist</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.watchlist}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">On-Time Avg</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.avgOnTime}%</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Citizen Rating</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.avgRating}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Evidence Compliance</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{stats.avgEvidence}%</div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Contractor Scorecards</div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <Input
                                className="pl-9"
                                placeholder="Search contractor, grade, or risk..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(['all', 'A', 'B', 'C', 'D', 'watchlist'] as GradeFilter[]).map((grade) => (
                                <Button
                                    key={grade}
                                    size="sm"
                                    variant={gradeFilter === grade ? 'primary' : 'ghost'}
                                    onClick={() => setGradeFilter(grade)}
                                >
                                    {grade}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filteredScorecards.map((scorecard) => (
                            <button
                                key={scorecard.id}
                                type="button"
                                onClick={() => setSelectedId(scorecard.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === scorecard.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{scorecard.contractor}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            Coordination {scorecard.coordination_score} · Delay risk {Math.round(scorecard.delay_risk * 100)}%
                                        </div>
                                    </div>
                                    <Badge variant={gradeVariant(scorecard.public_grade)}>{scorecard.public_grade}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    {scorecard.watchlist && <Badge variant="error">watchlist</Badge>}
                                    <Badge variant="info">{scorecard.on_time_rate_percent}% on time</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Contractor</div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] break-words">{selectedScorecard.contractor}</h2>
                                    <Badge variant={gradeVariant(selectedScorecard.public_grade)}>Grade {selectedScorecard.public_grade}</Badge>
                                    {selectedScorecard.watchlist && <Badge variant="error">Watchlist</Badge>}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    Last audit {new Date(selectedScorecard.last_audit_at).toLocaleString()}
                                </div>
                            </div>

                            <Button variant={selectedScorecard.watchlist ? 'secondary' : 'ghost'} onClick={handleToggleWatchlist}>
                                {selectedScorecard.watchlist ? 'Remove Watchlist' : 'Add Watchlist'}
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <TimerReset size={12} /> On-Time
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedScorecard.on_time_rate_percent}%</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <ClipboardCheck size={12} /> Closure Proof
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedScorecard.closure_evidence_rate_percent}%</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Star size={12} /> Citizen Rating
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedScorecard.citizen_rating.toFixed(1)}/5</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <Trophy size={12} /> Coordination
                                </div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedScorecard.coordination_score}/100</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Risk Snapshot</div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Strongest metric</span><span className="metric-value">{selectedScorecard.strongest_metric}</span></div>
                                        <div className="metric-row"><span className="metric-label">Delay risk</span><span className="metric-value">{Math.round(selectedScorecard.delay_risk * 100)}%</span></div>
                                        <div className="metric-row"><span className="metric-label">Safety incidents</span><span className="metric-value">{selectedScorecard.safety_incidents}</span></div>
                                        <div className="metric-row"><span className="metric-label">Repeat-dig penalties</span><span className="metric-value">{selectedScorecard.repeat_dig_penalties}</span></div>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed break-words">
                                        {selectedScorecard.risk_note}
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Linked Worksites</div>
                                    {linkedWorksites.length > 0 ? (
                                        <div className="space-y-3">
                                            {linkedWorksites.map((worksite) => (
                                                <div key={worksite.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
                                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-black text-[var(--text-primary)] break-words">{worksite.road_name}</div>
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                                                {worksite.permit_number} · {worksite.department}
                                                            </div>
                                                        </div>
                                                        <Badge variant={worksite.status === 'completed' ? 'success' : worksite.status === 'active' ? 'warning' : 'info'}>
                                                            {worksite.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">
                                                        {worksite.purpose}
                                                    </div>
                                                    <Button className="mt-4 w-full justify-between" variant="ghost" onClick={() => navigate(`/track/${worksite.permit_number}`)}>
                                                        Open public tracker
                                                        <ArrowRight size={14} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-[var(--text-muted)]">No active public worksites are linked to this contractor yet.</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Accountability Flags</div>
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                            {selectedScorecard.public_grade === 'A'
                                                ? 'Eligible for fast-track coordination windows and public showcase.'
                                                : 'Requires ongoing audit oversight before priority scheduling privileges expand.'}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                            {selectedScorecard.repeat_dig_penalties > 0
                                                ? `${selectedScorecard.repeat_dig_penalties} repeat-dig penalty case${selectedScorecard.repeat_dig_penalties > 1 ? 's' : ''} recorded in the last cycle.`
                                                : 'No repeat-dig penalties in the current reporting cycle.'}
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                            {selectedScorecard.safety_incidents > 0
                                                ? `${selectedScorecard.safety_incidents} field safety incident${selectedScorecard.safety_incidents > 1 ? 's' : ''} require corrective review.`
                                                : 'No recorded field safety incidents during recent audits.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Closure & Payout Snapshot</div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Linked proof packages</span><span className="metric-value">{linkedProofs.length}</span></div>
                                        <div className="metric-row"><span className="metric-label">Locked payouts</span><span className="metric-value">{lockedMilestones}</span></div>
                                        <div className="metric-row"><span className="metric-label">Released amount</span><span className="metric-value">₹{releasedAmount.toLocaleString()}</span></div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                                        {linkedProofs.slice(0, 3).map((record) => (
                                            <Badge key={record.id} variant={record.status === 'paid' ? 'success' : record.status === 'approved' ? 'info' : 'warning'}>
                                                {record.permit_number}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button className="w-full mt-4 justify-between" variant="ghost" onClick={() => navigate('/closure-proof')}>
                                        Open Closure Desk
                                        <ArrowRight size={14} />
                                    </Button>
                                </div>

                                <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="text-[var(--green)] shrink-0 mt-0.5" size={18} />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-[var(--text-primary)]">Public accountability note</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                                Contractor performance is now visible alongside road-work progress, which helps the city publish delays, closure quality, and re-dig history without hiding the operational context.
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {selectedScorecard.watchlist && (
                                    <Card className="p-5 border-[var(--red-border)] bg-[var(--red-bg)]/60">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="text-[var(--red)] shrink-0 mt-0.5" size={18} />
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-[var(--text-primary)]">Watchlist escalation</div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                                    This contractor should require tighter closure-proof review, commissioner visibility on fresh-pavement works, and a reduced tolerance for deadline slippage.
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
