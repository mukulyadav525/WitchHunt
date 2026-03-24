import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import { CrossSectionDiagram } from '../../components/map/CrossSectionDiagram';
import {
    listPublicWorksitesData,
    listRoadSegmentsData,
    listRoadTwinSnapshotsData,
    listUtilityInfrastructureData
} from '../../lib/supabaseData';
import { PublicWorksite, RoadSegment, UtilityInfrastructure } from '../../types';
import { Activity, ArrowRight, Construction, Layers3, MapPin, ShieldAlert, ShieldCheck, Waves } from 'lucide-react';
import toast from 'react-hot-toast';

type UtilityLayer = UtilityInfrastructure['utility_type'];

const ALL_LAYERS: UtilityLayer[] = ['water', 'electricity', 'gas', 'telecom', 'sewage'];

export function DigitalTwinRoadView() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [utilities, setUtilities] = useState<UtilityInfrastructure[]>([]);
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [roadSnapshots, setRoadSnapshots] = useState<Record<string, { year: number; health_score: number; defect_count: number; visible_utilities: number; active_workzones: number; note: string; }[]>>({});
    const [selectedRoadId, setSelectedRoadId] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeLayers, setActiveLayers] = useState<Set<UtilityLayer>>(new Set(ALL_LAYERS));

    useEffect(() => {
        const loadData = async () => {
            try {
                const [roadData, utilityData, worksiteData, snapshotRows] = await Promise.all([
                    listRoadSegmentsData(),
                    listUtilityInfrastructureData(),
                    listPublicWorksitesData(),
                    listRoadTwinSnapshotsData()
                ]);
                const groupedSnapshots = snapshotRows.reduce<Record<string, { year: number; health_score: number; defect_count: number; visible_utilities: number; active_workzones: number; note: string; }[]>>((acc, row) => {
                    acc[row.road_segment_id] = [
                        ...(acc[row.road_segment_id] || []),
                        {
                            year: row.snapshot_year,
                            health_score: row.health_score,
                            defect_count: row.defect_count,
                            visible_utilities: row.visible_utilities,
                            active_workzones: row.active_workzones,
                            note: row.note || 'Twin snapshot recorded.'
                        }
                    ];
                    return acc;
                }, {});

                Object.values(groupedSnapshots).forEach((entries) => entries.sort((a, b) => a.year - b.year));

                setRoads(roadData);
                setUtilities(utilityData);
                setWorksites(worksiteData);
                setRoadSnapshots(groupedSnapshots);
                const requestedRoadName = searchParams.get('road');
                const requestedRoad = roadData.find((item) => item.name === requestedRoadName) || null;
                setSelectedRoadId((current) => requestedRoad?.id || current || roadData[0]?.id || '');
            } catch (error: any) {
                setRoads([]);
                setUtilities([]);
                setWorksites([]);
                setRoadSnapshots({});
                toast.error(error.message || 'Unable to load digital twin data from Supabase.');
            }
        };

        loadData();
    }, [searchParams]);

    const selectedRoad = roads.find((road) => road.id === selectedRoadId) || roads[0] || null;
    const snapshots = selectedRoad ? roadSnapshots[selectedRoad.id] || [] : [];
    const availableYears = snapshots.length ? snapshots.map((snapshot) => snapshot.year) : [2026];
    const activeSnapshot = [...snapshots].reverse().find((snapshot) => snapshot.year <= selectedYear) || snapshots[snapshots.length - 1] || null;

    const visibleUtilities = useMemo(() => {
        if (!selectedRoad) return [];
        return utilities.filter((utility) => {
            const matchesRoad = utility.road_name === selectedRoad.name;
            const installYear = utility.installation_date ? new Date(utility.installation_date).getFullYear() : 2026;
            const matchesYear = installYear <= selectedYear;
            const matchesLayer = activeLayers.has(utility.utility_type);
            return matchesRoad && matchesYear && matchesLayer;
        });
    }, [activeLayers, selectedRoad, selectedYear, utilities]);

    const relatedWorksites = selectedRoad
        ? worksites.filter((worksite) => worksite.road_name === selectedRoad.name)
        : [];

    const toggleLayer = (layer: UtilityLayer) => {
        setActiveLayers((current) => {
            const next = new Set(current);
            if (next.has(layer)) next.delete(layer);
            else next.add(layer);
            return next;
        });
    };

    if (!selectedRoad) {
        return <div className="page-container">No road data available.</div>;
    }

    const criticalUtilities = visibleUtilities.filter((utility) => utility.risk_level === 'critical' || utility.condition === 'critical').length;

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Digital Twin Road View <Layers3 className="text-[var(--blue)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Underground cross-section, temporal infrastructure state, and field-safe digging advisories.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="info">F-08 Digital Twin</Badge>
                    <Button variant="ghost" onClick={() => navigate(`/field-ar?road=${encodeURIComponent(selectedRoad.name)}`)}>
                        Field AR
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/clearance?road=${encodeURIComponent(selectedRoad.name)}`)}>
                        Pre-Dig Clearance
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/roads/${selectedRoad.id}`)}>
                        Open Road Passport
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[0.9fr,2.1fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Road Selection</div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {roads.map((road) => (
                            <button
                                key={road.id}
                                onClick={() => setSelectedRoadId(road.id)}
                                className="w-full text-left p-4 transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedRoadId === road.id ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="text-sm font-black text-[var(--text-primary)]">{road.name}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                    {road.ward} · Health {road.health_score}%
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8">
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Visible Utilities</div>
                            <div className="text-3xl font-black text-[var(--text-primary)]">{visibleUtilities.length}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Critical Conflicts</div>
                            <div className="text-3xl font-black text-[var(--red)]">{criticalUtilities}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Active Works</div>
                            <div className="text-3xl font-black text-[var(--brand)]">{relatedWorksites.filter((site) => site.status !== 'completed').length}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Snapshot Year</div>
                            <div className="text-3xl font-black text-[var(--blue)]">{selectedYear}</div>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Temporal Twin State</div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedRoad.name}</h2>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {availableYears.map((year) => (
                                    <Button
                                        key={year}
                                        size="sm"
                                        variant={selectedYear === year ? 'primary' : 'ghost'}
                                        onClick={() => setSelectedYear(year)}
                                    >
                                        {year}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {activeSnapshot && (
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Snapshot Narrative</div>
                                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{activeSnapshot.note}</div>
                                    <div className="grid grid-cols-2 gap-4 mt-5">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Health</div>
                                            <div className="text-lg font-black text-[var(--text-primary)]">{activeSnapshot.health_score}%</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Defects</div>
                                            <div className="text-lg font-black text-[var(--text-primary)]">{activeSnapshot.defect_count}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Layer Controls</div>
                                    <div className="flex gap-2 flex-wrap">
                                        {ALL_LAYERS.map((layer) => (
                                            <Button
                                                key={layer}
                                                size="sm"
                                                variant={activeLayers.has(layer) ? 'primary' : 'ghost'}
                                                onClick={() => toggleLayer(layer)}
                                            >
                                                {layer}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="mt-5 p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border)]">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                            <ShieldCheck size={12} className="text-[var(--green)]" />
                                            Field Advisory
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                            {criticalUtilities > 0
                                                ? 'Critical utility overlap exists in the current twin state. Hand-digging and on-site owner supervision are mandatory before breaking surface.'
                                                : 'No critical overlap is visible in the current twin state. Standard pre-dig checklist and night-window traffic plan remain sufficient.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <CrossSectionDiagram roadName={`${selectedRoad.name} (${selectedYear})`} utilities={visibleUtilities} />
                    </Card>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Construction className="text-[var(--brand)]" size={18} />
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Active Work Zones</div>
                            </div>
                            <div className="space-y-4">
                                {relatedWorksites.length > 0 ? relatedWorksites.map((worksite) => (
                                    <div key={worksite.id} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-black text-[var(--text-primary)]">{worksite.purpose}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                    {worksite.permit_number} · {worksite.status}
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => navigate(`/track/${worksite.permit_number}`)}>
                                                Track <ArrowRight size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-sm text-[var(--text-muted)]">No related worksites are registered for this road.</div>
                                )}
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="text-[var(--blue)]" size={18} />
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Twin Insights</div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        <MapPin size={12} className="text-[var(--blue)]" />
                                        Corridor Profile
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        {selectedRoad.length_km} km corridor · {selectedRoad.width_m} m width · {selectedRoad.avg_daily_traffic?.toLocaleString()} daily vehicles
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        <Waves size={12} className="text-[var(--blue)]" />
                                        Surface to Subsurface
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        {visibleUtilities.length > 0
                                            ? `${visibleUtilities.length} utility corridors are visible in the selected twin year, with average burial depth of ${(visibleUtilities.reduce((sum, item) => sum + item.depth_avg_m, 0) / visibleUtilities.length).toFixed(1)}m.`
                                            : 'No registered utilities are visible for the selected year and layer combination.'}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        <ShieldAlert size={12} className="text-[var(--brand)]" />
                                        Risk Summary
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        {criticalUtilities > 0
                                            ? `${criticalUtilities} critical utility asset${criticalUtilities === 1 ? '' : 's'} require protected excavation logic in the current twin configuration.`
                                            : 'The current twin state shows no critical utility conflicts, but standard dig-safe supervision is still required.'}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
