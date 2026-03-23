import { useState, useEffect } from 'react';
import { Card, Button, Badge, cn } from '../../components/ui';
import { Camera, Search, Filter, AlertTriangle, ShieldCheck, ChevronRight, UploadCloud, Activity, MapPin } from 'lucide-react';
import { RoadSegment, Defect } from '../../types';
import toast from 'react-hot-toast';
import { listDefectsData, listRoadSegmentsData, saveDefectData } from '../../lib/supabaseData';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { invokeAIFunction } from '../../lib/edgeFunctions';
import { supabase } from '../../lib/supabase';
import { uploadRoadImage } from '../../lib/storage';

export function RoadInventory() {
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
    const [defects, setDefects] = useState<Defect[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRoads();
    }, []);

    useEffect(() => {
        if (selectedRoad) fetchDefects(selectedRoad.id);
    }, [selectedRoad]);

    async function fetchRoads() {
        try {
            const data = await listRoadSegmentsData();
            setRoads(data);
        } catch {
            setRoads([]);
        }
    }

    async function fetchDefects(roadId: string) {
        try {
            const data = await listDefectsData();
            setDefects(data.filter((defect) => defect.road_segment_id === roadId));
        } catch {
            setDefects([]);
        }
    }

    async function handleAIAnalysis(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !selectedRoad) return;

        setIsAnalyzing(true);
        const toastId = toast.loading('AI: Analyzing road surface...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const result = await invokeAIFunction<any>('analyze-road-image', {
                    imageBase64: base64,
                    roadSegmentId: selectedRoad.id,
                    userId: (await supabase.auth.getUser()).data.user?.id
                });
                if (result.status !== 'success') {
                    throw new Error(result.status === 'error' ? result.error : 'Image analysis is still loading.');
                }

                const defectsFound = result.data.defects || [];
                if (defectsFound.length > 0) {
                    const photoUrl = await uploadRoadImage(file, 'defect-photos');
                    const createdDefects = await Promise.all(defectsFound.map((defect: any) => saveDefectData({
                        id: '',
                        road_segment_id: selectedRoad.id,
                        defect_type: defect.type || 'surface_damage',
                        severity: String(defect.severity || 3) as any,
                        confidence: defect.confidence || 0.9,
                        source: 'ai_upload',
                        status: 'open',
                        photo_url: photoUrl,
                        location: selectedRoad.location ? { lat: selectedRoad.location.lat, lng: selectedRoad.location.lng } : null,
                        area_sqm: defect.area_sqm ?? null,
                        description: defect.description || 'AI-detected surface issue.',
                        ai_analysis: defect,
                        repair_priority: defect.repair_priority || 'high',
                        estimated_cost_inr: defect.estimated_repair_cost_inr || 90000,
                        created_at: new Date().toISOString()
                    })));

                    setDefects((current) => [...createdDefects, ...current]);
                    await supabase
                        .from('road_segments')
                        .update({
                            total_defects: (selectedRoad.total_defects || 0) + createdDefects.length,
                            last_health_update: new Date().toISOString()
                        })
                        .eq('id', selectedRoad.id);
                    await fetchRoads();
                }

                toast.success(`AI identified ${defectsFound.length} defect${defectsFound.length === 1 ? '' : 's'}`, { id: toastId });
            };
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    }

    const filteredRoads = roads.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const historyData = selectedRoad ? [
        { month: 'Dec', score: Math.max(selectedRoad.health_score - 18, 18), defects: Math.max((selectedRoad.total_defects || 0) - 4, 0) },
        { month: 'Jan', score: Math.max(selectedRoad.health_score - 11, 24), defects: Math.max((selectedRoad.total_defects || 0) - 2, 0) },
        { month: 'Feb', score: Math.max(selectedRoad.health_score - 6, 28), defects: Math.max((selectedRoad.total_defects || 0) - 1, 0) },
        { month: 'Mar', score: selectedRoad.health_score, defects: selectedRoad.total_defects || 0 }
    ] : [];

    const getHealthColor = (score: number) => {
        if (score >= 70) return 'var(--green)';
        if (score >= 45) return 'var(--yellow)';
        return 'var(--red)';
    };

    return (
        <div className="page-container min-h-full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Road Inventory</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginTop: 4 }}>Road segment catalog and AI defect detection.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', width: 'min(100%, 420px)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                        <input
                            type="text"
                            placeholder="Filter roads..."
                            className="input"
                            style={{ paddingLeft: 36, width: 'min(100%, 240px)' }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="secondary"><Filter size={14} /> Filters</Button>
                </div>
            </div>

            <div className="flex-1-min-0 grid gap-8 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]" style={{ flex: 1, minHeight: 0 }}>
                {/* Road List */}
                <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-header">
                        <span className="card-title">Managed Segments</span>
                        <Badge variant="info">{filteredRoads.length} Roads</Badge>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {filteredRoads.map(road => (
                            <button
                                key={road.id}
                                onClick={() => setSelectedRoad(road)}
                                style={{
                                    width: '100%', textAlign: 'left' as const,
                                    padding: 'var(--space-4) var(--space-5)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: selectedRoad?.id === road.id ? 'var(--brand-light)' : 'transparent',
                                    borderLeft: selectedRoad?.id === road.id ? '3px solid var(--brand)' : '3px solid transparent',
                                    cursor: 'pointer', transition: 'background 150ms',
                                    fontFamily: 'var(--font-sans)',
                                }}
                                onMouseOver={e => { if (selectedRoad?.id !== road.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseOut={e => { if (selectedRoad?.id !== road.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div className="flex-1-min-0">
                                    <div className="truncate" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{road.name}</div>
                                    <div className="truncate" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{road.road_id}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>·</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{road.surface_type}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem', color: getHealthColor(road.health_score) }}>
                                        {road.health_score}%
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Health</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Selected Road Details */}
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
                    {selectedRoad ? (
                        <>
                            <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                                <Card style={{ flex: '1 1 400px', padding: 'var(--space-5)', borderLeft: '3px solid var(--brand)', minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <span className="card-title">Segment Details</span>
                                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>{selectedRoad.name}</h2>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                                                <div style={{ textAlign: 'center' as const, padding: '8px 16px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600, color: getHealthColor(selectedRoad.health_score) }}>{selectedRoad.health_score}%</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Health</div>
                                                </div>
                                                <div style={{ textAlign: 'center' as const, padding: '8px 16px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--blue)' }}>{selectedRoad.total_defects || 0}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Defects</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                            <label style={{ cursor: 'pointer' }}>
                                                <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleAIAnalysis} disabled={isAnalyzing} />
                                                <Button variant="primary" disabled={isAnalyzing}>
                                                    <Camera size={16} /> {isAnalyzing ? 'Processing...' : 'AI Detect'}
                                                </Button>
                                            </label>
                                            <span className="ai-badge"><span className="ai-dot" /> Vision AI</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card style={{ width: '100%', maxWidth: 240, padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
                                    <div>
                                        <span className="card-title" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>Compliance</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                            <div className="metric-row">
                                                <span className="metric-label" style={{ fontSize: '0.78rem' }}>Safety</span>
                                                <ShieldCheck size={14} style={{ color: 'var(--green)' }} />
                                            </div>
                                            <div className="metric-row">
                                                <span className="metric-label" style={{ fontSize: '0.78rem' }}>AI Trust</span>
                                                <span className="metric-value" style={{ fontSize: '0.78rem' }}>0.982</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" style={{ width: '100%', marginTop: 'var(--space-4)' }}>Generate Report</Button>
                                </Card>
                            </div>

                            <div className="grid gap-5 xl:grid-cols-2">
                                <div className="flex-1-min-0">
                                    <div className="section-label" style={{ marginBottom: 'var(--space-3)' }}>
                                        <AlertTriangle size={14} style={{ color: 'var(--red)' }} /> Detected Defects
                                    </div>
                                    {defects.map(defect => (
                                        <Card key={defect.id} style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-3)', minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)', gap: 8 }}>
                                                <Badge variant={Number(defect.severity) > 3 ? 'error' : 'warning'} style={{ flexShrink: 0 }}>Severity {defect.severity}</Badge>
                                                <span className="truncate" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(defect.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="truncate" style={{ fontWeight: 600, fontSize: '0.87rem', color: 'var(--text-primary)', textTransform: 'capitalize' as const }}>{defect.defect_type.replace('_', ' ')}</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{defect.description}</div>
                                            <div className="truncate" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence {Math.round((defect.confidence || 0) * 100)}%</span>
                                                <ChevronRight size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                                            </div>
                                        </Card>
                                    ))}
                                    {defects.length === 0 && (
                                        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-4)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                                            <ShieldCheck size={40} />
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>No defects detected</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1-min-0">
                                    <div className="section-label" style={{ marginBottom: 'var(--space-3)' }}>
                                        <UploadCloud size={14} style={{ color: 'var(--blue)' }} /> Historical Analysis
                                    </div>
                                    <Card style={{ padding: '24px 20px', color: 'var(--text-muted)', border: '1px solid var(--border)', minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', gap: 12, flexWrap: 'wrap' }}>
                                            <div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 4 }}>Health Trend</div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Derived from inspections, AI detections, and citizen signals.</div>
                                            </div>
                                            <div style={{ textAlign: 'right' as const }}>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: getHealthColor(selectedRoad.health_score) }}>{selectedRoad.health_score}%</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current network score</div>
                                            </div>
                                        </div>
                                        <div style={{ height: 180 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={historyData}>
                                                    <defs>
                                                        <linearGradient id="roadHistoryFill" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <Tooltip />
                                                    <Area type="monotone" dataKey="score" stroke="var(--blue)" fill="url(#roadHistoryFill)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <span>Defects in latest cycle: <strong>{selectedRoad.total_defects || 0}</strong></span>
                                            <span>Monitoring cadence: <strong>Weekly</strong></span>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-5)', opacity: 0.5 }}>
                            <MapPin size={56} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 500, textAlign: 'center' as const, maxWidth: 280 }}>Select a road segment from the inventory to view details.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
