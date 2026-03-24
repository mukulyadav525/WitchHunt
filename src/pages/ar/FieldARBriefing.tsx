import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
import {
    listExcavationPermitsData,
    listPreDigClearancesData,
    listPublicWorksitesData,
    listRoadSegmentsData,
    listRoadTwinSnapshotsData,
    listUtilityInfrastructureData,
    listUtilityOrganizationsData
} from '../../lib/supabaseData';
import type {
    ExcavationPermit,
    PreDigClearanceRecord,
    PublicWorksite,
    RoadSegment,
    UtilityInfrastructure,
    UtilityOrganization
} from '../../types';
import {
    AlertTriangle,
    ArrowRight,
    Cable,
    Construction,
    Layers3,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    Smartphone,
    WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

type TwinSnapshotRow = {
    road_segment_id: string;
    snapshot_year: number;
    note: string | null;
};

type OverlayUtility = UtilityInfrastructure & {
    organization: UtilityOrganization | null;
    delta_from_dig_depth_m: number;
    absolute_gap_m: number;
    hazard_state: 'danger' | 'warning' | 'clear';
};

function clearanceVariant(status: PreDigClearanceRecord['status']) {
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

function utilityTone(type: UtilityInfrastructure['utility_type']) {
    switch (type) {
        case 'water':
            return {
                accent: 'var(--blue)',
                bg: 'color-mix(in srgb, var(--blue) 12%, var(--bg-panel))',
                border: 'color-mix(in srgb, var(--blue) 35%, var(--border))',
                label: 'Blue'
            };
        case 'telecom':
            return {
                accent: 'var(--green)',
                bg: 'color-mix(in srgb, var(--green) 12%, var(--bg-panel))',
                border: 'color-mix(in srgb, var(--green) 35%, var(--border))',
                label: 'Green'
            };
        case 'electricity':
            return {
                accent: 'var(--red)',
                bg: 'color-mix(in srgb, var(--red) 10%, var(--bg-panel))',
                border: 'color-mix(in srgb, var(--red) 35%, var(--border))',
                label: 'Red'
            };
        case 'gas':
            return {
                accent: 'var(--yellow)',
                bg: 'color-mix(in srgb, var(--yellow) 16%, var(--bg-panel))',
                border: 'color-mix(in srgb, var(--yellow) 35%, var(--border))',
                label: 'Yellow'
            };
        default:
            return {
                accent: 'var(--text-secondary)',
                bg: 'var(--bg-panel)',
                border: 'var(--border)',
                label: 'Grey'
            };
    }
}

function hazardCopy(utility: OverlayUtility | null) {
    if (!utility) {
        return {
            title: 'No mapped subsurface assets',
            body: 'This corridor does not yet have utility geometry loaded into the AR briefing layer.'
        };
    }

    const typeLabel = utility.utility_type === 'telecom' ? 'fiber / telecom' : utility.utility_type;
    const gap = utility.absolute_gap_m.toFixed(2);
    const direction = utility.delta_from_dig_depth_m >= 0 ? 'below' : 'above';

    if (utility.hazard_state === 'danger') {
        return {
            title: 'Stop mechanical digging',
            body: `Current trench depth is inside the mapped ${typeLabel} safety envelope. The nearest asset sits about ${gap}m ${direction} the current dig line.`
        };
    }

    if (utility.hazard_state === 'warning') {
        return {
            title: 'Hand-dig supervision required',
            body: `${typeLabel} is only ${gap}m ${direction} the current dig line. Keep the site under utility-owner supervision and verify alignment before proceeding.`
        };
    }

    return {
        title: 'Mapped utility gap is still available',
        body: `${typeLabel} remains about ${gap}m ${direction} the current dig line. Continue only with the live clearance checklist and field marking already in place.`
    };
}

function depthBandLabel(utility: UtilityInfrastructure) {
    if (utility.depth_min_m != null && utility.depth_max_m != null) {
        return `${utility.depth_min_m.toFixed(2)}m - ${utility.depth_max_m.toFixed(2)}m`;
    }
    return `${utility.depth_avg_m.toFixed(2)}m avg`;
}

export function FieldARBriefing() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clearances, setClearances] = useState<PreDigClearanceRecord[]>([]);
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [utilities, setUtilities] = useState<UtilityInfrastructure[]>([]);
    const [organizations, setOrganizations] = useState<UtilityOrganization[]>([]);
    const [twinRows, setTwinRows] = useState<TwinSnapshotRow[]>([]);
    const [selectedPermitNumber, setSelectedPermitNumber] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentDigDepth, setCurrentDigDepth] = useState(0.8);
    const [selectedUtilityId, setSelectedUtilityId] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [
                    nextClearances,
                    nextPermits,
                    nextRoads,
                    nextWorksites,
                    nextUtilities,
                    nextOrganizations,
                    nextTwinRows
                ] = await Promise.all([
                    listPreDigClearancesData(),
                    listExcavationPermitsData(),
                    listRoadSegmentsData(),
                    listPublicWorksitesData(),
                    listUtilityInfrastructureData(),
                    listUtilityOrganizationsData(),
                    listRoadTwinSnapshotsData()
                ]);

                setClearances(nextClearances);
                setPermits(nextPermits);
                setRoads(nextRoads);
                setWorksites(nextWorksites);
                setUtilities(nextUtilities);
                setOrganizations(nextOrganizations);
                setTwinRows(nextTwinRows as TwinSnapshotRow[]);

                const permitQuery = searchParams.get('permit');
                const roadQuery = searchParams.get('road');
                const selectedFromQuery = nextClearances.find((record) =>
                    record.permit_number === permitQuery
                    || (roadQuery ? record.road_name === roadQuery : false)
                );
                const nextSelected = selectedFromQuery?.permit_number || nextClearances[0]?.permit_number || '';
                setSelectedPermitNumber((current) => selectedFromQuery?.permit_number || current || nextSelected);
            } catch (error: any) {
                toast.error(error.message || 'Unable to load field AR briefing data from Supabase.');
            }
        };

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

    useEffect(() => {
        if (!selectedClearance) return;
        setCurrentDigDepth(selectedClearance.requested_depth_m);
    }, [selectedClearance?.permit_number, selectedClearance?.requested_depth_m]);

    const selectedPermit = selectedClearance
        ? permits.find((permit) => permit.permit_number === selectedClearance.permit_number) || null
        : null;
    const selectedRoad = selectedClearance
        ? roads.find((road) => road.id === selectedPermit?.road_segment_id || road.name === selectedClearance.road_name) || null
        : null;
    const selectedWorksite = selectedClearance
        ? worksites.find((site) => site.permit_number === selectedClearance.permit_number)
            || worksites.find((site) => site.road_name === selectedClearance.road_name)
            || null
        : null;
    const selectedTwin = selectedRoad
        ? [...twinRows]
            .filter((row) => row.road_segment_id === selectedRoad.id)
            .sort((a, b) => b.snapshot_year - a.snapshot_year)[0] || null
        : null;

    const overlayUtilities = useMemo<OverlayUtility[]>(() => {
        if (!selectedClearance) return [];

        return utilities
            .filter((utility) => utility.road_name === selectedClearance.road_name && utility.status !== 'abandoned')
            .map((utility) => {
                const delta = Number((utility.depth_avg_m - currentDigDepth).toFixed(2));
                const absoluteGap = Math.abs(delta);
                const hazardState: OverlayUtility['hazard_state'] = absoluteGap < 0.25 ? 'danger' : absoluteGap < 0.5 ? 'warning' : 'clear';
                return {
                    ...utility,
                    organization: organizations.find((org) => org.id === utility.utility_org_id) || null,
                    delta_from_dig_depth_m: delta,
                    absolute_gap_m: absoluteGap,
                    hazard_state: hazardState
                };
            })
            .sort((a, b) => a.absolute_gap_m - b.absolute_gap_m);
    }, [currentDigDepth, organizations, selectedClearance, utilities]);

    useEffect(() => {
        if (!overlayUtilities.length) {
            setSelectedUtilityId('');
            return;
        }

        setSelectedUtilityId((current) =>
            overlayUtilities.some((utility) => utility.id === current) ? current : overlayUtilities[0].id
        );
    }, [overlayUtilities]);

    const selectedUtility = overlayUtilities.find((utility) => utility.id === selectedUtilityId) || overlayUtilities[0] || null;
    const safetyNarrative = hazardCopy(selectedUtility);

    const ownersReachable = useMemo(() => {
        return new Set(
            overlayUtilities
                .filter((utility) => utility.organization?.contact_phone || utility.organization?.contact_email)
                .map((utility) => utility.organization?.id)
        ).size;
    }, [overlayUtilities]);

    const maxDigDepth = useMemo(() => {
        const utilityMax = overlayUtilities.reduce((max, utility) => Math.max(max, utility.depth_max_m ?? utility.depth_avg_m), 1.5);
        const requested = selectedClearance?.requested_depth_m ?? 0.8;
        return Number(Math.max(1.5, utilityMax + 0.6, requested + 0.5).toFixed(2));
    }, [overlayUtilities, selectedClearance]);

    const offlinePacketState = !selectedClearance
        ? 'pending'
        : selectedClearance.ar_overlay_status === 'ready' && selectedClearance.field_marking_status === 'synced' && Boolean(selectedTwin)
            ? 'ready'
            : selectedClearance.ar_overlay_status === 'not_ready'
                ? 'pending'
                : 'partial';

    if (!selectedClearance) {
        return <div className="page-container">No field AR briefing records are available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Field AR Safety Briefing <Smartphone className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Mobile-first underground briefing with live dig depth guidance, owner contacts, and corridor readiness before trench opening.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">F-08 AR Mobile View</Badge>
                    <Button variant="ghost" onClick={() => navigate(`/clearance?permit=${selectedClearance.permit_number}`)}>
                        Pre-Dig Clearance
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/twin?road=${encodeURIComponent(selectedClearance.road_name)}`)}>
                        Digital Twin
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Overlay Objects</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{overlayUtilities.length}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Current Dig Depth</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{currentDigDepth.toFixed(2)}m</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Reachable Owners</div>
                    <div className="text-3xl font-black text-[var(--brand)]">{ownersReachable}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Offline Packet</div>
                    <div className="text-xl font-black text-[var(--green)]">{offlinePacketState}</div>
                </Card>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,2.1fr)]">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">AR Permit Queue</div>
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
                                    <Badge variant={clearanceVariant(record.status)}>{record.status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                                    <span className="text-[var(--text-secondary)] truncate">{record.organization}</span>
                                    <span className="font-black text-[var(--text-primary)]">{record.ar_overlay_status.replace(/_/g, ' ')}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Active Corridor</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedClearance.road_name}</h2>
                                <div className="text-sm text-[var(--text-secondary)] mt-2 break-words">
                                    {selectedClearance.permit_number} · {selectedClearance.organization}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={clearanceVariant(selectedClearance.status)}>{selectedClearance.status.replace(/_/g, ' ')}</Badge>
                                <Badge variant={selectedClearance.gpr_required ? 'warning' : 'success'}>
                                    {selectedClearance.gpr_required ? 'GPR hold' : 'No GPR hold'}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-[1.35fr,0.65fr] gap-6">
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 space-y-5">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Depth Measurement Tool</div>
                                        <div className="text-sm text-[var(--text-secondary)] mt-2">
                                            Adjust current trench depth and review the nearest mapped asset in real time.
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={maxDigDepth}
                                        step="0.05"
                                        value={currentDigDepth}
                                        onChange={(event) => setCurrentDigDepth(Number(event.target.value) || 0)}
                                        className="w-28"
                                    />
                                </div>

                                <input
                                    type="range"
                                    min="0"
                                    max={maxDigDepth}
                                    step="0.05"
                                    value={currentDigDepth}
                                    onChange={(event) => setCurrentDigDepth(Number(event.target.value))}
                                    className="w-full accent-[var(--brand)]"
                                />

                                <div
                                    className="rounded-2xl border px-4 py-4"
                                    style={{
                                        background: selectedUtility?.hazard_state === 'danger'
                                            ? 'color-mix(in srgb, var(--red) 10%, var(--bg-panel))'
                                            : selectedUtility?.hazard_state === 'warning'
                                                ? 'color-mix(in srgb, var(--yellow) 12%, var(--bg-panel))'
                                                : 'color-mix(in srgb, var(--green) 10%, var(--bg-panel))',
                                        borderColor: selectedUtility?.hazard_state === 'danger'
                                            ? 'color-mix(in srgb, var(--red) 30%, var(--border))'
                                            : selectedUtility?.hazard_state === 'warning'
                                                ? 'color-mix(in srgb, var(--yellow) 30%, var(--border))'
                                                : 'color-mix(in srgb, var(--green) 30%, var(--border))'
                                    }}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        Safety Readout
                                    </div>
                                    <div className="text-lg font-black text-[var(--text-primary)]">{safetyNarrative.title}</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                        {safetyNarrative.body}
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Requested Depth</div>
                                        <div className="text-lg font-black text-[var(--text-primary)]">{selectedClearance.requested_depth_m.toFixed(2)}m</div>
                                    </div>
                                    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Nearest Utility Gap</div>
                                        <div className="text-lg font-black text-[var(--text-primary)]">{selectedUtility ? `${selectedUtility.absolute_gap_m.toFixed(2)}m` : 'N/A'}</div>
                                    </div>
                                    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Field Marking</div>
                                        <div className="text-lg font-black text-[var(--text-primary)]">{selectedClearance.field_marking_status.replace(/_/g, ' ')}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
                                        <MapPin size={12} />
                                        Corridor Context
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Purpose</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedPermit?.purpose || selectedWorksite?.purpose || 'Not tagged'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Worksite status</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedWorksite?.status || 'No worksite'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Twin snapshot</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{selectedTwin?.snapshot_year || 'No snapshot'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Offline packet</span>
                                            <span className="font-black text-[var(--text-primary)] text-right">{offlinePacketState}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed break-words">
                                        {selectedClearance.latest_field_note || selectedTwin?.note || 'No field or twin note is currently attached to this corridor.'}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
                                        <Layers3 size={12} />
                                        AR Legend
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        {(['water', 'telecom', 'electricity', 'gas'] as const).map((type) => {
                                            const tone = utilityTone(type);
                                            return (
                                                <div key={type} className="flex items-center gap-3">
                                                    <span className="h-3 w-3 rounded-full" style={{ background: tone.accent }} />
                                                    <span className="font-black text-[var(--text-primary)] capitalize">{type === 'telecom' ? 'Fiber / Telecom' : type}</span>
                                                    <span>{tone.label} corridor overlay</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                        <Card className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Overlay Objects</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-2">
                                        Tap an asset card to inspect depth, owner, and the local safety envelope.
                                    </div>
                                </div>
                                <Badge variant="info">{overlayUtilities.length} mapped</Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {overlayUtilities.map((utility) => {
                                    const tone = utilityTone(utility.utility_type);
                                    return (
                                        <button
                                            key={utility.id}
                                            type="button"
                                            onClick={() => setSelectedUtilityId(utility.id)}
                                            className="rounded-2xl border p-4 text-left transition-colors"
                                            style={selectedUtilityId === utility.id
                                                ? { background: tone.bg, borderColor: tone.border }
                                                : { background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black text-[var(--text-primary)] capitalize">
                                                        {utility.utility_type === 'telecom' ? 'Fiber / Telecom' : utility.utility_type}
                                                    </div>
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1 truncate">
                                                        {utility.organization?.name || 'Unknown owner'}
                                                    </div>
                                                </div>
                                                <Badge variant={utility.hazard_state === 'danger' ? 'error' : utility.hazard_state === 'warning' ? 'warning' : 'success'}>
                                                    {utility.absolute_gap_m.toFixed(2)}m
                                                </Badge>
                                            </div>
                                            <div className="mt-4 text-xs text-[var(--text-secondary)] leading-relaxed break-words">
                                                Depth band {depthBandLabel(utility)} · {utility.material || 'Material not recorded'} · {utility.status.replace(/_/g, ' ')}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>

                        <Card className="p-6 space-y-5">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Utility</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-2">
                                    Owner contact and infrastructure details for the currently highlighted asset.
                                </div>
                            </div>

                            {selectedUtility ? (
                                <>
                                    <div
                                        className="rounded-2xl border p-5"
                                        style={{
                                            background: utilityTone(selectedUtility.utility_type).bg,
                                            borderColor: utilityTone(selectedUtility.utility_type).border
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <div className="text-lg font-black text-[var(--text-primary)] capitalize">
                                                    {selectedUtility.utility_type === 'telecom' ? 'Fiber / Telecom' : selectedUtility.utility_type}
                                                </div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                    {selectedUtility.organization?.name || 'Unknown owner'}
                                                </div>
                                            </div>
                                            <Badge variant={selectedUtility.hazard_state === 'danger' ? 'error' : selectedUtility.hazard_state === 'warning' ? 'warning' : 'success'}>
                                                {selectedUtility.hazard_state}
                                            </Badge>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm text-[var(--text-secondary)]">
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Depth Band</div>
                                                <div className="font-black text-[var(--text-primary)]">{depthBandLabel(selectedUtility)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Current Offset</div>
                                                <div className="font-black text-[var(--text-primary)]">
                                                    {selectedUtility.delta_from_dig_depth_m >= 0
                                                        ? `${selectedUtility.delta_from_dig_depth_m.toFixed(2)}m below dig line`
                                                        : `${Math.abs(selectedUtility.delta_from_dig_depth_m).toFixed(2)}m above dig line`}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Material</div>
                                                <div className="font-black text-[var(--text-primary)]">{selectedUtility.material || 'Not recorded'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Diameter / Spec</div>
                                                <div className="font-black text-[var(--text-primary)]">
                                                    {selectedUtility.diameter_mm ? `${selectedUtility.diameter_mm} mm` : selectedUtility.spec_value || 'Not recorded'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Phone size={14} className="text-[var(--brand)] shrink-0" />
                                                <span className="text-sm text-[var(--text-secondary)]">Emergency phone</span>
                                            </div>
                                            <span className="text-sm font-black text-[var(--text-primary)] text-right break-all">
                                                {selectedUtility.organization?.contact_phone || 'Not available'}
                                            </span>
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Mail size={14} className="text-[var(--brand)] shrink-0" />
                                                <span className="text-sm text-[var(--text-secondary)]">Owner email</span>
                                            </div>
                                            <span className="text-sm font-black text-[var(--text-primary)] text-right break-all">
                                                {selectedUtility.organization?.contact_email || 'Not available'}
                                            </span>
                                        </div>
                                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Cable size={14} className="text-[var(--brand)] shrink-0" />
                                                <span className="text-sm text-[var(--text-secondary)]">Portal access</span>
                                            </div>
                                            <span className="text-sm font-black text-[var(--text-primary)] text-right">
                                                {selectedUtility.organization?.portal_access_enabled ? 'Live' : 'Restricted'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 text-sm text-[var(--text-secondary)]">
                                    No mapped utility details are available for this corridor yet.
                                </div>
                            )}
                        </Card>
                    </div>

                    <Card className="p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Field Actions</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-2">
                                    The same permit can move from briefing to dig-safe clearance, field marking, twin review, and public tracking without losing context.
                                </div>
                            </div>
                            <Badge variant={offlinePacketState === 'ready' ? 'success' : offlinePacketState === 'partial' ? 'warning' : 'error'}>
                                {offlinePacketState} packet
                            </Badge>
                        </div>

                        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Button onClick={() => navigate(`/clearance?permit=${selectedClearance.permit_number}`)}>
                                <ShieldCheck size={14} /> Clearance Desk
                            </Button>
                            <Button variant="secondary" onClick={() => navigate(`/field?permit=${selectedClearance.permit_number}`)}>
                                <Construction size={14} /> Field Capture
                            </Button>
                            <Button variant="ghost" onClick={() => navigate(`/utility`)}>
                                <Cable size={14} /> Utility Portal
                            </Button>
                            <Button variant="ghost" onClick={() => navigate(`/track/${selectedClearance.permit_number}`)}>
                                Public Tracker <ArrowRight size={14} />
                            </Button>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                    <WifiOff size={12} />
                                    Offline Readiness
                                </div>
                                <div className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">
                                    {offlinePacketState === 'ready'
                                        ? 'Twin, field marking, and utility overlay data are all present for a field-ready corridor briefing.'
                                        : offlinePacketState === 'partial'
                                            ? 'Some AR inputs are present, but the corridor still needs either synced field marking, richer utility geometry, or a recent twin snapshot.'
                                            : 'This corridor is not ready for a dependable field AR packet yet.'}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                    <AlertTriangle size={12} />
                                    Required Actions
                                </div>
                                <div className="space-y-2">
                                    {selectedClearance.required_actions.slice(0, 3).map((action) => (
                                        <div key={action} className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">
                                            {action}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                    <MapPin size={12} />
                                    Site Movement
                                </div>
                                <div className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">
                                    {selectedWorksite?.detour
                                        ? `Traffic detour in force: ${selectedWorksite.detour}`
                                        : 'No detour route has been attached to this worksite yet.'}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
