import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Badge } from '../../components/ui';
import {
    Zap,
    AlertTriangle,
    MapPin,
    Activity,
    ArrowUpRight,
    Clock,
    Shield,
    Database,
    HardHat
} from 'lucide-react';
import 'leaflet/dist/leaflet.css'
import type { RoadSegment, Defect, UtilityInfrastructure, RoadImageSurvey, Complaint, UtilityOrganization, ExcavationPermit } from '../../types'
import { InfrastructureMap } from '../../components/map/InfrastructureMap';

export function DeptDashboard() {
    const [org, setOrg] = useState<UtilityOrganization | null>(null);
    const [infra, setInfra] = useState<UtilityInfrastructure[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeptData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile?.department) {
                const { data: orgData } = await supabase
                    .from('utility_organizations')
                    .select('*')
                    .eq('code', profile.department)
                    .single();

                if (orgData) {
                    setOrg(orgData);

                    const [infraRes, complaintsRes, permitsRes] = await Promise.all([
                        supabase.from('utility_infrastructure').select('*').eq('utility_org_id', orgData.id),
                        supabase.from('complaints').select('*').eq('assigned_org_id', orgData.id),
                        supabase.from('excavation_permits').select('*').eq('organization', orgData.code)
                    ]);

                    if (infraRes.data) setInfra(infraRes.data as UtilityInfrastructure[]);
                    if (complaintsRes.data) setComplaints(complaintsRes.data as Complaint[]);
                    if (permitsRes.data) setPermits(permitsRes.data as ExcavationPermit[]);
                }
            }
            setLoading(false);
        };

        fetchDeptData();
    }, []);

    if (!org) return (
        <div className="h-screen flex items-center justify-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-xs">
            Initializing Agency Command...
        </div>
    );

    const kpis = [
        { label: 'Active Assets', value: infra.length, sub: 'Infrastructure Units', icon: Database, color: org.color_hex },
        { label: 'Pending Tickets', value: complaints.length, sub: 'Assigned Complaints', icon: AlertTriangle, color: '#ff3d5a' },
        { label: 'Approved Permits', value: permits.filter(p => p.status === 'approved').length, sub: 'Authorized Works', icon: HardHat, color: '#39d353' },
        { label: 'Safety Index', value: '94%', sub: 'NCT Compliance', icon: Shield, color: '#3b82f6' },
    ];

    return (
        <div className="p-8 space-y-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)] flex items-center justify-center text-3xl shadow-2xl">
                        {org.icon}
                    </div>
                    <div>
                        <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                            {org.name} <Badge variant="info">Agency Portal</Badge>
                        </h1>
                        <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Delhi Municipal Infrastructure Node • {org.type} Division</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2 rounded-xl">
                    <Clock size={14} className="text-[var(--blue)]" />
                    Operational Since: 09:00 AM IST
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map(kpi => (
                    <Card key={kpi.label} className="p-6 relative group border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-300">
                        <div className="absolute top-4 right-4 text-[var(--text-disabled)] group-hover:text-[var(--text-disabled)] transition-colors">
                            <ArrowUpRight size={20} />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] flex items-center justify-center mb-4">
                            <kpi.icon style={{ color: kpi.color }} size={18} />
                        </div>
                        <div className="text-3xl font-black text-[var(--text-primary)] mb-1">{kpi.value}</div>
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{kpi.label}</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-2">{kpi.sub}</div>
                    </Card>
                ))}
            </div>

            {/* Central Intelligence Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Specialized Map for Department */}
                    <Card className="h-[600px] p-2 relative group overflow-hidden border-[var(--border)]">
                        <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
                            <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-panel)]/90 border border-[var(--border)] backdrop-blur-md flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: org.color_hex }}></div>
                                <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Live {org.code} Network</span>
                            </div>
                        </div>
                        <div className="h-full">
                            <InfrastructureMap
                                roads={[]}
                                defects={[]}
                                utilities={infra}
                                activeLayers={new Set(['utilities', 'ai_digging'])}
                                onLayerToggle={() => { }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Right Column: Agency Feed */}
                <div className="space-y-8">
                    <Card className="h-full flex flex-col border-[var(--border)]">
                        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-panel)]">
                            <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Zap size={14} className="text-[var(--yellow)]" />
                                Action Required
                            </div>
                            <Badge variant="error" className="text-[9px]">{complaints.length} Alerts</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                            {complaints.map(c => (
                                <div key={c.id} className="p-5 rounded-2xl bg-[var(--bg-panel)]/60 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all group cursor-pointer">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant={c.urgency_score && c.urgency_score > 3 ? 'error' : 'warning'}>
                                            {c.urgency_score ? `CRITICAL LVL ${c.urgency_score}` : 'ANALYZING'}
                                        </Badge>
                                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-[var(--text-primary)] text-xs font-medium leading-relaxed italic mb-4">"{c.complaint_text}"</div>
                                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={10} className="text-[var(--text-muted)]" />
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{c.road_name}</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center text-[var(--blue)] group-hover:bg-[var(--brand-hover)] group-hover:text-[var(--text-primary)] transition-all">
                                            <ArrowUpRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
