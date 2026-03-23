import { MapContainer, TileLayer, CircleMarker, Popup, LayerGroup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { RoadSegment, Defect, UtilityInfrastructure, RoadImageSurvey, UtilityOrganization } from '../../types'
import { Badge, cn } from '../ui'
import { useUIStore } from '../../store/uiStore'

function healthColor(score: number): string {
    if (score >= 70) return '#16803c'
    if (score >= 45) return '#a16207'
    return '#dc2626'
}

type MapLayer = 'health' | 'surveys' | 'defects' | 'utilities' | 'ai_digging'

interface Props {
    roads: RoadSegment[]
    defects: Defect[]
    surveys?: RoadImageSurvey[]
    utilities?: UtilityInfrastructure[]
    organizations?: UtilityOrganization[]
    activeLayers: Set<MapLayer>
    onLayerToggle: (layer: MapLayer) => void
    center?: [number, number]
    zoom?: number
}

export function InfrastructureMap({
    roads,
    defects,
    surveys = [],
    utilities = [],
    organizations = [],
    activeLayers,
    onLayerToggle,
    center = [28.6139, 77.2090],
    zoom = 12
}: Props) {
    const { theme } = useUIStore()

    const tileUrl = theme === 'dark'
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

    const layerLabels: Record<MapLayer, string> = {
        health: 'Road Health',
        surveys: 'Surveys',
        defects: 'Defects',
        utilities: 'Utilities',
        ai_digging: 'AI Digging'
    }

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100%',
            borderRadius: 'var(--radius-md)', overflow: 'hidden',
            border: '1px solid var(--border)', background: 'var(--bg-panel)',
        }}>
            {/* Layer Control Overlay */}
            <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 1000,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex', flexDirection: 'column', gap: 4,
            }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, paddingLeft: 4 }}>Map Layers</div>
                {(['health', 'surveys', 'defects', 'utilities', 'ai_digging'] as MapLayer[]).map(layer => (
                    <button
                        key={layer}
                        onClick={() => onLayerToggle(layer)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem', fontWeight: 600,
                            border: activeLayers.has(layer) ? '1px solid var(--brand-border)' : '1px solid transparent',
                            background: activeLayers.has(layer) ? 'var(--brand-light)' : 'transparent',
                            color: activeLayers.has(layer) ? 'var(--brand)' : 'var(--text-muted)',
                            cursor: 'pointer', transition: 'all 150ms ease',
                            textAlign: 'left' as const, width: '100%',
                            fontFamily: 'var(--font-sans)',
                        }}
                    >
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: activeLayers.has(layer) ? 'var(--brand)' : 'var(--border-strong)',
                        }} />
                        {layerLabels[layer]}
                    </button>
                ))}
            </div>

            <MapContainer
                center={center}
                zoom={zoom}
                zoomControl={false}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url={tileUrl}
                />

                {/* 1. Road Health Layer */}
                {activeLayers.has('health') && (
                    <LayerGroup>
                        {roads.filter(r => r.location).map(road => (
                            <CircleMarker
                                key={road.id}
                                center={[road.location!.lat, road.location!.lng]}
                                radius={8}
                                fillColor={healthColor(road.health_score)}
                                color="#ffffff"
                                fillOpacity={0.7}
                                weight={2}
                            >
                                <Popup>
                                    <div style={{ padding: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{road.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Health: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: healthColor(road.health_score) }}>{road.health_score}%</span></div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Defects: <span style={{ fontWeight: 600 }}>{road.total_defects}</span></div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </LayerGroup>
                )}

                {/* 2. Surveys Layer */}
                {activeLayers.has('surveys') && (
                    <LayerGroup>
                        {surveys.map(survey => (
                            <CircleMarker
                                key={survey.id}
                                center={[survey.lat_center, survey.lng_center]}
                                radius={6}
                                fillColor="var(--blue-mid)"
                                color="var(--blue-mid)"
                                fillOpacity={0.8}
                                weight={1}
                            >
                                <Popup>
                                    <div style={{ padding: 4 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{survey.title}</div>
                                        <img src={survey.photo_url} style={{ width: 128, height: 80, objectFit: 'cover' as const, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 4 }} alt="Survey" />
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </LayerGroup>
                )}

                {/* 3. Defects Layer */}
                {activeLayers.has('defects') && (
                    <LayerGroup>
                        {defects.filter(d => d.location).map(defect => (
                            <CircleMarker
                                key={defect.id}
                                center={[defect.location!.lat, defect.location!.lng]}
                                radius={5}
                                fillColor="#dc2626"
                                color="#dc2626"
                                fillOpacity={0.9}
                                weight={1}
                            >
                                <Popup>
                                    <div style={{ padding: 4 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--red)', textTransform: 'uppercase' as const }}>{defect.defect_type}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity: {defect.severity}/5</div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </LayerGroup>
                )}

                {/* 4. Utilities Layer */}
                {activeLayers.has('utilities') && (
                    <LayerGroup>
                        {utilities.filter(u => u.start_location && u.end_location).map(utility => {
                            const org = organizations.find(o => o.id === utility.utility_org_id);
                            const color = org?.color_hex || '#64748b'

                            return (
                                <Polyline
                                    key={utility.id}
                                    positions={[
                                        [utility.start_location.lat, utility.start_location.lng],
                                        [utility.end_location.lat, utility.end_location.lng]
                                    ]}
                                    color={color}
                                    weight={4}
                                    opacity={0.8}
                                >
                                    <Popup>
                                        <div style={{ padding: 12, minWidth: 200 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                                    <span style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' as const }}>{org?.name || utility.utility_type}</span>
                                                </div>
                                                <Badge variant={(utility as any).status === 'active' ? 'success' : 'warning'}>
                                                    {(utility as any).status || 'Active'}
                                                </Badge>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Material</div>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{utility.material || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Depth</div>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue)' }}>{utility.depth_avg_m}m</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Est. Age</div>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                                        {utility.installation_date ? `${Math.floor((new Date().getTime() - new Date(utility.installation_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} yrs` : 'Unknown'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Safety</div>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: (utility.safety_score || 0) > 80 ? 'var(--green)' : 'var(--yellow)' }}>
                                                        {utility.safety_score || 100}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {utility.road_name} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>UID: {utility.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Polyline>
                            )
                        })}
                    </LayerGroup>
                )}

                {/* 5. AI Digging Advisor Layer */}
                {activeLayers.has('ai_digging') && (
                    <LayerGroup>
                        {utilities.filter(u => u.start_location).map(utility => (
                            <CircleMarker
                                key={`dig-${utility.id}`}
                                center={[utility.start_location.lat + 0.0002, utility.start_location.lng + 0.0002]}
                                radius={20}
                                fillColor={(utility.safety_score || 0) < 60 ? '#dc2626' : '#16803c'}
                                color="transparent"
                                fillOpacity={0.15}
                                weight={0}
                            >
                                <Popup>
                                    <div style={{ padding: 12, minWidth: 220 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <span className="ai-dot" />
                                            <span className="ai-badge">AI Digging Advisor</span>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                                            {(utility.safety_score || 0) < 60
                                                ? "⚠️ HIGH CONFLICT ZONE: Deep utilities detected (1.2m). Hand-digging mandatory."
                                                : "✅ SAFE EXCAVATION: Moderate utility density. Machine digging permitted with caution."}
                                        </div>
                                        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Optimal Method</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--blue)' }}>
                                                {(utility.safety_score || 0) < 60 ? "Vacuum Excavation / Manual" : "Backhoe / Trenching"}
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </LayerGroup>
                )}
            </MapContainer>
        </div>
    )
}
