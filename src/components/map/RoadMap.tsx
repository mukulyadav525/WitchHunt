import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RoadSegment, Defect } from '../../types';
import { useUIStore } from '../../store/uiStore';
import L from 'leaflet';

// Fix for default marker icons in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
    roads: RoadSegment[];
    defects?: Defect[];
    center?: [number, number];
    zoom?: number;
    className?: string;
}

export function RoadMap({ roads, defects = [], center = [28.6139, 77.2090], zoom = 13, className }: Props) {
    const { theme } = useUIStore();

    const getHealthColor = (score: number) => {
        if (score >= 70) return '#16803c'; // Green
        if (score >= 45) return '#a16207'; // Yellow/amber
        return '#dc2626'; // Red
    };

    const tileUrl = theme === 'dark'
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    return (
        <div className={className}>
            <MapContainer
                center={center}
                zoom={zoom}
                className="h-full w-full rounded-lg overflow-hidden"
                style={{ background: 'var(--bg-panel)' }}
            >
                <TileLayer
                    url={tileUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {roads.map(road => (
                    <Polyline
                        key={road.id}
                        positions={(road.location?.bounds as [number, number][]) || []}
                        pathOptions={{
                            color: getHealthColor(road.health_score),
                            weight: 5,
                            opacity: 0.8
                        }}
                    >
                        <Popup>
                            <div style={{ padding: 8, minWidth: 150 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{road.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Health Score</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: getHealthColor(road.health_score) }}>{road.health_score}</span>
                                </div>
                            </div>
                        </Popup>
                    </Polyline>
                ))}

                {defects.map(defect => (
                    <Marker
                        key={defect.id}
                        position={[defect.location?.lat || 0, defect.location?.lng || 0]}
                    >
                        <Popup>
                            <div style={{ padding: 8 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 4 }}>Defect Detected</div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{defect.defect_type.replace('_', ' ')}</div>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Confidence {Math.round((defect.confidence || 0) * 100)}%</span>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Severity: {defect.severity}</div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
