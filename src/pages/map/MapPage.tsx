import { useState, useEffect } from 'react';
import { InfrastructureMap } from '../../components/map/InfrastructureMap';
import 'leaflet/dist/leaflet.css'
import type { RoadSegment, Defect, UtilityInfrastructure, RoadImageSurvey, UtilityOrganization } from '../../types'
import { Badge } from '../../components/ui'
import { Loader2, Layers, Map as MapIcon } from 'lucide-react';
import {
    listDefectsData,
    listRoadSegmentsData,
    listRoadSurveysData,
    listUtilityInfrastructureData,
    listUtilityOrganizationsData
} from '../../lib/supabaseData';

type MapLayer = 'health' | 'surveys' | 'defects' | 'utilities' | 'ai_digging';

export function MapPage() {
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [defects, setDefects] = useState<Defect[]>([]);
    const [surveys, setSurveys] = useState<RoadImageSurvey[]>([]);
    const [utilities, setUtilities] = useState<UtilityInfrastructure[]>([]);
    const [organizations, setOrganizations] = useState<UtilityOrganization[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLayers, setActiveLayers] = useState<Set<MapLayer>>(new Set(['health', 'utilities']));
    const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchMapData();
    }, []);

    async function fetchMapData() {
        setLoading(true);
        try {
            const [
                nextRoads,
                nextDefects,
                nextSurveys,
                nextUtilities,
                nextOrgs
            ] = await Promise.all([
                listRoadSegmentsData(),
                listDefectsData(),
                listRoadSurveysData(),
                listUtilityInfrastructureData(),
                listUtilityOrganizationsData()
            ]);

            setRoads(nextRoads);
            setDefects(nextDefects);
            setSurveys(nextSurveys);
            setUtilities(nextUtilities);
            setOrganizations(nextOrgs);
            setSelectedOrgIds(new Set(nextOrgs.map(o => o.id)));
        } catch (err) {
            console.error('Failed to fetch map data:', err);
            setRoads([]);
            setDefects([]);
            setSurveys([]);
            setUtilities([]);
            setOrganizations([]);
            setSelectedOrgIds(new Set());
        } finally {
            setLoading(false);
        }
    }

    const toggleLayer = (layer: MapLayer) => {
        const next = new Set(activeLayers);
        if (next.has(layer)) next.delete(layer);
        else next.add(layer);
        setActiveLayers(next);
    };

    const toggleOrg = (id: string) => {
        const next = new Set(selectedOrgIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedOrgIds(next);
    };

    const filteredUtilities = utilities.filter(u => selectedOrgIds.has(u.utility_org_id));

    if (loading) {
        return (
            <div className="page-container" style={{ minHeight: '50vh', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--brand)' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Loading map data...</div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ minHeight: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        Infrastructure Map <MapIcon size={22} style={{ color: 'var(--blue)' }} />
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginTop: 4 }}>Real-time geospatial intelligence & multi-utility pipeline visualization</p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: '6px 14px', borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-panel)', border: '1px solid var(--border)',
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)',
                }}>
                    <Layers size={14} style={{ color: 'var(--blue)' }} />
                    {activeLayers.size} Layers Active
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 'min(68dvh, 760px)', height: 'min(68dvh, 760px)', position: 'relative' }}>
                <InfrastructureMap
                    roads={roads}
                    defects={defects}
                    surveys={surveys}
                    utilities={filteredUtilities}
                    organizations={organizations}
                    activeLayers={activeLayers}
                    onLayerToggle={toggleLayer}
                />

                {/* Legend Overlay */}
                <div style={{
                    position: 'absolute', bottom: 24, left: 24, zIndex: 1000,
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)', width: 'min(220px, calc(100% - 48px))',
                }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
                        Pipeline Legend
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {[
                            { label: 'Gas (IGL)', color: '#ea580c' },
                            { label: 'Water (DJB)', color: '#2563eb' },
                            { label: 'Electric (BSES)', color: '#ca8a04' },
                            { label: 'Fiber (Jio/Airtel)', color: '#0284c7' },
                            { label: 'Sewage (NDMC)', color: '#7c3aed' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                                <div style={{ width: 32, height: 3, borderRadius: 2, background: item.color }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Organization Filter Panel */}
                {activeLayers.has('utilities') && (
                    <div style={{
                        position: 'absolute', top: 16, left: 16, zIndex: 1000,
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)', width: 'min(200px, calc(100% - 32px))',
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                            Pipeline Filtering
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {organizations.map(org => (
                                <button
                                    key={org.id}
                                    onClick={() => toggleOrg(org.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        background: 'transparent', border: 'none',
                                        padding: '4px 0', cursor: 'pointer', textAlign: 'left',
                                        width: '100%'
                                    }}
                                >
                                    <div style={{
                                        width: 16, height: 16, borderRadius: 4,
                                        border: `2px solid ${org.color_hex}`,
                                        background: selectedOrgIds.has(org.id) ? org.color_hex : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {selectedOrgIds.has(org.id) && <div style={{ width: 6, height: 6, borderRadius: 1, background: '#fff' }} />}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedOrgIds.has(org.id) ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {org.name.replace('Limited', 'Ltd').replace('Corporation', 'Corp')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
