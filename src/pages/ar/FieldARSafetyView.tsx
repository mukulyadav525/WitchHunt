import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import {
    listExcavationPermitsData,
    listPreDigClearancesData,
    listRoadTwinSnapshotsData,
    listUtilityInfrastructureData,
    listUtilityOrganizationsData
} from '../../lib/supabaseData';
import type { ExcavationPermit, PreDigClearanceRecord, RoadTwinSnapshot, UtilityInfrastructure, UtilityOrganization } from '../../types';
import {
    AlertTriangle,
    ArrowRight,
    Cable,
    Layers3,
    MapPin,
    Phone,
    Radio,
    Route,
    ShieldCheck,
    Siren,
    Smartphone,
    Waves
} from 'lucide-react';
import toast from 'react-hot-toast';

type UtilityRiskBand = 'low' | 'medium' | 'high' | 'critical';

function utilityColor(type: UtilityInfrastructure['utility_type']) {
    switch (type) {
        case 'water':
            return '#2563eb';
        case 'telecom':
            return '#16a34a';
        case 'electricity':
            return '#dc2626';
        case 'gas':
            return '#f59e0b';
        case 'sewage':
            return '#7c3aed';
        default:
            return '#64748b';
    }
}

function utilityRiskBand(item: UtilityInfrastructure): UtilityRiskBand {
    if (item.risk_level === 'critical' || item.utility_type === 'gas' || item.utility_type === 'electricity') {
        return 'critical';
    }
    if (item.risk_level === 'high' || item.utility_type === 'telecom' || item.condition === 'critical') {
        return 'high';
    }
    if (item.risk_level === 'medium' || item.condition === 'poor') {
        return 'medium';
    }
    return 'low';
}

function bandVariant(band: UtilityRiskBand) {
    switch (band) {
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

function utilityAction(item: UtilityInfrastructure, depthDelta: number | null) {
    if (depthDelta !== null && depthDelta <= 0) {
        return 'Stop immediately. The current dig depth has crossed the mapped utility depth.';
    }
    if (depthDelta !== null && depthDelta <= 0.4) {
        return `Approaching ${item.utility_type} line. Reduce force and switch to hand-dig supervision.`;
    }
    if (item.utility_type === 'gas' || item.utility_type === 'electricity') {
        return 'Keep owner team on-site before deep trenching starts.';
    }
    if (item.utility_type === 'telecom') {
        return 'Document trench progress and keep fiber-safe excavation tools ready.';
    }
    return 'Proceed with standard marked-corridor supervision and periodic depth checks.';
}

export function FieldARSafetyView() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clearances, setClearances] = useState<PreDigClearanceRecord[]>([]);
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [utilities, setUtilities] = useState<UtilityInfrastructure[]>([]);
    const [organizations, setOrganizations] = useState<UtilityOrganization[]>([]);
    const [snapshots, setSnapshots] = useState<RoadTwinSnapshot[]>([]);
    const [selectedPermitNumber, setSelectedPermitNumber] = useState('');
    const [currentDepth, setCurrentDepth] = useState(0.4);

    useEffect(() => {
        void (async () => {
            try {
                const [
                    nextClearances,
                    nextPermits,
                    nextUtilities,
                    nextOrganizations,
                    nextSnapshots
                ] = await Promise.all([
                    listPreDigClearancesData(),
                    listExcavationPermitsData(),
                    listUtilityInfrastructureData(),
                    listUtilityOrganizationsData(),
                    listRoadTwinSnapshotsData()
                ]);

                setClearances(nextClearances);
                setPermits(nextPermits);
                setUtilities(nextUtilities);
                setOrganizations(nextOrganizations);
                setSnapshots(nextSnapshots.map((row) => ({
                    year: row.snapshot_year,
                    health_score: row.health_score,
                    defect_count: row.defect_count,
                    visible_utilities: row.visible_utilities,
                    active_workzones: row.active_workzones,
                    note: row.note || 'Twin snapshot recorded.'
                })));

                const permitQuery = searchParams.get('permit');
                const roadQuery = searchParams.get('road');
                const queried = nextClearances.find((item) =>
                    item.permit_number === permitQuery
                    || (roadQuery ? item.road_name === roadQuery : false)
                ) || null;
                setSelectedPermitNumber((current) => queried?.permit_number || current || nextClearances[0]?.permit_number || '');
            } catch (error: any) {
                toast.error(error.message || 'Unable to load the field AR safety view from Supabase.');
            }
        })();
    }, [searchParams]);

    const selectedClearance = clearances.find((item) => item.permit_number === selectedPermitNumber) || clearances[0] || null;
    const selectedPermit = selectedClearance
        ? permits.find((item) => item.permit_number === selectedClearance.permit_number) || null
        : null;
    const roadUtilities = useMemo(() => {
        if (!selectedClearance) return [];
        return utilities
            .filter((item) => item.road_name === selectedClearance.road_name && item.status !== 'abandoned')
            .sort((a, b) => a.depth_avg_m - b.depth_avg_m);
    }, [selectedClearance, utilities]);
    const roadSnapshots = useMemo(() => {
        if (!selectedClearance) return [];
        const permitRoad = selectedPermit?.road_segment_id || null;
        return snapshots.filter((item) => {
            if (permitRoad) {
                return true;
            }
            return item.note.toLowerCase().includes(selectedClearance.road_name.toLowerCase()) || selectedClearance.twin_snapshot_year === item.year;
        });
    }, [selectedClearance, selectedPermit?.road_segment_id, snapshots]);

    useEffect(() => {
        if (!selectedClearance) return;
        const initialDepth = Math.max(0.2, Math.min(selectedClearance.requested_depth_m, (selectedClearance.nearest_utility_depth_m || selectedClearance.requested_depth_m) - 0.2));
        setCurrentDepth(Number.isFinite(initialDepth) ? Number(initialDepth.toFixed(2)) : 0.4);
    }, [selectedClearance?.permit_number]);

    const organizationById = useMemo(
        () => new Map(organizations.map((item) => [item.id, item])),
        [organizations]
    );

    const nextUtility = roadUtilities.find((item) => item.depth_avg_m >= currentDepth) || null;
    const nextUtilityDelta = nextUtility ? Number((nextUtility.depth_avg_m - currentDepth).toFixed(2)) : null;
    const maxDepth = Math.max(
        2.5,
        selectedClearance?.requested_depth_m || 0,
        roadUtilities[roadUtilities.length - 1]?.depth_avg_m || 0
    ) + 0.5;
    const offlinePackageReady = Boolean(
        selectedClearance
        && selectedClearance.field_marking_status !== 'not_started'
        && selectedClearance.ar_overlay_status !== 'not_ready'
    );

    if (!selectedClearance) {
        return <div className="page-container">No field AR safety packages are available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Field AR Safety View <Smartphone className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Permit-linked, offline-ready field briefing for underground overlays, depth alerts, and dig-safe supervision.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">F-08 AR-ready field package</Badge>
                    <Button variant="ghost" onClick={() => navigate(`/clearance?permit=${selectedClearance.permit_number}`)}>
                        Pre-Dig Clearance
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/field?permit=${selectedClearance.permit_number}`)}>
                        Field Console
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Selected Permit</div>
                    <div className="text-xl font-black text-[var(--text-primary)] break-words">{selectedClearance.permit_number}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">{selectedClearance.road_name}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Current Dig Depth</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{currentDepth.toFixed(2)}m</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">Requested {selectedClearance.requested_depth_m}m</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Next Utility Gap</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">{nextUtilityDelta == null ? 'N/A' : `${nextUtilityDelta}m`}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">{nextUtility ? `${nextUtility.utility_type} at ${nextUtility.depth_avg_m}m` : 'No deeper utility mapped'}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Offline Pack</div>
                    <div className="text-xl font-black text-[var(--green)]">{offlinePackageReady ? 'Ready' : 'Limited'}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">{selectedClearance.ar_overlay_status.replace(/_/g, ' ')}</div>
                </Card>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,2.1fr)]">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Permit Packages</div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)] max-h-[72dvh] overflow-y-auto">
                        {clearances.map((record) => (
                            <button
                                key={record.permit_number}
                                onClick={() => setSelectedPermitNumber(record.permit_number)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={record.permit_number === selectedClearance.permit_number ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] truncate">{record.permit_number}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1 truncate">
                                            {record.road_name} · {record.ward}
                                        </div>
                                    </div>
                                    <Badge variant={record.status === 'cleared' ? 'success' : record.status === 'blocked' ? 'error' : 'warning'}>
                                        {record.status.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6 overflow-hidden">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">AR Overlay Simulation</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedClearance.road_name}</h2>
                                <div className="text-sm text-[var(--text-secondary)] mt-2 break-words">
                                    {selectedClearance.organization} · {selectedClearance.ward}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={selectedClearance.status === 'cleared' ? 'success' : selectedClearance.status === 'blocked' ? 'error' : 'warning'}>
                                    {selectedClearance.status.replace(/_/g, ' ')}
                                </Badge>
                                <Badge variant={selectedClearance.gpr_required ? 'info' : 'success'}>
                                    {selectedClearance.gpr_required ? 'GPR required' : 'No GPR trigger'}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] gap-6">
                            <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-panel),var(--bg-surface))] p-6">
                                <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Depth Measurement Tool</div>
                                    <div className="text-sm font-black text-[var(--text-primary)]">Live dig: {currentDepth.toFixed(2)}m</div>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="range"
                                        min={0}
                                        max={maxDepth}
                                        step={0.05}
                                        value={currentDepth}
                                        onChange={(event) => setCurrentDepth(Number(event.target.value))}
                                        className="w-full accent-[var(--brand)]"
                                    />

                                    <div className="relative h-[360px] rounded-[24px] border border-[var(--border)] bg-[radial-gradient(circle_at_top,var(--bg-hover),var(--bg-panel))] overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 h-12 border-b border-[var(--border)] bg-[var(--bg-base)]/70 px-4 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                            <span>Surface</span>
                                            <span>0.0m</span>
                                        </div>

                                        {roadUtilities.map((item) => {
                                            const top = 48 + ((item.depth_avg_m / maxDepth) * 280);
                                            const owner = organizationById.get(item.utility_org_id) || null;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="absolute left-4 right-4 rounded-2xl border px-4 py-3 shadow-[var(--shadow-sm)]"
                                                    style={{
                                                        top,
                                                        background: `${utilityColor(item.utility_type)}18`,
                                                        borderColor: `${utilityColor(item.utility_type)}66`
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div>
                                                            <div className="text-sm font-black text-[var(--text-primary)]">{item.utility_type}</div>
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                                {owner?.name || 'Utility owner'} · {item.depth_avg_m.toFixed(2)}m
                                                            </div>
                                                        </div>
                                                        <Badge variant={bandVariant(utilityRiskBand(item))}>{utilityRiskBand(item)}</Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div
                                            className="absolute inset-x-0 z-20 border-t-2 border-dashed"
                                            style={{ top: 48 + ((currentDepth / maxDepth) * 280), borderColor: 'var(--brand)' }}
                                        >
                                            <div className="absolute right-3 -top-3 rounded-full bg-[var(--brand)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                                                Dig head {currentDepth.toFixed(2)}m
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                        <div className="flex items-start gap-3">
                                            {nextUtilityDelta !== null && nextUtilityDelta <= 0.4 ? (
                                                <AlertTriangle size={18} className="text-[var(--red)] mt-0.5 shrink-0" />
                                            ) : (
                                                <ShieldCheck size={18} className="text-[var(--green)] mt-0.5 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-[var(--text-primary)]">
                                                    {nextUtility
                                                        ? utilityAction(nextUtility, nextUtilityDelta)
                                                        : 'No deeper mapped utility is within the current dig envelope.'}
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                                                    {selectedClearance.decision_note}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Card className="p-5">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <Layers3 size={12} />
                                        Cached Twin Package
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Twin snapshot</span>
                                            <span className="font-black text-[var(--text-primary)]">{selectedClearance.twin_snapshot_year || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Utility layers</span>
                                            <span className="font-black text-[var(--text-primary)]">{roadUtilities.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Field marking</span>
                                            <span className="font-black text-[var(--text-primary)]">{selectedClearance.field_marking_status.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                                            {selectedClearance.twin_note || 'Twin metadata is available through the linked pre-dig package.'}
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-5">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <Radio size={12} />
                                        Owner Contacts
                                    </div>
                                    <div className="space-y-3">
                                        {roadUtilities.map((item) => {
                                            const owner = organizationById.get(item.utility_org_id) || null;
                                            return (
                                                <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-black text-[var(--text-primary)]">{owner?.name || item.utility_type}</div>
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                                {item.utility_type} · {item.depth_avg_m.toFixed(2)}m
                                                            </div>
                                                        </div>
                                                        {owner?.contact_phone ? (
                                                            <a href={`tel:${owner.contact_phone}`} className="btn btn-secondary btn-sm">
                                                                <Phone size={12} />
                                                                Call
                                                            </a>
                                                        ) : (
                                                            <Badge variant="info">No direct line</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
                        <Card className="p-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Overlay Objects</div>
                            <div className="space-y-4">
                                {roadUtilities.map((item) => {
                                    const owner = organizationById.get(item.utility_org_id) || null;
                                    const depthDelta = Number((item.depth_avg_m - currentDepth).toFixed(2));
                                    return (
                                        <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div>
                                                    <div className="text-sm font-black text-[var(--text-primary)]">{item.utility_type}</div>
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                        {owner?.code || owner?.name || 'Utility owner'} · {item.material || 'Asset corridor'}
                                                    </div>
                                                </div>
                                                <Badge variant={bandVariant(utilityRiskBand(item))}>{depthDelta <= 0 ? 'breached' : `${depthDelta}m away`}</Badge>
                                            </div>
                                            <div className="mt-3 text-xs text-[var(--text-secondary)] leading-6">
                                                {utilityAction(item, depthDelta)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Quick Actions</div>
                            <Button variant="ghost" className="w-full justify-between" onClick={() => navigate(`/clearance?permit=${selectedClearance.permit_number}`)}>
                                Open clearance desk
                                <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="w-full justify-between" onClick={() => navigate(`/twin?road=${encodeURIComponent(selectedClearance.road_name)}`)}>
                                Open digital twin corridor
                                <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="w-full justify-between" onClick={() => navigate(`/field?permit=${selectedClearance.permit_number}`)}>
                                Update field marking
                                <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="w-full justify-between" onClick={() => navigate('/utility')}>
                                Utility coordination desk
                                <ArrowRight size={14} />
                            </Button>

                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                    <MapPin size={12} />
                                    Field Package Note
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] leading-6">
                                    {selectedClearance.latest_field_note || 'No synced field note is attached yet. Capture utility marking before excavation begins.'}
                                </div>
                            </div>

                            {selectedPermit?.urgency === 'emergency' && (
                                <div className="rounded-2xl border border-[var(--red-border)] bg-[var(--red-bg)]/40 px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <Siren size={16} className="text-[var(--red)] mt-0.5 shrink-0" />
                                        <div className="text-xs text-[var(--text-secondary)] leading-6">
                                            This permit is marked emergency. Keep the emergency desk open and confirm owner presence before deeper cuts.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
                                <Route size={12} />
                                Corridor Context
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] leading-6">
                                {selectedPermit?.purpose || 'Excavation corridor selected from the dig-safe queue.'}
                            </div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
                                <Cable size={12} />
                                Utility Spread
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] leading-6">
                                {selectedClearance.utility_types.join(', ') || 'No mapped underground utility layers are available for this road segment yet.'}
                            </div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
                                <Waves size={12} />
                                Safety Posture
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] leading-6">
                                {selectedClearance.status === 'cleared'
                                    ? 'Proceed with normal supervised excavation and keep the QR board visible on site.'
                                    : selectedClearance.status === 'restricted'
                                        ? 'Proceed only with hand-dig supervision, updated field notes, and owner coordination on standby.'
                                        : selectedClearance.status === 'gpr_required'
                                            ? 'Do not start trenching until GPR or physical verification confirms the safe dig envelope.'
                                            : 'Block trench opening until the pre-dig clearance desk resolves conflicts and field readiness issues.'}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
