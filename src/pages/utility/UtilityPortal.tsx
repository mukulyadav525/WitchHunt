import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Input } from '../../components/ui';
import { Zap, Droplets, Flame, Activity, ShieldAlert, Upload, Plus, Search, ChevronRight, Cable, Layers3 } from 'lucide-react';
import { UtilityConflictZone, UtilityInfrastructure, UtilityOrganization } from '../../types';
import {
    listUtilityConflictZonesData,
    listUtilityInfrastructureData,
    listUtilityOrganizationsData
} from '../../lib/supabaseData';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export function UtilityPortal() {
    const navigate = useNavigate();
    const [orgs, setOrgs] = useState<UtilityOrganization[]>([]);
    const [infra, setInfra] = useState<UtilityInfrastructure[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<UtilityConflictZone[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);

        try {
            const [nextOrgs, nextInfra, nextConflicts] = await Promise.all([
                listUtilityOrganizationsData(),
                listUtilityInfrastructureData(),
                listUtilityConflictZonesData()
            ]);

            setOrgs(nextOrgs);
            setInfra(nextInfra);
            setConflicts(nextConflicts);
            setSelectedOrg((current) => current || nextOrgs[0]?.id || null);
        } catch (error: any) {
            setOrgs([]);
            setInfra([]);
            setConflicts([]);
            setSelectedOrg(null);
            toast.error(error.message || 'Unable to load utility portal data from Supabase.');
        } finally {
            setLoading(false);
        }
    }

    const getOrgIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'electricity':
                return <Zap className="text-[var(--yellow)]" size={16} />;
            case 'water':
                return <Droplets className="text-[var(--blue)]" size={16} />;
            case 'gas':
                return <Flame className="text-[var(--brand)]" size={16} />;
            case 'telecom':
                return <Cable className="text-cyan-400" size={16} />;
            default:
                return <Activity className="text-[var(--text-secondary)]" size={16} />;
        }
    };

    const selectedOrgMeta = orgs.find((org) => org.id === selectedOrg) || null;

    const filteredInfra = useMemo(() => {
        return infra.filter((item) => {
            const matchesOrg = !selectedOrg || item.utility_org_id === selectedOrg;
            const haystack = `${item.road_name} ${item.id} ${item.utility_type} ${item.material || ''}`.toLowerCase();
            const matchesSearch = haystack.includes(searchQuery.toLowerCase());
            return matchesOrg && matchesSearch;
        });
    }, [infra, searchQuery, selectedOrg]);

    const criticalCount = filteredInfra.filter((item) => item.condition === 'critical' || item.risk_level === 'critical').length;
    const maintenanceDue = filteredInfra.filter((item) => item.condition === 'poor' || (item.safety_score || 100) < 70).length;
    const averageDepth = filteredInfra.length
        ? (filteredInfra.reduce((sum, item) => sum + item.depth_avg_m, 0) / filteredInfra.length).toFixed(1)
        : '0.0';

    const highlightedConflicts = conflicts.slice(0, 4);

    return (
        <div className="page-container">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Utility Asset Portal <Zap className="text-[var(--blue)]" size={24} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">
                        Underground infrastructure intelligence, conflict watch, and dig-safe planning
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Button variant="ghost" className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => navigate('/field-ar')}>
                        <Layers3 size={16} className="mr-2" />
                        Field AR Briefing
                    </Button>
                    <Button variant="ghost" className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => navigate('/clearance')}>
                        <ShieldAlert size={16} className="mr-2" />
                        Pre-Dig Clearance
                    </Button>
                    <Button variant="ghost" className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <Upload size={16} className="mr-2" />
                        Import GIS
                    </Button>
                    <Button className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-primary)] font-bold">
                        <Plus size={16} className="mr-2" />
                        Register Asset
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                <div className="space-y-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Stakeholder Organizations</div>

                    <button
                        onClick={() => setSelectedOrg(null)}
                        className={cn(
                            'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left group',
                            selectedOrg === null
                                ? 'bg-[var(--blue-bg)] border-[var(--blue-border)] text-[var(--text-primary)]'
                                : 'bg-[var(--bg-panel)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                        )}
                    >
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shadow-lg">
                            <Layers3 size={16} className="text-[var(--blue)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">All Networks</div>
                            <div className="text-[8px] font-black uppercase tracking-tighter opacity-50">{infra.length} Assets</div>
                        </div>
                    </button>

                    <div className="grid gap-2">
                        {orgs.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => setSelectedOrg(org.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left group',
                                    selectedOrg === org.id
                                        ? 'bg-[var(--blue-bg)] border-[var(--blue-border)] text-[var(--text-primary)]'
                                        : 'bg-[var(--bg-panel)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                                )}
                            >
                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shadow-lg">
                                    {getOrgIcon(org.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{org.name}</div>
                                    <div className="text-[8px] font-black uppercase tracking-tighter opacity-50">{org.code}</div>
                                </div>
                                <ChevronRight size={14} className={cn('opacity-0 group-hover:opacity-100 transition-opacity', selectedOrg === org.id && 'opacity-100')} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50">
                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Scoped Assets</div>
                            <div className="text-3xl font-black text-[var(--text-primary)]">{filteredInfra.length}</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">
                                {selectedOrgMeta ? `${selectedOrgMeta.name} registry` : 'All organizations'}
                            </div>
                        </Card>
                        <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50">
                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Critical Risk Assets</div>
                            <div className="text-3xl font-black text-[var(--red)]">{criticalCount}</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Need protective supervision</div>
                        </Card>
                        <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50">
                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Average Burial Depth</div>
                            <div className="text-3xl font-black text-[var(--blue)]">{averageDepth}m</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">{maintenanceDue} assets flagged for maintenance</div>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
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
                                {highlightedConflicts.map((conflict) => (
                                    <div key={conflict.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-red-500/20 text-[var(--red)] border-none text-[8px] uppercase">{conflict.risk_level} risk</Badge>
                                            <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase">{new Date(conflict.detected_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-xs font-bold text-[var(--text-primary)] mb-1">{conflict.conflict_type.replace(/_/g, ' ')}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] italic leading-relaxed">"{conflict.notes}"</div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <div className="space-y-6">
                            <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]">
                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6 px-1">Agency Focus</div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                                        <div className="text-xs text-[var(--text-secondary)]">Selected Network</div>
                                        <div className="text-sm font-black text-[var(--text-primary)] tracking-tight text-right">
                                            {selectedOrgMeta?.name || 'Multi-utility overview'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                                        <div className="text-xs text-[var(--text-secondary)]">Operational Assets</div>
                                        <div className="text-xl font-mono font-black text-[var(--text-primary)] tracking-tighter">
                                            {filteredInfra.filter((item) => item.status === 'active').length}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-[var(--text-secondary)]">Maintenance or Planning</div>
                                        <div className="text-xl font-mono font-black text-[var(--yellow)] tracking-tighter">
                                            {filteredInfra.filter((item) => item.status !== 'active').length}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 border-[var(--border)] bg-[var(--brand)]/5 border-dashed">
                                <div className="text-[10px] font-black text-[var(--blue)] uppercase tracking-widest mb-4">AI Coordination Note</div>
                                <div className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                                    "{criticalCount > 0
                                        ? 'Critical assets exist inside planned dig corridors. Route emergency teams and field supervisors to a single nighttime work window.'
                                        : 'No direct high-risk overlap detected in the currently scoped network. Maintain routine inspection cadence and publish public notices for planned works.'}"
                                </div>
                            </Card>
                        </div>
                    </div>

                    <Card className="border-[var(--border)] bg-[var(--bg-surface)]/50 overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-panel)] gap-4 flex-wrap">
                            <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Asset Registry</div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                                <Input
                                    className="bg-[var(--bg-surface)] border-[var(--border)] text-xs pl-9 w-full sm:w-72 h-8"
                                    placeholder="Search by road, asset, or material..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">Loading utility intelligence...</div>
                        ) : (
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
                                        {filteredInfra.map((item) => (
                                            <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                                <td className="p-4">
                                                    <div className="text-xs font-bold text-[var(--text-primary)] uppercase">{item.utility_type}</div>
                                                    <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{item.status}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs text-[var(--text-secondary)]">{item.road_name}</div>
                                                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{item.material || 'Unknown material'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs font-mono text-[var(--blue)] font-bold">{item.depth_avg_m}m</div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={cn(
                                                        'border-none text-[8px] uppercase px-2 h-4',
                                                        item.condition === 'good' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
                                                            item.condition === 'critical' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
                                                                item.condition === 'poor' ? 'bg-orange-500/20 text-orange-300' :
                                                                    'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                                                    )}>
                                                        {item.condition}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">
                                                        {item.last_inspection_date ? new Date(item.last_inspection_date).toLocaleDateString() : 'Never'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredInfra.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">
                                                    No assets matched the current utility scope
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
