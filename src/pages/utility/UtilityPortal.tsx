import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Badge, Input } from '../../components/ui';
import { Zap, Droplets, Flame, Activity, ShieldAlert, Upload, Plus, Search, ChevronRight } from 'lucide-react';
import { UtilityInfrastructure, UtilityOrganization } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function UtilityPortal() {
    const [orgs, setOrgs] = useState<UtilityOrganization[]>([]);
    const [infra, setInfra] = useState<UtilityInfrastructure[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);
        const [{ data: o }, { data: i }, { data: c }] = await Promise.all([
            supabase.from('utility_organizations').select('*'),
            supabase.from('utility_infrastructure').select('*').limit(20),
            supabase.from('utility_conflict_zones').select('*').limit(10)
        ]);

        if (o) setOrgs(o);
        if (i) setInfra(i);
        if (c) setConflicts(c);
        setLoading(false);
    }

    const getOrgIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'electricity': return <Zap className="text-[var(--yellow)]" size={16} />;
            case 'water': return <Droplets className="text-[var(--blue)]" size={16} />;
            case 'gas': return <Flame className="text-[var(--brand)]" size={16} />;
            default: return <Activity className="text-[var(--text-secondary)]" size={16} />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Utility Asset Portal <Zap className="text-[var(--blue)]" size={24} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">Underground Infrastructure Management & Conflict Resolution</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <Upload size={16} className="mr-2" />
                        Import GIS (CSV/JSON)
                    </Button>
                    <Button className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-primary)] font-bold">
                        <Plus size={16} className="mr-2" />
                        Register Asset
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Org Sidebar */}
                <div className="space-y-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Stakeholder Organizations</div>
                    <div className="grid gap-2">
                        {orgs.map(org => (
                            <button
                                key={org.id}
                                onClick={() => setSelectedOrg(org.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left group",
                                    selectedOrg === org.id
                                        ? "bg-[var(--blue-bg)] border-[var(--blue-border)] text-[var(--text-primary)]"
                                        : "bg-[var(--bg-panel)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shadow-lg">
                                    {getOrgIcon(org.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{org.name}</div>
                                    <div className="text-[8px] font-black uppercase tracking-tighter opacity-50">{org.code}</div>
                                </div>
                                <ChevronRight size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", selectedOrg === org.id && "opacity-100")} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Conflict Watch */}
                        <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ShieldAlert size={80} className="text-[var(--red)]" />
                            </div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-[var(--red-bg)] flex items-center justify-center">
                                    <ShieldAlert className="text-[var(--red)]" size={18} />
                                </div>
                                <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Spatial Conflict Watch</div>
                            </div>

                            <div className="space-y-4">
                                {conflicts.map(conflict => (
                                    <div key={conflict.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-red-500/20 text-[var(--red)] border-none text-[8px] uppercase">{conflict.risk_level} Risk</Badge>
                                            <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase">{new Date(conflict.detected_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-xs font-bold text-[var(--text-primary)] mb-1">{conflict.conflict_type.replace('_', ' ')}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] italic leading-relaxed">"{conflict.notes}"</div>
                                    </div>
                                ))}
                                {conflicts.length === 0 && (
                                    <div className="py-20 text-center space-y-3 opacity-20">
                                        <Activity size={32} className="mx-auto" />
                                        <div className="text-[10px] font-black uppercase tracking-widest">No Active Overlaps</div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Infrastructure Stats */}
                        <div className="space-y-6">
                            <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]">
                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6 px-1">Network Density</div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                                        <div className="text-xs text-[var(--text-secondary)]">Total Registered Length</div>
                                        <div className="text-xl font-mono font-black text-[var(--text-primary)] tracking-tighter">428.5 <span className="text-[10px] text-[var(--text-muted)]">KM</span></div>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                                        <div className="text-xs text-[var(--text-secondary)]">Critical Condition Segments</div>
                                        <div className="text-xl font-mono font-black text-[var(--red)] tracking-tighter">12 <span className="text-[10px] text-[var(--text-muted)]">ASSETS</span></div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 border-[var(--border)] bg-[var(--brand)]/5 border-dashed">
                                <div className="text-[10px] font-black text-[var(--blue)] uppercase tracking-widest mb-4">AI Prediction</div>
                                <div className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                                    "Based on historical data, we predict a high probability of coordination failure between MCGM Water and MSEDCL Power departments in Ward G-South during the next 45 days. Recommended: <span className="text-[var(--blue)]">Coordinated Inspection Bundle.</span>"
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Asset List Table */}
                    <Card className="border-[var(--border)] bg-[var(--bg-surface)]/50 overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-panel)]">
                            <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Asset Registry</div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                                <Input className="bg-[var(--bg-surface)] border-[var(--border)] text-xs pl-9 w-64 h-8" placeholder="Search by road or ID..." />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--bg-surface)]/50 border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th className="p-4 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Asset Type</th>
                                        <th className="p-4 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Location</th>
                                        <th className="p-4 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Depth</th>
                                        <th className="p-4 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Condition</th>
                                        <th className="p-4 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Last Check</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900/50">
                                    {infra.map(item => (
                                        <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                            <td className="p-4">
                                                <div className="text-xs font-bold text-[var(--text-primary)] uppercase">{item.utility_type}</div>
                                                <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{item.status}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs text-[var(--text-secondary)]">{item.road_name}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs font-mono text-[var(--blue)] font-bold">{item.depth_avg_meters}M</div>
                                            </td>
                                            <td className="p-4">
                                                <Badge className={cn(
                                                    "border-none text-[8px] uppercase px-2 h-4",
                                                    item.condition === 'good' ? "bg-[var(--green-bg)] text-[var(--green)]" :
                                                        item.condition === 'critical' ? "bg-[var(--red-bg)] text-[var(--red)]" : "bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                                                )}>
                                                    {item.condition}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{item.last_inspected || 'Never'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
