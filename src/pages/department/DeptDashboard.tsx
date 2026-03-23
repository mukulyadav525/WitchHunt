import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, Badge, Button } from '../../components/ui';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
    Zap,
    AlertTriangle,
    MapPin,
    Activity,
    ArrowUpRight,
    Clock,
    Shield,
    Database,
    HardHat,
    ClipboardList,
    TrafficCone,
    Siren
} from 'lucide-react';
import 'leaflet/dist/leaflet.css'
import type { RoadSegment, Defect, UtilityInfrastructure, RoadImageSurvey, Complaint, UtilityOrganization, ExcavationPermit } from '../../types'
import { InfrastructureMap } from '../../components/map/InfrastructureMap';
import {
    listComplaintsData,
    listEmergencyIncidentsData,
    listExcavationPermitsData,
    listPolicyAlertsData,
    listTrafficAdvisoriesData,
    listUtilityInfrastructureData,
    listUtilityOrganizationsData,
    listWorkOrdersData
} from '../../lib/supabaseData';

export function DeptDashboard() {
    const navigate = useNavigate();
    const [org, setOrg] = useState<UtilityOrganization | null>(null);
    const [infra, setInfra] = useState<UtilityInfrastructure[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [emergencies, setEmergencies] = useState<any[]>([]);
    const [trafficAdvisories, setTrafficAdvisories] = useState<any[]>([]);
    const [policyAlerts, setPolicyAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeptData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const [allOrgs, allInfra, allComplaints, allPermits] = await Promise.all([
                    listUtilityOrganizationsData(),
                    listUtilityInfrastructureData(),
                    listComplaintsData(),
                    listExcavationPermitsData()
                ]);
                const defaultOrg = allOrgs[0] || null;

                if (!user) {
                    if (defaultOrg) {
                        setOrg(defaultOrg);
                        setInfra(allInfra.filter((item) => item.utility_org_id === defaultOrg.id));
                        setComplaints(allComplaints.filter((complaint) => complaint.assigned_org_id === defaultOrg.id));
                        setPermits(allPermits.filter((permit) => permit.organization === defaultOrg.code));
                    } else {
                        setOrg(null);
                        setInfra([]);
                        setComplaints([]);
                        setPermits([]);
                    }
                    setLoading(false);
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                const activeOrg = allOrgs.find((item) => item.code === (profile?.department || defaultOrg?.code)) || defaultOrg;
                setOrg(activeOrg);

                if (activeOrg) {
                    setInfra(allInfra.filter((item) => item.utility_org_id === activeOrg.id));
                    setComplaints(allComplaints.filter((complaint) => complaint.assigned_org_id === activeOrg.id));
                    setPermits(allPermits.filter((permit) => permit.organization === activeOrg.code));
                } else {
                    setInfra([]);
                    setComplaints([]);
                    setPermits([]);
                }
            } catch {
                setOrg(null);
                setInfra([]);
                setComplaints([]);
                setPermits([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDeptData();
    }, []);

    useEffect(() => {
        const loadOpsData = async () => {
            if (!org) {
                setWorkOrders([]);
                setEmergencies([]);
                setTrafficAdvisories([]);
                setPolicyAlerts([]);
                return;
            }
            const [orders, incidentData, advisoryData, alertData] = await Promise.all([
                listWorkOrdersData(),
                listEmergencyIncidentsData(),
                listTrafficAdvisoriesData(),
                listPolicyAlertsData()
            ]);

            setWorkOrders(orders.filter((order) =>
        order.assigned_department.includes(org.code) ||
        order.assigned_department.includes(org.name.split(' ')[0]) ||
        order.road_name === infra[0]?.road_name
            ));
            setEmergencies(incidentData.filter((incident) =>
                incident.notified_departments.some((department) => department.toLowerCase().includes(org.name.split(' ')[0].toLowerCase()) || department.toLowerCase().includes(org.code.toLowerCase()))
            ));
            setTrafficAdvisories(advisoryData.filter((item) =>
                permits.some((permit) => permit.permit_number === item.permit_number)
            ));
            setPolicyAlerts(alertData.filter((alert) =>
                permits.some((permit) => permit.permit_number === alert.permit_number) ||
                infra.some((asset) => asset.road_name === alert.road_name)
            ));
        };

        void loadOpsData();
    }, [org, infra, permits]);

    if (loading || !org) return (
        <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-xs">
            Initializing Agency Command...
        </div>
    );

    const kpis = [
        { label: 'Active Assets', value: infra.length, sub: 'Infrastructure Units', icon: Database, color: org.color_hex },
        { label: 'Pending Tickets', value: complaints.length, sub: 'Assigned Complaints', icon: AlertTriangle, color: '#ff3d5a' },
        { label: 'Work Orders', value: workOrders.filter((item) => item.status !== 'completed').length, sub: 'Dispatch Queue', icon: ClipboardList, color: '#f59e0b' },
        { label: 'Traffic Alerts', value: trafficAdvisories.filter((item) => item.status !== 'cleared').length, sub: 'Live Corridors', icon: TrafficCone, color: '#3b82f6' },
        { label: 'Policy Alerts', value: policyAlerts.length, sub: 'Governance Signals', icon: Shield, color: '#7c3aed' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 min-h-screen">
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
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/work-orders')}>
                        Work Orders
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/traffic')}>
                        Traffic
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/audit')}>
                        Audit
                    </Button>
                    <ThemeToggle size="sm" />
                    <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2 rounded-xl">
                        <Clock size={14} className="text-[var(--blue)]" />
                        Operational Since: 09:00 AM IST
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
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
                    <Card className="h-[360px] sm:h-[460px] lg:h-[600px] p-2 relative group overflow-hidden border-[var(--border)]">
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

                            {workOrders.slice(0, 2).map((order) => (
                                <div key={order.id} className="p-5 rounded-2xl bg-[var(--bg-panel)]/60 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant={order.priority === 'critical' ? 'error' : 'warning'}>{order.priority}</Badge>
                                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                            {order.status}
                                        </div>
                                    </div>
                                    <div className="text-[var(--text-primary)] text-xs font-medium leading-relaxed mb-4">{order.title}</div>
                                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList size={10} className="text-[var(--text-muted)]" />
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{order.order_number}</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center text-[var(--blue)]">
                                            <ArrowUpRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {emergencies.slice(0, 1).map((incident) => (
                                <div key={incident.id} className="p-5 rounded-2xl bg-[var(--red-bg)]/40 border border-[var(--red-border)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="error">Emergency</Badge>
                                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                            {incident.protocol}
                                        </div>
                                    </div>
                                    <div className="text-[var(--text-primary)] text-xs font-medium leading-relaxed mb-4">{incident.summary}</div>
                                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Siren size={10} className="text-[var(--red)]" />
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{incident.road_name}</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center text-[var(--blue)]">
                                            <ArrowUpRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {policyAlerts.slice(0, 2).map((alert) => (
                                <div key={alert.id} className="p-5 rounded-2xl bg-[var(--bg-panel)]/60 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant={alert.severity === 'critical' ? 'error' : 'warning'}>{alert.severity}</Badge>
                                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                            policy
                                        </div>
                                    </div>
                                    <div className="text-[var(--text-primary)] text-xs font-medium leading-relaxed mb-4">{alert.title}</div>
                                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield size={10} className="text-[var(--text-muted)]" />
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{alert.owner}</span>
                                        </div>
                                        <button type="button" onClick={() => navigate('/audit')} className="w-8 h-8 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center text-[var(--blue)]">
                                            <ArrowUpRight size={14} />
                                        </button>
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
