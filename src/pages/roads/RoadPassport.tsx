import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Card, Badge, Button } from '../../components/ui';
import {
    Activity,
    Calendar,
    TrendingDown,
    AlertTriangle,
    Droplets,
    Construction,
    Shield,
    ArrowLeft,
    Clock,
    FileText
} from 'lucide-react';
import { RoadSegment, HealthPrediction } from '../../types';
import { HealthTrendChart } from '../../components/charts/HealthTrendChart';

export function RoadPassport() {
    const { id } = useParams();
    const [road, setRoad] = useState<RoadSegment | null>(null);
    const [prediction, setPrediction] = useState<HealthPrediction | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);

            const [roadRes, predRes] = await Promise.all([
                supabase.from('road_segments').select('*').eq('id', id).single(),
                supabase.from('health_predictions').select('*').eq('road_segment_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
            ]);

            if (roadRes.data) setRoad(roadRes.data);
            if (predRes.data) setPrediction(predRes.data);
            setIsLoading(false);
        };

        fetchData();
    }, [id]);

    if (isLoading) return <div className="p-20 flex justify-center"><div className="spinner w-8 h-8" /></div>;
    if (!road) return <div className="p-20 text-center font-black uppercase text-[var(--red)]">Record Not Found</div>;

    return (
        <div className="p-8 space-y-8 leading-none">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="p-3 rounded-xl bg-[var(--blue-bg)] border border-[var(--blue-border)]">
                        <Shield className="text-[var(--blue)]" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-widest">{road.name}</h1>
                            <Badge variant="info">{road.road_id}</Badge>
                        </div>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">{road.ward} · Municipal Zone {road.zone || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => window.print()}><FileText size={16} /> Export Passport</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Core Stats */}
                <Card className="bg-[var(--bg-hover)] border-[var(--border)] p-8 space-y-10">
                    <div className="flex flex-col items-center py-6">
                        <ScoreRing score={road.health_score} size={180} strokeWidth={12} label="Health Index" />
                    </div>

                    <div className="space-y-6">
                        <div className="section-title">Structural Properties</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Surface Type</div>
                                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase">{road.surface_type}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Width/Length</div>
                                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase">{road.width_m}m / {road.length_km}km</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="section-title">Traffic Profile</div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-[var(--text-muted)] uppercase">Avg Daily Traffic</span>
                                <span className="text-[var(--text-primary)]">{road.avg_daily_traffic?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-[var(--text-muted)] uppercase">Heavy Vehicles</span>
                                <span className="text-[var(--yellow)]">{road.heavy_vehicle_percentage}%</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Mid Col: Analytics & Trends */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="bg-[var(--bg-hover)] border-[var(--border)] p-6 flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-[var(--red-bg)] flex items-center justify-center">
                                <TrendingDown className="text-[var(--red)]" size={24} />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Failure Prediction</div>
                                <div className="text-xl font-black text-[var(--text-primary)] uppercase tracking-widest">
                                    {prediction?.predicted_failure_date ? new Date(prediction.predicted_failure_date).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="text-[10px] font-bold text-[var(--red)] uppercase">Est. {prediction?.months_remaining} Months Remaining</div>
                            </div>
                        </Card>

                        <Card className="bg-[var(--bg-hover)] border-[var(--border)] p-6 flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-orange-600/10 flex items-center justify-center">
                                <AlertTriangle className="text-[var(--brand)]" size={24} />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Risk Level</div>
                                <div className="text-xl font-black text-[var(--brand)] uppercase tracking-widest">
                                    {prediction?.risk_level || 'Calculating...'}
                                </div>
                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Based on Deterioration Rate: {prediction?.deterioration_rate}%</div>
                            </div>
                        </Card>
                    </div>

                    <Card className="bg-[var(--bg-hover)] border-[var(--border)] p-8 h-[300px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="section-title !m-0">Structural Integrity Trend</div>
                            <Badge variant="info" className="bg-[var(--blue-bg)] text-[var(--blue)]">Auto-Forecast Enabled</Badge>
                        </div>
                        <HealthTrendChart roadId={road.id} />
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="section-title">Critical Deterioration Factors</div>
                            <div className="space-y-3">
                                {prediction?.risk_factors?.map((f: any, i: number) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border)]">
                                        <Droplets size={16} className="text-[var(--blue)] mt-1" />
                                        <div>
                                            <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-1">{f.factor}</div>
                                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase leading-relaxed">{f.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="section-title">AI Maintenance Recommendation</div>
                            <Card className="bg-[var(--brand)]/5 border-[var(--blue-border)] p-6">
                                <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium italic">
                                    "{prediction?.recommendation || 'Continuous monitoring recommended until next survey cycle.'}"
                                </p>
                                <div className="mt-6 pt-6 border-t border-blue-500/10 flex items-center justify-between">
                                    <div className="text-[9px] font-black text-[var(--blue)] uppercase tracking-widest leading-none">Estimated Budget</div>
                                    <div className="text-lg font-black text-[var(--text-primary)]">₹{(prediction?.budget_estimate_inr || 0).toLocaleString()}</div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
