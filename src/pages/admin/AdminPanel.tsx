import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AIConfigEditor } from './AIConfigEditor';
import { Card, Badge } from '../../components/ui';
import { Cpu, Users, Database, ShieldAlert, Camera, Activity, ArrowUpRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { listAIAuditLogsData, listAccessProfilesData, listFleetCameraEventsData } from '../../lib/supabaseData';
import { AIAuditLog, AccessProfile, FleetCameraEvent } from '../../types';

function UserAccessView({ users }: { users: AccessProfile[] }) {
    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Active Access Nodes</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{users.filter((user) => user.is_active).length}</div>
                </Card>
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Admin Clearance</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{users.filter((user) => user.clearance === 'admin').length}</div>
                </Card>
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Field Presence</div>
                    <div className="text-3xl font-black text-[var(--green)]">{users.filter((user) => user.department?.includes('Fleet')).length}</div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.25em]">
                    User Access Matrix
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                    {users.map((user) => (
                        <div key={user.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{user.full_name}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                    {user.email} · {user.department || 'No department'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant={user.is_active ? 'success' : 'warning'}>{user.is_active ? 'Active' : 'Idle'}</Badge>
                                <Badge variant={user.clearance === 'admin' ? 'info' : user.clearance === 'elevated' ? 'warning' : 'success'}>
                                    {user.clearance}
                                </Badge>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    Last seen {new Date(user.last_active_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

function HealthLogsView() {
    const [logs, setLogs] = useState<AIAuditLog[]>([]);

    useEffect(() => {
        const loadLogs = async () => {
            const data = await listAIAuditLogsData();
            setLogs(data.slice(0, 20));
        };

        void loadLogs();
    }, []);

    const failedLogs = logs.filter((log) => !log.success);

    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Requests Today</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{logs.length}</div>
                </Card>
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Failures</div>
                    <div className="text-3xl font-black text-[var(--red)]">{failedLogs.length}</div>
                </Card>
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Average Latency</div>
                    <div className="text-3xl font-black text-[var(--blue)]">
                        {Math.round(logs.reduce((sum, log) => sum + log.latency_ms, 0) / (logs.length || 1))}ms
                    </div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.25em]">
                    System Health Logs
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                    {logs.map((log) => (
                        <div key={log.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={log.success ? 'success' : 'error'}>{log.success ? 'Success' : 'Fallback'}</Badge>
                                    <span className="text-sm font-black text-[var(--text-primary)] uppercase">{log.module}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                        {log.model_provider} / {log.model_name}
                                    </span>
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                    {log.error_message || 'Inference completed within SLA and wrote its output successfully.'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 min-w-[220px]">
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Latency</div>
                                    <div className="text-sm font-black text-[var(--blue)]">{log.latency_ms}ms</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tokens</div>
                                    <div className="text-sm font-black text-[var(--text-primary)]">{log.input_tokens + log.output_tokens}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Captured</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                        {new Date(log.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

function FleetControlView({ events }: { events: FleetCameraEvent[] }) {
    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Live Camera Streams</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">18</div>
                </Card>
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Defects Triaged</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{events.length}</div>
                </Card>
                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Critical Alerts</div>
                    <div className="text-3xl font-black text-[var(--red)]">{events.filter((event) => event.severity === 'critical').length}</div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-[1.3fr,0.7fr] gap-6">
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.25em]">
                        Fleet Vision Feed
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {events.map((event) => (
                            <div key={event.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <Badge variant={event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warning'}>{event.severity}</Badge>
                                        <span className="text-sm font-black text-[var(--text-primary)] uppercase">{event.event_type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                        {event.partner} · {event.camera_id} · {event.route_name}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2">{event.road_name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-[var(--blue)]">{Math.round(event.confidence * 100)}%</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{event.status}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                        {new Date(event.captured_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Fleet Readiness</div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={16} className="text-[var(--green)] mt-0.5" />
                            <div className="text-xs text-[var(--text-secondary)]">Partner streams are mapped into citizen complaint and prediction workflows.</div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Clock size={16} className="text-[var(--blue)] mt-0.5" />
                            <div className="text-xs text-[var(--text-secondary)]">Current median fleet-to-triage latency is under 90 seconds for severe road defects.</div>
                        </div>
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={16} className="text-[var(--red)] mt-0.5" />
                            <div className="text-xs text-[var(--text-secondary)]">One critical water-logging alert on Super Corridor is awaiting barricade confirmation.</div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export function AdminPanel() {
    const [users, setUsers] = useState<AccessProfile[]>([]);
    const [fleetEvents, setFleetEvents] = useState<FleetCameraEvent[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [nextUsers, nextFleetEvents] = await Promise.all([
                listAccessProfilesData(),
                listFleetCameraEventsData()
            ]);
            setUsers(nextUsers);
            setFleetEvents(nextFleetEvents);
        };

        void loadData();
    }, []);

    const adminLinks = [
        { title: 'Neural Config', path: 'ai-config', icon: Cpu, desc: 'Prompt engineering & model params' },
        { title: 'User Access', path: 'users', icon: Users, desc: 'Profiles, roles & permissions' },
        { title: 'Health Logs', path: 'logs', icon: Database, desc: 'AI usage & system latency' },
        { title: 'Fleet Control', path: 'fleet', icon: Camera, desc: 'Partner telemetric access' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-8 flex items-center h-16 gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[var(--brand)] flex items-center justify-center">
                            <ShieldAlert className="text-[var(--text-primary)]" size={14} />
                        </div>
                        <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.3em]">Supreme Command</div>
                    </div>

                    <nav className="flex items-center gap-2 ml-auto">
                        {adminLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) => cn(
                                    'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                                    isActive ? 'bg-white text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                )}
                            >
                                {link.title}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-8 px-8 space-y-8">
                <div className="grid md:grid-cols-4 gap-6">
                    {adminLinks.map((link) => (
                        <Card key={link.path} className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/60">
                            <div className="flex items-center justify-between mb-3">
                                <link.icon size={18} className="text-[var(--blue)]" />
                                <ArrowUpRight size={16} className="text-[var(--text-disabled)]" />
                            </div>
                            <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">{link.title}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">{link.desc}</div>
                        </Card>
                    ))}
                </div>

                <Routes>
                    <Route path="/" element={<Navigate to="ai-config" replace />} />
                    <Route path="ai-config" element={<AIConfigEditor />} />
                    <Route path="users" element={<UserAccessView users={users} />} />
                    <Route path="logs" element={<HealthLogsView />} />
                    <Route path="fleet" element={<FleetControlView events={fleetEvents} />} />
                </Routes>
            </div>
        </div>
    );
}
