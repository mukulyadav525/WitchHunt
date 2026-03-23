import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
import {
    listPermitActionAuditLogsData,
    listPolicyAlertsData,
    listPublicVerificationEventsData
} from '../../lib/supabaseData';
import type { PermitActionAuditLog, PolicyAlert, PublicVerificationEvent } from '../../types';
import { AlertTriangle, ArrowRight, QrCode, Search, ShieldCheck, ShieldAlert } from 'lucide-react';

function severityVariant(severity: 'medium' | 'high' | 'critical') {
    switch (severity) {
        case 'critical':
            return 'error';
        case 'high':
            return 'warning';
        default:
            return 'info';
    }
}

export function AuditComplianceCenter() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [alerts, setAlerts] = useState<PolicyAlert[]>([]);
    const [auditLogs, setAuditLogs] = useState<PermitActionAuditLog[]>([]);
    const [verificationEvents, setVerificationEvents] = useState<PublicVerificationEvent[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [nextAlerts, nextAuditLogs, nextVerificationEvents] = await Promise.all([
                listPolicyAlertsData(),
                listPermitActionAuditLogsData(),
                listPublicVerificationEventsData()
            ]);
            setAlerts(nextAlerts);
            setAuditLogs(nextAuditLogs);
            setVerificationEvents(nextVerificationEvents);
            setSelectedId((current) => current || nextAlerts[0]?.id || '');
        };

        void loadData();
    }, []);

    const filteredAlerts = useMemo(() => alerts.filter((alert) => {
        const haystack = `${alert.title} ${alert.description} ${alert.road_name} ${alert.permit_number || ''} ${alert.owner}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
    }), [alerts, searchQuery]);

    const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedId)
        || alerts.find((alert) => alert.id === selectedId)
        || filteredAlerts[0]
        || alerts[0]
        || null;

    const relatedLogs = selectedAlert
        ? auditLogs.filter((entry) =>
            entry.permit_number === selectedAlert.permit_number ||
            entry.road_name === selectedAlert.road_name
        )
        : [];
    const relatedVerifications = selectedAlert
        ? verificationEvents.filter((entry) =>
            entry.permit_number === selectedAlert.permit_number ||
            entry.road_name === selectedAlert.road_name
        )
        : [];

    const stats = useMemo(() => ({
        criticalAlerts: alerts.filter((alert) => alert.severity === 'critical').length,
        auditEntries: auditLogs.length,
        publicVerifications: verificationEvents.length,
        flaggedVerifications: verificationEvents.filter((event) => event.outcome === 'flagged').length
    }), [alerts, auditLogs, verificationEvents]);

    if (!selectedAlert) {
        return <div className="page-container">No audit alerts available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Audit & Compliance Center <ShieldAlert className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Immutable permit actions, public verification traces, and policy alerts for repeat digs, emergency misuse, and missing closure proof.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">Governance Layer</Badge>
                    <Button variant="ghost" onClick={() => navigate('/executive')}>
                        Executive View
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/approvals')}>
                        Permit Center
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Critical Alerts</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.criticalAlerts}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Ledger Entries</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.auditEntries}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Public Verifications</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.publicVerifications}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Flagged Scans</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">{stats.flaggedVerifications}</div>
                </Card>
            </div>

            <div className="grid xl:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Policy Alert Queue</div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <Input
                                className="pl-9"
                                placeholder="Search road, permit, policy owner..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filteredAlerts.map((alert) => (
                            <button
                                key={alert.id}
                                type="button"
                                onClick={() => setSelectedId(alert.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedId === alert.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{alert.title}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {alert.permit_number || alert.road_name} · {alert.owner}
                                        </div>
                                    </div>
                                    <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Alert</div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] break-words">{selectedAlert.title}</h2>
                                    <Badge variant={severityVariant(selectedAlert.severity)}>{selectedAlert.severity}</Badge>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {selectedAlert.road_name} · {selectedAlert.permit_number || 'corridor-wide'} · owner {selectedAlert.owner}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                {selectedAlert.permit_number && (
                                    <Button variant="ghost" onClick={() => navigate(`/track/${selectedAlert.permit_number}`)}>
                                        Public Record
                                    </Button>
                                )}
                                <Button variant="ghost" onClick={() => navigate('/closure-proof')}>
                                    Closure Desk
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Category</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedAlert.category.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Related Ledger Items</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{relatedLogs.length}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Public Verification Hits</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{relatedVerifications.length}</div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Why This Matters</div>
                            <div className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">
                                {selectedAlert.description}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/executive')}>
                                Executive View <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/approvals')}>
                                Permit Center <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/traffic')}>
                                Traffic & Delay <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/contractors')}>
                                Contractor Hub <ArrowRight size={14} />
                            </Button>
                        </div>
                    </Card>

                    <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-8">
                        <Card className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Immutable Permit Ledger</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2">
                                        Recent permit and closure actions linked to the selected alert.
                                    </div>
                                </div>
                                <Badge variant="info">{relatedLogs.length} entries</Badge>
                            </div>

                            <div className="space-y-4">
                                {relatedLogs.length > 0 ? relatedLogs.slice(0, 6).map((entry) => (
                                    <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-[var(--text-primary)] break-words">{entry.action}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                                    {entry.actor_name} · {entry.actor_role}
                                                </div>
                                            </div>
                                            <Badge variant="success">{entry.entity_type.replace(/_/g, ' ')}</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">{entry.details}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--blue)] mt-3 break-all">
                                            {entry.immutable_hash}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-muted)]">
                                        No ledger entries match the selected alert yet.
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Public Verification Trail</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2">
                                        Pseudonymized QR scans and tracker lookups tied to this corridor.
                                    </div>
                                </div>
                                <Badge variant="warning">{relatedVerifications.filter((entry) => entry.outcome === 'flagged').length} flagged</Badge>
                            </div>

                            <div className="space-y-4">
                                {relatedVerifications.length > 0 ? relatedVerifications.slice(0, 6).map((entry) => (
                                    <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                {entry.source === 'qr_scan' ? <QrCode size={14} className="text-[var(--blue)]" /> : <ShieldCheck size={14} className="text-[var(--green)]" />}
                                                <div className="text-sm font-black text-[var(--text-primary)]">{entry.source.replace(/_/g, ' ')}</div>
                                            </div>
                                            <Badge variant={entry.outcome === 'flagged' ? 'error' : 'success'}>{entry.outcome}</Badge>
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-3">
                                            Viewer ref {entry.viewer_ref}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-muted)]">
                                        No public verification events are linked to this alert yet.
                                    </div>
                                )}
                            </div>

                            <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-[var(--yellow)] shrink-0 mt-0.5" size={18} />
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)]">Trust note</div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                            Public scans are pseudonymized here, but they still tell us where transparency pressure is building and which permits need fresher evidence or clearer status updates.
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
