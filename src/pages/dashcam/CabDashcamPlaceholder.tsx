import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import { Camera, Satellite, Wifi, ShieldAlert, Play, Database, HardDrive, Cpu, Route, AlertTriangle, ArrowRight, ClipboardList, TimerReset, Radar } from 'lucide-react';
import {
    createWorkOrderFromFleetEventData,
    listFleetCameraEventsData,
    listSignalFusionCasesData,
    saveFleetCameraEventData
} from '../../lib/supabaseData';
import type { FleetCameraEvent, SignalFusionCase } from '../../types';
import toast from 'react-hot-toast';

export function CabDashcamPlaceholder() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<FleetCameraEvent[]>([]);
    const [signalCases, setSignalCases] = useState<SignalFusionCase[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [nextEvents, nextSignalCases] = await Promise.all([
                listFleetCameraEventsData(),
                listSignalFusionCasesData()
            ]);
            setEvents(nextEvents);
            setSignalCases(nextSignalCases);
        };

        void loadData();
    }, []);

    const liveEvents = events.filter((event) => event.status !== 'resolved');
    const criticalEvents = liveEvents.filter((event) => event.severity === 'critical').length;
    const triagedEvents = liveEvents.filter((event) => event.status === 'triaged' || event.status === 'dispatched').length;
    const fusionBackedCorridors = signalCases.filter((item) => item.fleet_hits > 0).length;
    const activePartners = new Set(liveEvents.map((event) => event.partner)).size;
    const routesCovered = new Set(liveEvents.map((event) => event.route_name)).size;
    const averageConfidence = liveEvents.length
        ? `${Math.round((liveEvents.reduce((sum, event) => sum + event.confidence, 0) / liveEvents.length) * 100)}%`
        : '0%';
    const processedEvents = `${events.length}`;

    const updateEvent = async (event: FleetCameraEvent) => {
        const saved = await saveFleetCameraEventData(event);
        setEvents((current) => current.map((item) => item.id === saved.id ? saved : item));
        return saved;
    };

    const handleAdvanceStatus = (event: FleetCameraEvent) => {
        const nextStatus: FleetCameraEvent['status'] = event.status === 'queued'
            ? 'triaged'
            : event.status === 'triaged'
                ? 'dispatched'
                : 'resolved';
        void updateEvent({
            ...event,
            status: nextStatus
        });
        toast.success(`Fleet event moved to ${nextStatus}.`);
    };

    const handleCreateDispatch = (event: FleetCameraEvent) => {
        void (async () => {
            const result = await createWorkOrderFromFleetEventData(event);
            const refreshedEvents = await listFleetCameraEventsData();
            setEvents(refreshedEvents);
            toast.success(result.created ? 'Fleet-triggered work order generated.' : 'Open work order already exists for this fleet event.');
            navigate('/work-orders');
        })();
    };

    return (
        <div className="page-container">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Fleet Dispatch Intelligence <Satellite className="text-[var(--blue)]" size={24} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">
                        Real-time road defect sensing from partner vehicle networks with dispatch-ready triage
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/signal-fusion')}>
                        Signal Fusion
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/traffic')}>
                        Traffic Command
                    </Button>
                    <Badge variant="success" className="px-4 py-1 text-[10px] tracking-widest uppercase">Live ingestion enabled</Badge>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50 space-y-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Network Status</div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border)]">
                            <div className="flex items-center gap-3">
                                <Wifi size={14} className="text-[var(--green)]" />
                                <div className="text-xs font-bold text-[var(--text-secondary)]">Edge Gateway</div>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--green)]">ONLINE</div>
                        </div>
                        <div className="flex items-center justify-between bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border)]">
                            <div className="flex items-center gap-3">
                                <Database size={14} className="text-[var(--blue)]" />
                                <div className="text-xs font-bold text-[var(--text-secondary)]">Partner Auth</div>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--blue)]">CONNECTED</div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--brand-light)] border border-[var(--blue-border)] border-dashed">
                        <div className="text-[8px] font-black text-[var(--blue)] uppercase tracking-widest mb-2">Coverage Snapshot</div>
                        <div className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                            {activePartners} partner network{activePartners === 1 ? '' : 's'} and {routesCovered} active corridor{routesCovered === 1 ? '' : 's'} are currently feeding fleet detections into the dispatch queue.
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-6 border-[var(--border)] bg-[var(--bg-surface)] flex flex-col min-h-[400px] relative overflow-hidden">
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <Badge variant="error" className="bg-red-500 text-[var(--text-primary)] border-none uppercase text-[8px]">LIVE</Badge>
                        <div className="px-2 py-0.5 bg-[var(--bg-hover)] backdrop-blur-md rounded border border-[var(--border)] text-[8px] font-bold text-[var(--text-primary)] uppercase">
                            CAM_IND_CORE_204
                        </div>
                    </div>

                    <div className="flex-1 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.65))] border border-[var(--border)] relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1 p-3 opacity-20">
                            {[...Array(16)].map((_, index) => (
                                <div key={index} className="bg-[var(--bg-hover)] animate-pulse" style={{ animationDelay: `${index * 120}ms` }} />
                            ))}
                        </div>

                        <div className="relative z-10 flex flex-col items-center space-y-5 text-center px-8">
                            <div className="w-20 h-20 rounded-full bg-[var(--blue-bg)] flex items-center justify-center border border-[var(--blue-border)]">
                                <Play className="text-[var(--blue)] fill-current" size={32} />
                            </div>
                            <div>
                                <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.4em] mb-2">ANALYTICS PIPELINE ACTIVE</div>
                                <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                                    Video frames are being deduplicated, geotagged, and prioritized into the fleet triage queue
                                </div>
                            </div>
                            <Button className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-primary)] font-black text-[10px] tracking-widest uppercase" onClick={() => navigate('/work-orders')}>
                                Open Dispatch Queue
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--blue-bg)] flex items-center justify-center border border-[var(--blue-border)]">
                        <HardDrive className="text-[var(--blue)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">{processedEvents}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Events Ingestion Total</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--blue-bg)] flex items-center justify-center border border-[var(--blue-border)]">
                        <Cpu className="text-[var(--blue)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">{averageConfidence}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Average AI Confidence</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <AlertTriangle className="text-[var(--brand)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">{criticalEvents}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Critical Alerts</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--green-bg)] flex items-center justify-center border border-[var(--green-border)]">
                        <Route className="text-[var(--green)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">{routesCovered}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Routes Covered</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center border border-[var(--brand-border)]">
                        <ClipboardList className="text-[var(--brand)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">{triagedEvents}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Triage / Dispatch</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--blue-bg)] flex items-center justify-center border border-[var(--blue-border)]">
                        <Radar className="text-[var(--blue)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">{fusionBackedCorridors}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Fusion Corridors</div>
                    </div>
                </Card>
            </div>

            <Card className="border-[var(--border)] overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-between">
                    <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.25em] flex items-center gap-2">
                        <Camera size={14} className="text-[var(--blue)]" />
                        Active Fleet Detections
                    </div>
                    <Badge variant="info">{liveEvents.length} live items</Badge>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
                    {liveEvents.map((event) => (
                        <div key={event.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <Badge variant={event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warning'}>
                                        {event.severity}
                                    </Badge>
                                    <span className="text-sm font-black text-[var(--text-primary)] uppercase">{event.event_type.replace('_', ' ')}</span>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    {event.partner} · {event.route_name} · {event.camera_id}
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] mt-2">{event.road_name}</div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Badge variant="info">{event.status}</Badge>
                                </div>
                            </div>
                            <div className="min-w-[260px] space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-black text-[var(--blue)]">{Math.round(event.confidence * 100)}%</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                        {new Date(event.captured_at).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button size="sm" variant="secondary" onClick={() => handleAdvanceStatus(event)}>
                                        <TimerReset size={12} /> Advance
                                    </Button>
                                    <Button size="sm" onClick={() => handleCreateDispatch(event)}>
                                        <ArrowRight size={12} /> Dispatch
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
