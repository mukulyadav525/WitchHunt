import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RoadMap } from '../components/map/RoadMap';
import { Card, Badge } from '../components/ui';
import {
    MapPin,
    AlertTriangle,
    Activity,
    ArrowUpRight,
    Clock,
    TrendingUp,
    MessageSquare
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
import { RoadSegment, Defect, Complaint } from '../types';

export function Dashboard() {
    const [stats, setStats] = useState({
        totalRoads: 0,
        avgHealth: 0,
        activeDefects: 0,
        openComplaints: 0
    });
    const [roads, setRoads] = useState<RoadSegment[]>([]);
    const [defects, setDefects] = useState<Defect[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setLoading(true);
        const [
            { data: r },
            { data: d },
            { data: c }
        ] = await Promise.all([
            supabase.from('road_segments').select('*'),
            supabase.from('defects').select('*').eq('status', 'open'),
            supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(10)
        ]);

        if (r) {
            setRoads(r as RoadSegment[]);
            const avg = r.reduce((acc, cur) => acc + (Number(cur.health_score) || 0), 0) / (r.length || 1);
            setStats(prev => ({ ...prev, totalRoads: r.length, avgHealth: Math.round(avg) }));
        }
        if (d) {
            setDefects(d as Defect[]);
            setStats(prev => ({ ...prev, activeDefects: d.length }));
        }
        if (c) {
            setComplaints(c as Complaint[]);
            setStats(prev => ({ ...prev, openComplaints: c.length }));
        }
        setLoading(false);
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
    ];

    const chartData = [
        { name: 'Mon', value: 40 },
        { name: 'Tue', value: 30 },
        { name: 'Wed', value: 65 },
        { name: 'Thu', value: 45 },
        { name: 'Fri', value: 90 },
        { name: 'Sat', value: 70 },
        { name: 'Sun', value: 85 },
    ];

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
                        Road infrastructure monitoring and AI analysis overview.
                    </p>
                </div>
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

            {/* KPI Row */}
            <div className="grid-4">
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
            <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: 'var(--space-8)' }} className="grid-gap-8 lg:grid-cols-[2fr,1fr] xl:flex xl:flex-row">
                <div className="flex-1-min-0 flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
                    <Card style={{ height: 500 }}>
                        <div className="flex-1-min-0" style={{ height: '100%', padding: 'var(--space-2)' }}>
                            <RoadMap roads={roads} defects={defects} className="h-full" />
                        </div>
                    </Card>

                    <div className="grid-2">
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
                                <span className="card-title">Response Latency</span>
                                <Activity size={16} style={{ color: 'var(--purple)' }} />
                            </div>
                            <div style={{ height: 192 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
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
                        <span className="card-title">Citizen Reports</span>
                        <Badge variant="info">Live Feed</Badge>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {complaints.map(c => (
                            <div key={c.id} style={{
                                padding: 'var(--space-4)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                transition: 'border-color 150ms',
                            }}
                                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                    <Badge variant={c.urgency_score && c.urgency_score > 3 ? 'error' : 'warning'}>
                                        {c.urgency_score ? `Priority ${c.urgency_score}` : 'Pending AI'}
                                    </Badge>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', fontStyle: 'italic' }}>
                                    "{c.complaint_text}"
                                </div>
                                <div className="truncate" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.ticket_number}</span>
                                    <ArrowUpRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                </div>
                            </div>
                        ))}
                        {complaints.length === 0 && (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-3)', padding: '80px 0' }}>
                                <MessageSquare size={32} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No active complaints</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
