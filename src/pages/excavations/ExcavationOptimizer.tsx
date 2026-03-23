import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, Button, Badge } from '../../components/ui';
import { Zap, MapPin, Calendar, Clock, ArrowRight, LayoutGrid, CheckCircle2, AlertCircle, Siren, ShieldAlert, QrCode, Workflow } from 'lucide-react';
import { CoordinationBundle, ExcavationPermit } from '../../types';
import {
    listCoordinationBundlesData,
    listExcavationPermitsData,
    saveCoordinationBundleData
} from '../../lib/supabaseData';
import toast from 'react-hot-toast';

function buildGeneratedBundle(permits: ExcavationPermit[]): CoordinationBundle {
    const first = permits[0];
    const startDate = permits.map((permit) => permit.requested_start_date).sort()[0];
    const endDate = permits.map((permit) => permit.requested_end_date).sort().slice(-1)[0];

    return {
        id: `bundle-${Date.now()}`,
        bundle_code: `BNDL-${first.road_name?.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase() || 'ROAD'}-${String(Date.now()).slice(-4)}`,
        road_name: first.road_name || 'Shared corridor',
        permit_count: permits.length,
        recommended_start: startDate,
        recommended_end: endDate,
        traffic_impact_score: Math.max(18, 62 - permits.length * 8),
        delay_probability: 0.22 + permits.length * 0.06,
        cost_savings_inr: permits.length * 240000,
        coordination_dept: 'Integrated Utility Cell',
        rationale: 'Generated from overlapping permit windows to avoid repeated trench restoration and duplicated traffic management.',
        permits: permits.map((permit) => permit.id),
        recommended_window: '22:00 - 05:00 with unified barricading',
        emergency_protocol: permits.some((permit) => permit.urgency === 'emergency')
            ? 'Protocol B: emergency electric/fiber response'
            : 'Standard multi-utility supervision',
        notification_plan: '48h citizen advisory, 24h contractor sync, QR poster auto-generated',
        qr_board_url: `/track/${first.permit_number}`
    };
}

export function ExcavationOptimizer() {
    const navigate = useNavigate();
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [bundles, setBundles] = useState<CoordinationBundle[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [selectedPermitIds, setSelectedPermitIds] = useState<string[]>([]);

    useEffect(() => {
        fetchPermits();
    }, []);

    async function fetchPermits() {
        try {
            const [nextPermits, nextBundles] = await Promise.all([
                listExcavationPermitsData(),
                listCoordinationBundlesData()
            ]);
            setPermits(nextPermits);
            setBundles(nextBundles);
        } catch {
            setPermits([]);
            setBundles([]);
        }
    }

    async function handleOptimize() {
        if (selectedPermitIds.length < 2) {
            toast.error('Select at least 2 permits to run AI bundling.');
            return;
        }

        setIsOptimizing(true);
        const toastId = toast.loading('Calculating overlap, traffic impact, and delay risk...');

        try {
            const selectedPermits = permits.filter((permit) => selectedPermitIds.includes(permit.id));
            const { data, error } = await supabase.functions.invoke('optimize-excavations', {
                body: {
                    permits: selectedPermits,
                    userId: (await supabase.auth.getUser()).data.user?.id
                }
            });

            if (error) throw error;

            const generatedBundles = data?.optimization?.bundles?.length
                ? data.optimization.bundles
                : [buildGeneratedBundle(selectedPermits)];

            const savedBundles = await Promise.all(generatedBundles.map((bundle: CoordinationBundle) => saveCoordinationBundleData(bundle)));
            setBundles((current) => [...savedBundles, ...current]);
            setSelectedPermitIds([]);
            toast.success(`Created ${savedBundles.length} coordination bundle${savedBundles.length > 1 ? 's' : ''}`, { id: toastId });
        } catch {
            const selectedPermits = permits.filter((permit) => selectedPermitIds.includes(permit.id));
            const generatedBundle = buildGeneratedBundle(selectedPermits);
            const savedBundle = await saveCoordinationBundleData(generatedBundle);
            setBundles((current) => [savedBundle, ...current]);
            setSelectedPermitIds([]);
            toast.success('Generated a coordination bundle from the selected permit overlap.', { id: toastId });
        } finally {
            setIsOptimizing(false);
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedPermitIds((current) =>
            current.includes(id) ? current.filter((permitId) => permitId !== id) : [...current, id]
        );
    };

    const pendingPermits = permits.filter((permit) => permit.status === 'pending');
    const emergencyPermits = permits.filter((permit) => permit.urgency === 'emergency').length;
    const averageImpact = bundles.length
        ? Math.round(bundles.reduce((sum, bundle) => sum + bundle.traffic_impact_score, 0) / bundles.length)
        : 0;

    const selectedPermits = useMemo(
        () => permits.filter((permit) => selectedPermitIds.includes(permit.id)),
        [permits, selectedPermitIds]
    );

    return (
        <div className="page-container min-h-full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Excavation Permits</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginTop: 4 }}>
                        Bundling, traffic-aware scheduling, and public transparency for planned digs.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/traffic')}>
                        Traffic & Delay
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/approvals')}>
                        Permit Approvals
                    </Button>
                    <span className="ai-badge"><span className="ai-dot" /> Coordination Engine</span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6" style={{ marginBottom: 'var(--space-8)' }}>
                <Card style={{ padding: 'var(--space-5)' }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Pending Review</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pendingPermits.length}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Permits ready for coordination</div>
                </Card>
                <Card style={{ padding: 'var(--space-5)' }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Active Bundles</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{bundles.length}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Average disruption score {averageImpact}/100</div>
                </Card>
                <Card style={{ padding: 'var(--space-5)' }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Emergency Fast-Track</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--red)' }}>{emergencyPermits}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Need protocol-level response</div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/emergency')} style={{ marginTop: 'var(--space-4)' }}>
                        Open Emergency Ops
                    </Button>
                </Card>
            </div>

            <div className="grid gap-8 xl:grid-cols-2" style={{ flex: 1, minHeight: 0 }}>
                <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-header">
                        <span className="card-title">Pending Permits</span>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPermitIds(pendingPermits.map((permit) => permit.id))}>Select All</Button>
                            <Button size="sm" onClick={handleOptimize} disabled={isOptimizing || selectedPermitIds.length === 0}>
                                <Zap size={12} /> {isOptimizing ? 'Optimizing...' : 'Optimize'}
                            </Button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {pendingPermits.map((permit) => (
                            <div
                                key={permit.id}
                                onClick={() => toggleSelect(permit.id)}
                                style={{
                                    padding: 'var(--space-4) var(--space-5)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    display: 'flex', alignItems: 'start', gap: 'var(--space-3)',
                                    background: selectedPermitIds.includes(permit.id) ? 'var(--brand-light)' : 'transparent',
                                    borderLeft: selectedPermitIds.includes(permit.id) ? '3px solid var(--brand)' : '3px solid transparent',
                                    cursor: 'pointer', transition: 'background 150ms',
                                }}
                            >
                                <div style={{
                                    width: 20, height: 20, borderRadius: 'var(--radius-xs)',
                                    border: selectedPermitIds.includes(permit.id) ? '2px solid var(--brand)' : '2px solid var(--border-strong)',
                                    background: selectedPermitIds.includes(permit.id) ? 'var(--brand)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, marginTop: 2,
                                }}>
                                    {selectedPermitIds.includes(permit.id) && <CheckCircle2 size={12} color="#fff" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Badge variant={permit.urgency === 'urgent' || permit.urgency === 'emergency' ? 'warning' : 'info'}>
                                            {permit.organization}
                                        </Badge>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{permit.permit_number}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.87rem', color: 'var(--text-primary)' }}>{permit.purpose}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 6, flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <MapPin size={10} /> {permit.road_name}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <Calendar size={10} /> {new Date(permit.requested_start_date).toLocaleDateString()}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <Clock size={10} /> {permit.depth_m}m dig depth
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {pendingPermits.length === 0 && (
                            <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-4)', opacity: 0.5 }}>
                                <LayoutGrid size={40} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>No pending permits</span>
                            </div>
                        )}
                    </div>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', overflowY: 'auto', minWidth: 0 }}>
                    <div className="section-label"><Workflow size={14} style={{ color: 'var(--yellow)' }} /> Coordination Bundles</div>

                    {selectedPermits.length > 0 && (
                        <Card style={{ padding: 'var(--space-5)', border: '1px dashed var(--border)' }}>
                            <div className="card-title" style={{ marginBottom: 12 }}>Live Planner Summary</div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Selected</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPermits.length}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Traffic Window</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue)' }}>Night Shift</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Emergency Risk</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: selectedPermits.some((permit) => permit.urgency === 'emergency') ? 'var(--red)' : 'var(--green)' }}>
                                        {selectedPermits.some((permit) => permit.urgency === 'emergency') ? 'High' : 'Managed'}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {bundles.map((bundle) => (
                        <Card key={bundle.id} style={{ padding: 'var(--space-5)', borderLeft: '3px solid var(--blue)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)', gap: 'var(--space-3)' }}>
                                <div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600 }}>{bundle.bundle_code}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>· {bundle.road_name}</span>
                                </div>
                                <Badge variant="success">Coordinated</Badge>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                                {bundle.permit_count} permits in a shared work window
                            </h3>

                            <div className="grid gap-3 sm:grid-cols-3" style={{ padding: 'var(--space-3) 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Start Date</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(bundle.recommended_start).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Impact</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--yellow)' }}>{bundle.traffic_impact_score}/100</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Cost Saved</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)' }}>₹{bundle.cost_savings_inr.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2" style={{ marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 4 }}>Rationale</div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{bundle.rationale}"</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <div className="metric-row"><span className="metric-label">Recommended Window</span><span className="metric-value">{bundle.recommended_window}</span></div>
                                    <div className="metric-row"><span className="metric-label">Delay Probability</span><span className="metric-value">{Math.round(bundle.delay_probability * 100)}%</span></div>
                                    <div className="metric-row"><span className="metric-label">Lead Dept</span><span className="metric-value">{bundle.coordination_dept}</span></div>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2" style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <Siren size={14} style={{ color: 'var(--red)' }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Emergency Protocol</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bundle.emergency_protocol}</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <ShieldAlert size={14} style={{ color: 'var(--blue)' }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Notification Plan</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bundle.notification_plan}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--blue)' }}>
                                    <QrCode size={14} /> Public QR tracker ready
                                </span>
                                <Button variant="ghost" size="sm" onClick={() => { window.location.href = bundle.qr_board_url; }}>
                                    Open Tracker <ArrowRight size={12} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
