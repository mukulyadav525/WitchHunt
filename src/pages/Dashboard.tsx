import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RoadMap } from '../components/map/RoadMap';
import { Card, Badge, Button } from '../components/ui';
import {
    MapPin,
    AlertTriangle,
    Activity,
    ArrowUpRight,
    Clock,
    TrendingUp,
    MessageSquare,
    ClipboardList,
    TrafficCone,
    Siren,
    Smartphone
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import toast from 'react-hot-toast';
import { RoadSegment, Defect, Complaint } from '../types';
import {
    listComplaintsData,
    listDelayRiskAssessmentsData,
    listEmergencyIncidentsData,
    listFieldCaptureDraftsData,
    listSignalFusionCasesData,
    listTrafficAdvisoriesData,
    listWorkOrdersData
} from '../lib/supabaseData';

export function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalRoads: 0,
        avgHealth: 0,
        activeDefects: 0,
        openComplaints: 0,
        activeWorkOrders: 0,
        activeEmergencies: 0,
        activeTraffic: 0,
        offlineFieldQueue: 0,
        activeSignalFusion: 0
    });
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [defects, setDefects] = useState<Defect[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [emergencies, setEmergencies] = useState<any[]>([]);
    const [advisories, setAdvisories] = useState<any[]>([]);
    const [delayRisks, setDelayRisks] = useState<any[]>([]);
    const [fieldQueue, setFieldQueue] = useState<any[]>([]);
    const [fusionCases, setFusionCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setLoading(true);
        try {
            const [
                { data: r },
                { data: d },
                { data: c },
                nextWorkOrders,
                nextEmergencies,
                nextAdvisories,
                nextDelayRisks,
                nextFieldDrafts,
                nextFusionCases
            ] = await Promise.all([
                supabase.from('road_segments').select('*'),
                supabase.from('defects').select('*').eq('status', 'open'),
                supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(10),
                listWorkOrdersData(),
                listEmergencyIncidentsData(),
                listTrafficAdvisoriesData(),
                listDelayRiskAssessmentsData(),
                listFieldCaptureDraftsData(),
                listSignalFusionCasesData()
            ]);

            const nextRoads = (r as RoadSegment[]) || [];
            const nextDefects = (d as Defect[]) || [];
            const nextComplaints = (c as Complaint[]) || [];

            setRoads(nextRoads);
            setDefects(nextDefects);
            setComplaints(nextComplaints);
            setWorkOrders(nextWorkOrders);
            setEmergencies(nextEmergencies);
            setAdvisories(nextAdvisories);
            setDelayRisks(nextDelayRisks);
            setFieldQueue(nextFieldDrafts.filter((item) => item.status !== 'synced'));
            setFusionCases(nextFusionCases.filter((item) => item.validation_status !== 'work_ordered'));

            const avg = nextRoads.reduce((acc, cur) => acc + (Number(cur.health_score) || 0), 0) / (nextRoads.length || 1);
            setStats({
                totalRoads: nextRoads.length,
                avgHealth: Math.round(avg),
                activeDefects: nextDefects.length,
                openComplaints: nextComplaints.length,
                activeWorkOrders: nextWorkOrders.filter((item) => item.status !== 'completed').length,
                activeEmergencies: nextEmergencies.filter((item) => item.status !== 'closed').length,
                activeTraffic: nextAdvisories.filter((item) => item.status !== 'cleared').length,
                offlineFieldQueue: nextFieldDrafts.filter((item) => item.status !== 'synced').length,
                activeSignalFusion: nextFusionCases.filter((item) => item.validation_status !== 'work_ordered').length
            });
        } catch (error: any) {
            toast.error(error?.message || 'Unable to load dashboard data from Supabase.');
        } finally {
            setLoading(false);
        }
    }

    const getHealthColor = (score: number) => {
        if (score >= 70) return 'var(--green)';
        if (score >= 45) return 'var(--yellow)';
        return 'var(--red)';
    };

    const kpis = [
        { label: 'Road Network', value: stats.totalRoads, sub: 'Total road segments', icon: MapPin, color: 'var(--blue)' },
        { label: 'Average Health', value: `${stats.avgHealth}%`, sub: 'Network score', icon: Activity, color: getHealthColor(stats.avgHealth) },
        { label: 'Active Defects', value: stats.activeDefects, sub: 'Needs attention', icon: AlertTriangle, color: 'var(--red)' },
        { label: 'Citizen Reports', value: stats.openComplaints, sub: 'Open complaints', icon: MessageSquare, color: 'var(--purple)' },
        { label: 'Work Orders', value: stats.activeWorkOrders, sub: 'Dispatch queue', icon: ClipboardList, color: 'var(--brand)' },
        { label: 'Traffic Advisories', value: stats.activeTraffic, sub: 'Live corridors', icon: TrafficCone, color: 'var(--yellow)' },
        { label: 'Emergency Ops', value: stats.activeEmergencies, sub: 'Open incidents', icon: Siren, color: 'var(--red)' },
        { label: 'Field Queue', value: stats.offlineFieldQueue, sub: 'Offline drafts', icon: Smartphone, color: 'var(--green)' },
        { label: 'Signal Fusion', value: stats.activeSignalFusion, sub: 'Active signal clusters', icon: AlertTriangle, color: 'var(--brand)' },
    ];

    const chartData = roads.slice(0, 6).map((road) => ({
        name: road.name.length > 10 ? road.name.slice(0, 10) : road.name,
        value: road.health_score
    }));

    const responseData = [
        { name: 'Complaints', value: stats.openComplaints },
        { name: 'Orders', value: stats.activeWorkOrders },
        { name: 'Traffic', value: stats.activeTraffic },
        { name: 'Emergency', value: stats.activeEmergencies },
        { name: 'Field', value: stats.offlineFieldQueue },
        { name: 'Fusion', value: stats.activeSignalFusion }
    ];

    const commandItems = [
        ...emergencies.map((incident) => ({
            id: incident.id,
            title: `${incident.road_name} emergency`,
            meta: incident.protocol,
            note: incident.summary,
            badge: 'emergency',
            onClick: () => navigate('/emergency')
        })),
        ...workOrders.map((order) => ({
            id: order.id,
            title: order.title,
            meta: order.order_number,
            note: `${order.assigned_crew} · due ${new Date(order.due_by).toLocaleString()}`,
            badge: 'work order',
            onClick: () => navigate('/work-orders')
        })),
        ...advisories.map((advisory) => ({
            id: advisory.id,
            title: `${advisory.road_name} traffic advisory`,
            meta: `score ${advisory.disruption_score}`,
            note: advisory.detour,
            badge: 'traffic',
            onClick: () => navigate('/traffic')
        })),
        ...delayRisks.map((risk) => ({
            id: risk.id,
            title: `${risk.road_name} sign-off case`,
            meta: `${Math.round(risk.delay_probability * 100)}% delay risk`,
            note: `Requires ${risk.required_sign_off.replace(/_/g, ' ')}`,
            badge: 'delay',
            onClick: () => navigate('/traffic')
        })),
        ...fieldQueue.map((draft) => ({
            id: draft.id,
            title: draft.title,
            meta: draft.workflow.replace(/_/g, ' '),
            note: `Offline capture by ${draft.operator_name}`,
            badge: 'field',
            onClick: () => navigate('/field')
        })),
        ...fusionCases.map((signalCase) => ({
            id: signalCase.id,
            title: `${signalCase.road_name} fusion case`,
            meta: `${Math.round(signalCase.confidence_score * 100)}% confidence`,
            note: signalCase.summary,
            badge: 'signal',
            onClick: () => navigate('/signal-fusion')
        }))
    ].slice(0, 8);

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        Dashboard
                        <Badge variant="success">Live</Badge>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
                        Integrated road command center across traffic, work orders, emergencies, public signals, and field operations.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/executive')}>Executive View</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/work-orders')}>Work Orders</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/signal-fusion')}>Signal Fusion</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/traffic')}>Traffic & Delay</Button>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        padding: '6px 14px', borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-panel)', border: '1px solid var(--border)',
                        fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)',
                    }}>
                        <Clock size={14} style={{ color: 'var(--blue)' }} />
                        Last sync: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {kpis.map(kpi => (
                    <Card key={kpi.label} style={{ padding: 'var(--space-5)', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-panel)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <kpi.icon size={18} style={{ color: kpi.color }} />
                            </div>
                            <span className="card-title">{kpi.label}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 500, color: kpi.color, lineHeight: 1, marginBottom: 4 }}>
                            {kpi.value}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{kpi.sub}</div>
                    </Card>
                ))}
            </div>

            {/* Map & Secondary Data Row */}
            <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                <div className="flex-1-min-0 flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
                    <Card style={{ height: 'min(58dvh, 500px)' }}>
                        <div className="flex-1-min-0" style={{ height: '100%', padding: 'var(--space-2)' }}>
                            <RoadMap roads={roads} defects={defects} className="h-full" />
                        </div>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card style={{ padding: 'var(--space-5)', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
                                <span className="card-title">Health Trend</span>
                                <TrendingUp size={16} style={{ color: 'var(--blue)' }} />
                            </div>
                            <div style={{ height: 192 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="var(--brand)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card style={{ padding: 'var(--space-5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
                                <span className="card-title">Ops Pressure</span>
                                <Activity size={16} style={{ color: 'var(--purple)' }} />
                            </div>
                            <div style={{ height: 192 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={responseData}>
                                        <Bar dataKey="value" fill="var(--purple)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Intelligence Feed */}
                <Card style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="card-header">
                        <span className="card-title">Integrated Command Feed</span>
                        <Badge variant="info">{commandItems.length} items</Badge>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {commandItems.map(item => (
                            <div key={item.id} style={{
                                padding: 'var(--space-4)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                transition: 'border-color 150ms',
                            }}
                                onClick={item.onClick}
                                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                    <Badge variant={item.badge === 'emergency' || item.badge === 'delay' ? 'error' : item.badge === 'traffic' || item.badge === 'work order' || item.badge === 'signal' ? 'warning' : 'info'}>
                                        {item.badge}
                                    </Badge>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {item.meta}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', fontStyle: 'italic' }}>
                                    "{item.note}"
                                </div>
                                <div className="truncate" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.title}</span>
                                    <ArrowUpRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                </div>
                            </div>
                        ))}
                        {commandItems.length === 0 && (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-3)', padding: '80px 0' }}>
                                <MessageSquare size={32} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No active command items</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
