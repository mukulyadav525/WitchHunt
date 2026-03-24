import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Input, TextArea } from '../../components/ui';
import {
    listExcavationPermitsData,
    listPermitApprovalsData,
    listPreDigClearancesData,
    listPublicWorksitesData,
    savePreDigClearanceData
} from '../../lib/supabaseData';
import type { ExcavationPermit, PermitApprovalRecord, PreDigClearanceRecord, PublicWorksite } from '../../types';
import {
    AlertTriangle,
    ArrowRight,
    Cable,
    CheckCircle2,
    Construction,
    Layers3,
    MapPin,
    QrCode,
    ShieldCheck,
    Siren,
    Workflow
} from 'lucide-react';
import toast from 'react-hot-toast';

function statusVariant(status: PreDigClearanceRecord['status']) {
    switch (status) {
        case 'cleared':
            return 'success';
        case 'restricted':
            return 'warning';
        case 'gpr_required':
            return 'info';
        default:
            return 'error';
    }
}

function riskTint(level: PreDigClearanceRecord['risk_level']) {
    switch (level) {
        case 'critical':
            return 'var(--red)';
        case 'high':
            return 'var(--yellow)';
        case 'medium':
            return 'var(--blue)';
        default:
            return 'var(--green)';
    }
}

export function PreDigClearanceCenter() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clearances, setClearances] = useState<PreDigClearanceRecord[]>([]);
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [approvals, setApprovals] = useState<PermitApprovalRecord[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [selectedPermitNumber, setSelectedPermitNumber] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [decisionDraft, setDecisionDraft] = useState('');

    const loadData = async () => {
        try {
            const [nextClearances, nextPermits, nextApprovals, nextWorksites] = await Promise.all([
                listPreDigClearancesData(),
                listExcavationPermitsData(),
                listPermitApprovalsData(),
                listPublicWorksitesData()
            ]);

            setClearances(nextClearances);
            setPermits(nextPermits);
            setApprovals(nextApprovals);
            setWorksites(nextWorksites);

            const permitQuery = searchParams.get('permit');
            const roadQuery = searchParams.get('road');
            const selectedFromQuery = nextClearances.find((record) =>
                record.permit_number === permitQuery
                || (roadQuery ? record.road_name === roadQuery : false)
            );
            const nextSelected = selectedFromQuery?.permit_number || nextClearances[0]?.permit_number || '';
            setSelectedPermitNumber((current) => selectedFromQuery?.permit_number || current || nextSelected);
        } catch (error: any) {
            toast.error(error.message || 'Unable to load pre-dig clearance data from Supabase.');
        }
    };

    useEffect(() => {
        void loadData();
    }, [searchParams]);

    const filteredClearances = useMemo(() => {
        return clearances.filter((record) => {
            const haystack = `${record.permit_number} ${record.road_name} ${record.ward} ${record.organization} ${record.status}`.toLowerCase();
            return haystack.includes(searchQuery.toLowerCase());
        });
    }, [clearances, searchQuery]);

    const selectedClearance = filteredClearances.find((record) => record.permit_number === selectedPermitNumber)
        || clearances.find((record) => record.permit_number === selectedPermitNumber)
        || filteredClearances[0]
        || clearances[0]
        || null;
    const selectedPermit = selectedClearance
        ? permits.find((permit) => permit.permit_number === selectedClearance.permit_number) || null
        : null;
    const selectedApproval = selectedClearance
        ? approvals.find((record) => record.permit_number === selectedClearance.permit_number) || null
        : null;
    const selectedWorksite = selectedClearance
        ? worksites.find((record) => record.permit_number === selectedClearance.permit_number) || null
        : null;

    useEffect(() => {
        setDecisionDraft(selectedClearance?.decision_note || '');
    }, [selectedClearance?.permit_number, selectedClearance?.decision_note]);

    const stats = useMemo(() => ({
        blocked: clearances.filter((record) => record.status === 'blocked').length,
        gpr: clearances.filter((record) => record.status === 'gpr_required').length,
        restricted: clearances.filter((record) => record.status === 'restricted').length,
        cleared: clearances.filter((record) => record.status === 'cleared').length
    }), [clearances]);

    const persistSelected = async (updater: (record: PreDigClearanceRecord) => PreDigClearanceRecord) => {
        if (!selectedClearance) return null;
        const saved = await savePreDigClearanceData(updater(selectedClearance));
        setClearances((current) => current.map((record) => record.permit_number === saved.permit_number ? saved : record));
        return saved;
    };

    const handleChecklistToggle = (itemId: string) => {
        void (async () => {
            try {
                await persistSelected((record) => ({
                    ...record,
                    checklist: record.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item),
                    decision_note: decisionDraft.trim() || record.decision_note
                }));
                toast.success('Clearance checklist updated.');
            } catch (error: any) {
                toast.error(error.message || 'Unable to update this checklist item.');
            }
        })();
    };

    const handleDecision = (status: PreDigClearanceRecord['status']) => {
        void (async () => {
            try {
                const allChecklistDone = selectedClearance?.checklist.every((item) => item.done) ?? false;
                if (status === 'cleared' && !allChecklistDone) {
                    toast.error('Finish the dig-safe checklist before clearing this permit.');
                    return;
                }

                await persistSelected((record) => ({
                    ...record,
                    status,
                    approved_at: status === 'cleared' ? new Date().toISOString() : record.approved_at,
                    decision_note: decisionDraft.trim() || record.decision_note
                }));
                toast.success(`Clearance marked as ${status.replace(/_/g, ' ')}.`);
            } catch (error: any) {
                toast.error(error.message || 'Unable to update this clearance decision.');
            }
        })();
    };

    const handleSaveNote = () => {
        void (async () => {
            try {
                await persistSelected((record) => ({
                    ...record,
                    decision_note: decisionDraft.trim() || record.decision_note
                }));
                toast.success('Clearance note saved.');
            } catch (error: any) {
                toast.error(error.message || 'Unable to save this clearance note.');
            }
        })();
    };

    if (!selectedClearance) {
        return <div className="page-container">No pre-dig clearance records are available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Pre-Dig Clearance Center <ShieldCheck className="text-[var(--blue)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Dig-safe clearance, underground conflict review, AR-ready field context, and GPR decision support before any trench opens.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="ghost" onClick={() => navigate('/approvals')}>
                        Permit Approvals
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/twin')}>
                        Digital Twin
                    </Button>
                    <Badge variant="info">F-02 Dig-Safe Workflow</Badge>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Blocked</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.blocked}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">GPR Required</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.gpr}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Restricted</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">{stats.restricted}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Cleared</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.cleared}</div>
                </Card>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(300px,0.95fr)_minmax(0,2.05fr)]">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Permit Queue</div>
                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search permit, road, ward..."
                            className="h-10"
                        />
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)] max-h-[70dvh] overflow-y-auto">
                        {filteredClearances.map((record) => (
                            <button
                                key={record.permit_number}
                                onClick={() => setSelectedPermitNumber(record.permit_number)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedPermitNumber === record.permit_number ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] truncate">{record.permit_number}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1 truncate">
                                            {record.road_name} · {record.ward}
                                        </div>
                                    </div>
                                    <Badge variant={statusVariant(record.status)}>{record.status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                                    <span className="text-[var(--text-secondary)]">{record.organization}</span>
                                    <span style={{ color: riskTint(record.risk_level) }} className="font-black">Risk {record.risk_score}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Requested Depth</div>
                            <div className="text-3xl font-black text-[var(--text-primary)]">{selectedClearance.requested_depth_m}m</div>
                        </Card>
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Nearest Utility</div>
                            <div className="text-3xl font-black text-[var(--blue)]">{selectedClearance.nearest_utility_depth_m ?? 'N/A'}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Conflict Zones</div>
                            <div className="text-3xl font-black text-[var(--red)]">{selectedClearance.conflict_count}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Field Marking</div>
                            <div className="text-xl font-black text-[var(--brand)]">{selectedClearance.field_marking_status.replace(/_/g, ' ')}</div>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Permit</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedClearance.permit_number}</h2>
                                <div className="text-sm text-[var(--text-secondary)] mt-2 break-words">
                                    {selectedClearance.road_name} · {selectedClearance.organization}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={statusVariant(selectedClearance.status)}>{selectedClearance.status.replace(/_/g, ' ')}</Badge>
                                <Badge variant={selectedClearance.gpr_required ? 'info' : 'success'}>{selectedClearance.gpr_required ? 'GPR / verify' : 'No GPR trigger'}</Badge>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <MapPin size={12} />
                                        Permit Context
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Purpose</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedPermit?.purpose || selectedWorksite?.purpose || 'Not tagged'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Requested window</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">
                                                {selectedPermit ? `${new Date(selectedPermit.requested_start_date).toLocaleDateString()} - ${new Date(selectedPermit.requested_end_date).toLocaleDateString()}` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Safe margin</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">
                                                {selectedClearance.safe_clearance_margin_m == null ? 'Unknown' : `${selectedClearance.safe_clearance_margin_m} m`}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Blockchain / QR</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">
                                                {selectedClearance.blockchain_verified ? 'Verified' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <Cable size={12} />
                                        Underground Readiness
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Utility layers</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedClearance.utility_types.join(', ') || 'None mapped'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>AR overlay</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedClearance.ar_overlay_status.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Twin snapshot</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedClearance.twin_snapshot_year || 'No snapshot'}</span>
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                                            {selectedClearance.twin_note || 'No twin note is available yet for this corridor.'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <Workflow size={12} />
                                        Required Actions
                                    </div>
                                    <div className="space-y-3">
                                        {selectedClearance.required_actions.map((action) => (
                                            <div key={action} className="flex items-start gap-3 rounded-xl bg-[var(--bg-surface)] px-3 py-3">
                                                <AlertTriangle size={14} className="mt-0.5 text-[var(--yellow)] shrink-0" />
                                                <span className="text-sm text-[var(--text-secondary)] leading-6">{action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <Construction size={12} />
                                        Field Context
                                    </div>
                                    <div className="text-sm text-[var(--text-secondary)] leading-6">
                                        {selectedClearance.latest_field_note || 'No field utility-marking note has been synced for this permit yet.'}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/field?permit=${selectedClearance.permit_number}`)}>
                                            Open Field Console
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/field-ar?permit=${selectedClearance.permit_number}`)}>
                                            Field AR Briefing
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => navigate(selectedApproval ? `/approvals` : '/excavations')}>
                                            Review Permit Chain
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
                        <Card className="p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Dig-Safe Checklist</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2">
                                        Every item here maps to a real pre-dig clearance gate before trench opening.
                                    </div>
                                </div>
                                <Badge variant="info">{selectedClearance.checklist.filter((item) => item.done).length}/{selectedClearance.checklist.length} done</Badge>
                            </div>

                            <div className="space-y-3">
                                {selectedClearance.checklist.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleChecklistToggle(item.id)}
                                        className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4 transition-colors hover:bg-[var(--bg-hover)]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 size={16} className={item.done ? 'text-[var(--green)]' : 'text-[var(--text-disabled)]'} />
                                                    <div className="text-sm font-black text-[var(--text-primary)]">{item.label}</div>
                                                </div>
                                                <div className="mt-2 pl-7 text-xs text-[var(--text-secondary)] leading-5">{item.note}</div>
                                            </div>
                                            <Badge variant={item.done ? 'success' : 'warning'}>{item.owner}</Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Decision Desk</div>

                            <TextArea
                                value={decisionDraft}
                                onChange={(event) => setDecisionDraft(event.target.value)}
                                placeholder="Record the dig-safe decision note, GPR instruction, or field supervisor guidance..."
                                className="min-h-[140px]"
                            />

                            <Button className="w-full" variant="secondary" onClick={handleSaveNote}>
                                Save Decision Note
                            </Button>

                            <div className="grid gap-3">
                                <Button variant="ghost" className="justify-between" onClick={() => handleDecision('blocked')}>
                                    Block Permit
                                    <AlertTriangle size={14} />
                                </Button>
                                <Button variant="ghost" className="justify-between" onClick={() => handleDecision('gpr_required')}>
                                    Require GPR / verification
                                    <Layers3 size={14} />
                                </Button>
                                <Button variant="ghost" className="justify-between" onClick={() => handleDecision('restricted')}>
                                    Restricted supervised dig
                                    <Siren size={14} />
                                </Button>
                                <Button className="justify-between" onClick={() => handleDecision('cleared')}>
                                    Clear for excavation
                                    <ShieldCheck size={14} />
                                </Button>
                            </div>

                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                    <QrCode size={12} />
                                    Related Links
                                </div>
                                <Button variant="ghost" className="w-full justify-between" onClick={() => navigate(`/twin?road=${encodeURIComponent(selectedClearance.road_name)}`)}>
                                    Open digital twin corridor
                                    <ArrowRight size={14} />
                                </Button>
                                <Button variant="ghost" className="w-full justify-between" onClick={() => navigate(`/field-ar?permit=${selectedClearance.permit_number}`)}>
                                    Open field AR briefing
                                    <ArrowRight size={14} />
                                </Button>
                                <Button variant="ghost" className="w-full justify-between" onClick={() => navigate(`/track/${selectedClearance.permit_number}`)}>
                                    Open public tracker
                                    <ArrowRight size={14} />
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
