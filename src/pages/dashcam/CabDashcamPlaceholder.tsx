import { Card, Button, Badge } from '../../components/ui';
import { Camera, Satellite, Wifi, ShieldAlert, Play, Database, HardDrive, Cpu } from 'lucide-react';

export function CabDashcamPlaceholder() {
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Edge Fleet Integration <Satellite className="text-[var(--purple)]" size={24} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">Real-time telemetric video analysis via transport partner network</p>
                </div>
                <Badge variant="warning" className="px-4 py-1 text-[10px] tracking-widest uppercase">Phase 4: Restricted Access</Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Connection Status */}
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

                    <div className="p-4 rounded-xl bg-[var(--brand-light)] border border-[var(--purple-border)] border-dashed">
                        <div className="text-[8px] font-black text-[var(--purple)] uppercase tracking-widest mb-2">Partner API Hook</div>
                        <div className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                            Waiting for OAuth confirmation from <span className="text-[var(--text-primary)]">UBER INDIA</span> and <span className="text-[var(--text-primary)]">OLA FLEET</span> infrastructure groups.
                        </div>
                    </div>
                </Card>

                {/* Tactical Feed Simulation */}
                <Card className="lg:col-span-2 p-1 border-[var(--border)] bg-[var(--bg-surface)] flex flex-col min-h-[400px] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[var(--bg-panel)]/80 flex flex-col items-center justify-center space-y-6 z-10 backdrop-blur-sm group-hover:backdrop-blur-none transition-all duration-700">
                        <div className="w-20 h-20 rounded-full bg-[var(--purple-bg)] flex items-center justify-center border border-[var(--purple-border)] group-hover:scale-110 transition-transform">
                            <Play className="text-[var(--purple)] fill-current" size={32} />
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.4em] mb-2">FEED ENCRYPTED</div>
                            <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Awaiting valid tactical license for real-time video stream</div>
                        </div>
                        <Button className="bg-purple-600 hover:bg-purple-500 text-[var(--text-primary)] font-black text-[10px] tracking-widest uppercase">Request Access</Button>
                    </div>

                    {/* Pseudo-grid for feed */}
                    <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-1 p-1 opacity-20 grayscale">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="bg-[var(--bg-hover)] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                        ))}
                    </div>

                    {/* Overlay HUD */}
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <Badge variant="error" className="bg-red-500 text-[var(--text-primary)] border-none uppercase text-[8px]">LIVE</Badge>
                        <div className="px-2 py-0.5 bg-[var(--bg-hover)] backdrop-blur-md rounded border border-[var(--border)] text-[8px] font-bold text-[var(--text-primary)] uppercase">CAM_MUM_NORTH_422</div>
                    </div>
                </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-8 pt-4">
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--blue-bg)] flex items-center justify-center border border-[var(--blue-border)] shadow-xl shadow-blue-500/5">
                        <HardDrive className="text-[var(--blue)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">0.0 GB</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Processed Video Data</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--purple-bg)] flex items-center justify-center border border-[var(--purple-border)] shadow-xl shadow-purple-500/5">
                        <Cpu className="text-[var(--purple)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">0 INF</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Neural Inferences/Sec</div>
                    </div>
                </Card>
                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-xl shadow-orange-500/5">
                        <ShieldAlert className="text-[var(--brand)]" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] tracking-widest">OFFLINE</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Automatic Anomaly Detection</div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
