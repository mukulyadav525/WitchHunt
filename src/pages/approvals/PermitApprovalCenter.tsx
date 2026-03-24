import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import {
    listPermitActionAuditLogsData,
    listPermitApprovalsData,
    listPreDigClearancesData,
    listPolicyAlertsData,
    listPublicVerificationEventsData,
    listPublicWorksitesData,
    savePermitApprovalRecordData,
    savePublicWorksiteData
} from '../../lib/supabaseData';
import { ClosureEvidenceStage, PermitActionAuditLog, PermitApprovalRecord, PolicyAlert, PreDigClearanceRecord, PublicVerificationEvent, PublicWorksite, PublicWorksiteTimelineItem } from '../../types';
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, Clock, ImageOff, QrCode, ShieldCheck, Siren, Stamp, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

function recomputeRecord(record: PermitApprovalRecord): PermitApprovalRecord {
    const collected = record.steps.filter((step) => step.status === 'approved' || step.status === 'provisional').length;
    const allApproved = record.steps.every((step) => !step.required || step.status === 'approved');
    const anyFlagged = record.steps.some((step) => step.status === 'flagged');
    const anyProvisional = record.steps.some((step) => step.status === 'provisional');
    const capturedStages = new Set(record.closure_evidence.map((item) => item.stage));
    const closure_state = record.closure_state === 'archived'
        ? 'archived'
        : capturedStages.size === 0
            ? 'pending'
            : capturedStages.size < 3
                ? 'documenting'
                : 'ready_for_archive';

    return {
        ...record,
        collected_signatures: collected,
        status: anyFlagged ? 'flagged' : allApproved ? 'approved' : anyProvisional ? 'provisional' : 'under_review',
        closure_state
    };
}

export function PermitApprovalCenter() {
    const navigate = useNavigate();
    const [records, setRecords] = useState<PermitApprovalRecord[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [clearances, setClearances] = useState<PreDigClearanceRecord[]>([]);
    const [auditLogs, setAuditLogs] = useState<PermitActionAuditLog[]>([]);
    const [verifications, setVerifications] = useState<PublicVerificationEvent[]>([]);
    const [policyAlerts, setPolicyAlerts] = useState<PolicyAlert[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');

    const loadData = async () => {
        const [nextRecords, nextWorksites, nextClearances, nextAuditLogs, nextVerifications, nextPolicyAlerts] = await Promise.all([
            listPermitApprovalsData(),
            listPublicWorksitesData(),
            listPreDigClearancesData(),
            listPermitActionAuditLogsData(),
            listPublicVerificationEventsData(),
            listPolicyAlertsData()
        ]);
        setRecords(nextRecords);
        setWorksites(nextWorksites);
        setClearances(nextClearances);
        setAuditLogs(nextAuditLogs);
        setVerifications(nextVerifications);
        setPolicyAlerts(nextPolicyAlerts);
        setSelectedId((current) => current || nextRecords[0]?.id || '');
    };

    useEffect(() => {
        void loadData();
    }, []);

    const selectedRecord = records.find((record) => record.id === selectedId) || records[0] || null;

    const stats = {
        underReview: records.filter((record) => record.status === 'under_review').length,
        approved: records.filter((record) => record.status === 'approved').length,
        flagged: records.filter((record) => record.status === 'flagged').length,
        provisional: records.filter((record) => record.status === 'provisional').length
    };

    const pendingStep = selectedRecord?.steps.find((step) => step.status === 'pending') || null;
    const relatedAuditLogs = selectedRecord
        ? auditLogs.filter((item) => item.permit_number === selectedRecord.permit_number)
        : [];
    const relatedClearance = selectedRecord
        ? clearances.find((item) => item.permit_number === selectedRecord.permit_number) || null
        : null;
    const relatedVerifications = selectedRecord
        ? verifications.filter((item) => item.permit_number === selectedRecord.permit_number)
        : [];
    const relatedPolicyAlerts = selectedRecord
        ? policyAlerts.filter((item) => item.permit_number === selectedRecord.permit_number || item.road_name === selectedRecord.road_name)
        : [];

    const syncWorksiteFromRecord = async (record: PermitApprovalRecord) => {
        const worksite = worksites.find((item) => item.permit_number === record.permit_number);
        if (!worksite) return;

        const stageUpdates: PublicWorksiteTimelineItem[] = record.closure_evidence.map((item) => ({
            label: `${item.stage.toUpperCase()} photo uploaded`,
            date: item.captured_at,
            done: true,
            note: item.note
        }));

        const preservedUpdates = worksite.updates.filter((update) =>
            !['BEFORE photo uploaded', 'DURING photo uploaded', 'AFTER photo uploaded', 'Closure proof archived'].includes(update.label)
        );

        const nextWorksite: PublicWorksite = {
            ...worksite,
            archive_ready: record.closure_state === 'ready_for_archive' || record.closure_state === 'archived',
            photo_timeline: record.closure_evidence,
            photo_urls: record.closure_evidence.map((item) => item.photo_url),
            progress_percent: record.closure_state === 'archived' ? 100 : record.closure_evidence.length > 0 ? Math.max(worksite.progress_percent, 80) : worksite.progress_percent,
            status: record.closure_state === 'archived' ? 'completed' : worksite.status,
            updates: [
                ...preservedUpdates,
                ...stageUpdates,
                ...(record.closure_state === 'archived'
                    ? [{
                        label: 'Closure proof archived',
                        date: new Date().toISOString(),
                        done: true,
                        note: 'Before, during, and after evidence package published.'
                    }]
                    : [])
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        };

        const saved = await savePublicWorksiteData(nextWorksite);
        setWorksites((current) => current.map((item) => item.id === saved.id ? saved : item));
    };

    const persistRecord = async (nextRecord: PermitApprovalRecord) => {
        const normalized = recomputeRecord(nextRecord);
        const saved = await savePermitApprovalRecordData(normalized);
        await syncWorksiteFromRecord(saved);
        setRecords((current) => current.map((record) => record.id === saved.id ? saved : record));
        const nextPolicyAlerts = await listPolicyAlertsData();
        setPolicyAlerts(nextPolicyAlerts);
        return saved;
    };

    const updateSelectedRecord = async (updater: (record: PermitApprovalRecord) => PermitApprovalRecord) => {
        if (!selectedRecord) return null;
        return persistRecord(updater(selectedRecord));
    };

    const handleApproveNext = () => {
        if (!selectedRecord || !pendingStep) return;
        void (async () => {
            await updateSelectedRecord((record) => ({
                ...record,
                steps: record.steps.map((step) =>
                    step.id === pendingStep.id
                        ? { ...step, status: 'approved', approved_at: new Date().toISOString(), note: 'Approved from permit center.' }
                        : step
                )
            }));
            toast.success(`Approved ${pendingStep.role} step`);
        })();
    };

    const handleFlag = () => {
        if (!selectedRecord) return;
        void (async () => {
            await updateSelectedRecord((record) => ({
                ...record,
                steps: record.steps.map((step) =>
                    step.status === 'pending'
                        ? { ...step, status: 'flagged', note: 'Flagged for compliance review from permit center.' }
                        : step
                )
            }));
            toast.success('Permit flagged for compliance review');
        })();
    };

    const handleProvisional = () => {
        if (!selectedRecord || !pendingStep) return;
        void (async () => {
            await updateSelectedRecord((record) => ({
                ...record,
                post_audit_due: record.post_audit_due || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                steps: record.steps.map((step) =>
                    step.id === pendingStep.id
                        ? { ...step, status: 'provisional', approved_at: new Date().toISOString(), note: 'Provisional approval granted; post-audit required.' }
                        : step
                )
            }));
            toast.success('Provisional approval granted');
        })();
    };

    const handleAddEvidence = (stage: ClosureEvidenceStage) => {
        if (!selectedRecord) return;
        if (selectedRecord.closure_evidence.some((item) => item.stage === stage)) {
            toast.error(`${stage} evidence already exists`);
            return;
        }

        const relatedWorksite = worksites.find((item) => item.permit_number === selectedRecord.permit_number) || null;
        const utilityDepthFound = stage === 'after' || stage === 'during'
            ? relatedClearance?.nearest_utility_depth_m ?? relatedClearance?.requested_depth_m ?? null
            : null;
        const geoTag = relatedWorksite?.location || null;

        void (async () => {
            await updateSelectedRecord((record) => ({
                ...record,
                closure_evidence: [
                    ...record.closure_evidence,
                    {
                        id: `${record.id}-${stage}-${Date.now()}`,
                        stage,
                        captured_at: new Date().toISOString(),
                        uploaded_by: 'Field Audit Console',
                        note: stage === 'after'
                            ? 'Final reinstatement, surface quality, and utility depth proof recorded.'
                            : stage === 'during'
                                ? 'In-progress trench and safety controls documented.'
                                : 'Pre-work condition and barricading baseline documented.',
                        photo_url: '',
                        utility_depth_found_m: utilityDepthFound,
                        geo_tag: geoTag
                    }
                ]
            }));
            toast.success(`${stage.toUpperCase()} evidence added`);
        })();
    };

    const handleArchive = () => {
        if (!selectedRecord) return;
        const normalized = recomputeRecord(selectedRecord);
        if (normalized.closure_state !== 'ready_for_archive') {
            toast.error('Capture before, during, and after evidence before archiving.');
            return;
        }
        void (async () => {
            await persistRecord({
                ...normalized,
                closure_state: 'archived',
                post_audit_due: null
            });
            toast.success('Permit closure package archived');
        })();
    };

    const sortedRecords = useMemo(() => {
        const priority = { flagged: 0, under_review: 1, provisional: 2, approved: 3, draft: 4 };
        return [...records].sort((a, b) => priority[a.status] - priority[b.status]);
    }, [records]);

    const capturedStages = new Set(selectedRecord.closure_evidence.map((item) => item.stage));

    if (!selectedRecord) {
        return <div className="page-container">No approval records available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Permit Approval Center <Stamp className="text-[var(--blue)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Multi-sign permit lifecycle, blockchain-ready audit trail, and QR verification controls.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">F-05 Permit Workflow</Badge>
                    <Button variant="ghost" onClick={() => navigate(selectedRecord ? `/field-ar?permit=${selectedRecord.permit_number}` : '/field-ar')}>
                        Field AR Briefing
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(selectedRecord ? `/clearance?permit=${selectedRecord.permit_number}` : '/clearance')}>
                        Pre-Dig Clearance
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/audit')}>
                        Audit & Ledger
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/excavations')}>
                        Back to Excavations
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Under Review</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.underReview}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Approved</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.approved}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Flagged</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.flagged}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Provisional</div>
                    <div className="text-3xl font-black text-[var(--brand)]">{stats.provisional}</div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-[0.9fr,2.1fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Approval Queue</div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {sortedRecords.map((record) => (
                            <button
                                key={record.id}
                                onClick={() => setSelectedId(record.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === record.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-black text-[var(--text-primary)]">{record.permit_number}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                            {record.road_name}
                                        </div>
                                    </div>
                                    <Badge variant={record.status === 'approved' ? 'success' : record.status === 'flagged' ? 'error' : record.status === 'provisional' ? 'warning' : 'info'}>
                                        {record.status}
                                    </Badge>
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] mt-3 line-clamp-2">{record.purpose}</div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Permit</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedRecord.permit_number}</h2>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                    {selectedRecord.road_name} · {selectedRecord.purpose}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={selectedRecord.status === 'approved' ? 'success' : selectedRecord.status === 'flagged' ? 'error' : selectedRecord.status === 'provisional' ? 'warning' : 'info'}>
                                    {selectedRecord.status}
                                </Badge>
                                {selectedRecord.road_protection_rule && <Badge variant="warning">Road Protection Rule</Badge>}
                                {selectedRecord.emergency && <Badge variant="error">Emergency</Badge>}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Signatures</div>
                                <div className="text-lg font-black text-[var(--text-primary)]">{selectedRecord.collected_signatures}/{selectedRecord.required_signatures}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Blockchain Hash</div>
                                <div className="text-sm font-black text-[var(--blue)] break-all">{selectedRecord.blockchain_hash}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Verification</div>
                                <Button size="sm" variant="ghost" onClick={() => navigate(selectedRecord.public_verification_url)}>
                                    <QrCode size={12} /> Open Public Record
                                </Button>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Governance Signals</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{relatedPolicyAlerts.length} alert{relatedPolicyAlerts.length === 1 ? '' : 's'}</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Approval Chain</div>
                                {selectedRecord.steps.map((step) => (
                                    <div key={step.id} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-black text-[var(--text-primary)]">{step.role}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                    {step.approver_name}
                                                </div>
                                            </div>
                                            <Badge variant={step.status === 'approved' ? 'success' : step.status === 'flagged' ? 'error' : step.status === 'provisional' ? 'warning' : 'info'}>
                                                {step.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3">{step.note || 'No note added yet.'}</div>
                                        {step.approved_at && (
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-3">
                                                {new Date(step.approved_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Compliance Flags</div>
                                {selectedRecord.compliance_flags.map((flag, index) => (
                                    <div key={index} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-[var(--red)] mt-0.5" />
                                            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{flag}</div>
                                        </div>
                                    </div>
                                ))}

                                {selectedRecord.post_audit_due && (
                                    <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                            <Clock size={12} className="text-[var(--blue)]" />
                                            Post-Audit Deadline
                                        </div>
                                        <div className="text-sm font-black text-[var(--text-primary)]">
                                            {new Date(selectedRecord.post_audit_due).toLocaleString()}
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-3">Ledger Snapshot</div>
                                    <div className="space-y-3">
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {relatedAuditLogs.length} immutable action record{relatedAuditLogs.length === 1 ? '' : 's'} · {relatedVerifications.length} public verification hit{relatedVerifications.length === 1 ? '' : 's'}
                                        </div>
                                        {relatedAuditLogs.slice(0, 2).map((entry) => (
                                            <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                <div className="text-xs font-black text-[var(--text-primary)]">{entry.action}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                                    {entry.actor_role} · {new Date(entry.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                        <Button size="sm" variant="ghost" className="w-full justify-between" onClick={() => navigate('/audit')}>
                                            Open Audit Center <ArrowRight size={12} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Closure Evidence</div>
                                <Badge variant={selectedRecord.closure_state === 'archived' ? 'success' : selectedRecord.closure_state === 'ready_for_archive' ? 'warning' : 'info'}>
                                    {selectedRecord.closure_state.replace(/_/g, ' ')}
                                </Badge>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                {(['before', 'during', 'after'] as ClosureEvidenceStage[]).map((stage) => (
                                    <div key={stage} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stage} photo</div>
                                            {capturedStages.has(stage) ? <Badge variant="success">Captured</Badge> : <Badge variant="warning">Pending</Badge>}
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {stage === 'before'
                                                ? 'Required before the surface is broken.'
                                                : stage === 'during'
                                                    ? 'Documents trench conditions and live utility safety.'
                                                    : 'Required for closure proof and archive.'}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={capturedStages.has(stage) ? 'ghost' : 'primary'}
                                            disabled={capturedStages.has(stage)}
                                            onClick={() => handleAddEvidence(stage)}
                                        >
                                            <Camera size={12} /> {capturedStages.has(stage) ? 'Recorded' : `Add ${stage}`}
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {selectedRecord.closure_evidence.length > 0 && (
                                <div className="grid md:grid-cols-3 gap-4">
                                    {selectedRecord.closure_evidence.map((item) => (
                                        <div key={item.id} className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-panel)]">
                                            {item.photo_url ? (
                                                <img src={item.photo_url} alt={item.stage} className="w-full h-36 object-cover" />
                                            ) : (
                                                <div className="w-full h-36 bg-[var(--bg-hover)] border-b border-[var(--border)] flex items-center justify-center gap-2 text-[var(--text-muted)]">
                                                    <ImageOff size={16} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">No photo uploaded</span>
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
                                                        Depth found {item.utility_depth_found_m}m
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <Button onClick={handleApproveNext} disabled={!pendingStep}>
                                <CheckCircle2 size={14} /> Approve Next Step
                            </Button>
                            <Button variant="secondary" onClick={handleProvisional} disabled={!pendingStep}>
                                <Siren size={14} /> Provisional
                            </Button>
                            <Button variant="secondary" onClick={handleArchive} disabled={selectedRecord.closure_state !== 'ready_for_archive'}>
                                <Archive size={14} /> Archive Closure
                            </Button>
                            <Button variant="danger" onClick={handleFlag}>
                                <AlertTriangle size={14} /> Flag Record
                            </Button>
                            <Button variant="ghost" onClick={() => navigate('/excavations')}>
                                Open Permit Planner <ArrowRight size={12} />
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="text-[var(--green)]" size={18} />
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Lifecycle Rules</div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                                Utility department head and PWD engineer must both sign planned excavations.
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                                Roads paved within 6 months trigger commissioner co-sign to prevent repeated trenching.
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                                Emergency provisional approvals remain valid only if the 48-hour post-audit is completed.
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
