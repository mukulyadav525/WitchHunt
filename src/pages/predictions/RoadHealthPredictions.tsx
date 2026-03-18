import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Badge, cn } from '../../components/ui';
import { TrendingUp, AlertCircle, Calendar, DollarSign, BrainCircuit, Activity, ChevronRight, RefreshCw, Clock } from 'lucide-react';
import { RoadSegment, HealthPrediction } from '../../types';
import toast from 'react-hot-toast';

export function RoadHealthPredictions() {
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
    const [prediction, setPrediction] = useState<HealthPrediction | null>(null);
    const [isPredicting, setIsPredicting] = useState(false);

    useEffect(() => {
        fetchRoads();
    }, []);

    useEffect(() => {
        if (selectedRoad) fetchLatestPrediction(selectedRoad.id);
    }, [selectedRoad]);

    async function fetchRoads() {
        const { data } = await supabase.from('road_segments').select('*').order('health_score');
        if (data) setRoads(data as RoadSegment[]);
    }

    async function fetchLatestPrediction(roadId: string) {
        const { data } = await supabase
            .from('health_predictions')
            .select('*')
            .eq('road_segment_id', roadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (data) setPrediction(data as HealthPrediction);
        else setPrediction(null);
    }

    async function runAIPrediction() {
        if (!selectedRoad) return;
        setIsPredicting(true);
        const toastId = toast.loading('Intelligence Core: Modeling Deterioration Vectors…');

        try {
            const { data, error } = await supabase.functions.invoke('predict-road-failure', {
                body: {
                    roadSegmentId: selectedRoad.id,
                    roadData: {
                        road_name: selectedRoad.name,
                        surface_type: selectedRoad.surface_type,
                        current_health_score: selectedRoad.health_score,
                        defect_count: selectedRoad.total_defects
                        // In a real app, we'd pass much more data here
                    },
                    userId: (await supabase.auth.getUser()).data.user?.id
                }
            });

            if (error) throw error;

            toast.success('Failure prediction and maintenance strategy synthesized', { id: toastId });
            fetchLatestPrediction(selectedRoad.id);
            fetchRoads();
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsPredicting(false);
        }
    }

    return (
        <div className="p-8 h-screen flex flex-col pt-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] uppercase tracking-widest">Predictive Analytics</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Forecasting infrastructure decay and optimizing maintenance budget ROI.</p>
                </div>
                <div className="flex items-center gap-3 bg-[var(--blue-bg)] border border-[var(--blue-border)] px-4 py-2 rounded-xl">
                    <BrainCircuit className="text-[var(--blue)]" size={16} />
                    <span className="text-[10px] font-bold text-[var(--blue)] uppercase tracking-widest">AI Engine: Forecasting Unit v2.1</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-8 flex-1 min-h-0">
                {/* Risk List */}
                <div className="lg:col-span-1 border border-[var(--border)] rounded-2xl bg-[var(--bg-surface)] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)] font-bold text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] flex justify-between items-center">
                        Risk Assessment
                        <Badge variant="info">{roads.length} Segments</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {roads.map(road => (
                            <button
                                key={road.id}
                                onClick={() => setSelectedRoad(road)}
                                className={cn(
                                    "w-full text-left p-5 border-b border-[var(--border-subtle)] transition-all flex items-center justify-between group",
                                    selectedRoad?.id === road.id ? "bg-red-500/5 border-l-2 border-l-red-600" : "hover:bg-[var(--bg-hover)]"
                                )}
                            >
                                <div>
                                    <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--red)] transition-colors uppercase tracking-tight">{road.name}</div>
                                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Last Sync: {road.last_health_update ? new Date(road.last_health_update).toLocaleDateString() : 'Never'}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <div className={cn(
                                        "font-mono font-bold text-sm",
                                        road.health_score > 80 ? "text-[var(--green)]" : road.health_score > 40 ? "text-[var(--yellow)]" : "text-[var(--red)]"
                                    )}>
                                        {road.health_score}%
                                    </div>
                                    <div className="text-[8px] font-bold text-[var(--text-disabled)] uppercase tracking-widest uppercase">Score</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prediction Report */}
                <div className="lg:col-span-3 overflow-y-auto no-scrollbar space-y-6">
                    {selectedRoad ? (
                        <>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl flex items-center justify-center">
                                        <TrendingUp className="text-[var(--blue)]" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-tight">{selectedRoad.name}</h2>
                                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">{selectedRoad.road_id} • Structural Unit</div>
                                    </div>
                                </div>
                                <Button
                                    onClick={runAIPrediction}
                                    disabled={isPredicting}
                                    className="flex items-center gap-2 group"
                                >
                                    {isPredicting ? <RefreshCw className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                                    {isPredicting ? 'Synthesizing…' : 'Generate AI Forecast'}
                                </Button>
                            </div>

                            {prediction ? (
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* High Level Risk Card */}
                                    <Card className="md:col-span-1 p-6 border-[var(--border)] bg-[var(--bg-panel)] space-y-6">
                                        <div>
                                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 border-b border-[var(--border)] pb-2">Failure Vector</div>
                                            <div className="flex items-end gap-2">
                                                <span className={cn(
                                                    "text-4xl font-black uppercase italic leading-none",
                                                    prediction.risk_level === 'critical' || prediction.risk_level === 'high' ? "text-[var(--red)]" : "text-[var(--green)]"
                                                )}>
                                                    {prediction.risk_level}
                                                </span>
                                            </div>
                                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 px-1">Risk Exposure Rating</div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="text-[var(--blue)]" size={14} />
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">Estimated Failure</span>
                                                </div>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">{new Date(prediction.predicted_failure_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="text-[var(--blue)]" size={14} />
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">Estimated Life</span>
                                                </div>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">{prediction.months_remaining} Months</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="text-[var(--blue)]" size={14} />
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">Decay Rate</span>
                                                </div>
                                                <span className="text-xs font-bold text-[var(--red)]">-{prediction.deterioration_rate} pts/mo</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-[var(--border)]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">AI Confidence</span>
                                                <span className="text-[10px] text-[var(--blue)] font-bold">{Math.round(prediction.confidence * 100)}%</span>
                                            </div>
                                            <div className="h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                                <div className="h-full bg-[var(--blue)]" style={{ width: `${prediction.confidence * 100}%` }} />
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Core Content */}
                                    <div className="md:col-span-2 space-y-6">
                                        <Card className="p-6">
                                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 border-b border-[var(--border)] pb-2">Strategic Recommendation</div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-[var(--blue-bg)] rounded-xl flex items-center justify-center shrink-0">
                                                    <AlertCircle className="text-[var(--blue)]" size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[var(--text-primary)] text-sm leading-relaxed">{prediction.recommendation}</p>
                                                    <div className="mt-4 p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <DollarSign className="text-[var(--green)]" size={16} />
                                                            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">Intervention Budget</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-[var(--text-primary)]">₹{(prediction as any).budget_estimate_inr?.toLocaleString() || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                                    <BrainCircuit size={14} className="text-[var(--purple)]" /> Critical Risk Factors
                                                </h3>
                                                {(prediction as any).risk_factors?.map((f: any, i: number) => (
                                                    <div key={i} className="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-between">
                                                        <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase truncate pr-4">{f.factor}</div>
                                                        <Badge variant={f.impact === 'high' ? 'error' : 'warning'}>{f.impact}</Badge>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={14} className="text-[var(--green)]" /> Proposed Schedule
                                                </h3>
                                                {(prediction as any).maintenance_schedule?.map((item: any, i: number) => (
                                                    <div key={i} className="p-3 rounded-lg border border-[var(--border)] flex items-center justify-between group cursor-pointer hover:bg-[var(--bg-panel)] transition-colors">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-tighter">{item.action}</div>
                                                            <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase mt-1">{new Date(item.due_by).toLocaleDateString()}</div>
                                                        </div>
                                                        <ChevronRight size={14} className="text-[var(--text-disabled)] group-hover:text-[var(--blue)] transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-[var(--text-disabled)] space-y-6 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl opacity-50">
                                    <BrainCircuit size={48} className="animate-pulse" />
                                    <div className="text-center max-w-sm space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-widest">No Predictive Data Available</div>
                                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed uppercase">Engage the Intelligence Core to generate high-fidelity failure modeling for this structural unit.</p>
                                    </div>
                                    <Button onClick={runAIPrediction} variant="secondary" className="text-[10px] bg-[var(--bg-panel)]">Initialize Modeling</Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-disabled)] space-y-6 opacity-30">
                            <Activity size={64} />
                            <div className="text-sm font-bold uppercase tracking-[0.4em] text-center max-w-xs text-[var(--text-muted)]">Select a segment for structural forecasting.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
