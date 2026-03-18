import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Badge, cn } from '../../components/ui';
import { Zap, MapPin, Calendar, Clock, ArrowRight, Layers, LayoutGrid, CheckCircle2, AlertCircle } from 'lucide-react';
import { ExcavationPermit, RoadSegment } from '../../types';
import toast from 'react-hot-toast';

export function ExcavationOptimizer() {
    const [permits, setPermits] = useState<ExcavationPermit[]>([]);
    const [bundles, setBundles] = useState<any[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [selectedPermitIds, setSelectedPermitIds] = useState<string[]>([]);

    useEffect(() => {
        fetchPermits();
        fetchBundles();
    }, []);

    async function fetchPermits() {
        const { data } = await supabase.from('excavation_permits').select('*').eq('status', 'pending');
        if (data) setPermits(data as ExcavationPermit[]);
    }

    async function fetchBundles() {
        const { data } = await supabase.from('excavation_bundles').select('*').order('created_at', { ascending: false });
        if (data) setBundles(data ?? []);
    }

    async function handleOptimize() {
        if (selectedPermitIds.length < 2) {
            toast.error('Select at least 2 permits to run AI bundling.');
            return;
        }
        setIsOptimizing(true);
        const toastId = toast.loading('Calculating spatial overlaps...');
        try {
            const selectedPermits = permits.filter(p => selectedPermitIds.includes(p.id));
            const { data, error } = await supabase.functions.invoke('optimize-excavations', {
                body: {
                    permits: selectedPermits,
                    userId: (await supabase.auth.getUser()).data.user?.id
                }
            });
            if (error) throw error;
            toast.success(`Created ${data.optimization.bundles.length} coordination bundles`, { id: toastId });
            fetchPermits();
            fetchBundles();
            setSelectedPermitIds([]);
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsOptimizing(false);
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedPermitIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    return (
        <div style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Excavation Permits</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginTop: 4 }}>AI-driven utility coordination to minimize disruption.</p>
                </div>
                <span className="ai-badge"><span className="ai-dot" /> Coordination Engine</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', flex: 1, minHeight: 0 }}>
                {/* Pending Permits */}
                <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-header">
                        <span className="card-title">Pending Permits</span>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPermitIds(permits.map(p => p.id))}>Select All</Button>
                            <Button size="sm" onClick={handleOptimize} disabled={isOptimizing || selectedPermitIds.length === 0}>
                                <Zap size={12} /> Optimize
                            </Button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {permits.map(permit => (
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
                                onMouseOver={e => { if (!selectedPermitIds.includes(permit.id)) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseOut={e => { if (!selectedPermitIds.includes(permit.id)) e.currentTarget.style.background = 'transparent'; }}
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
                                        <Badge variant="info">{permit.organization}</Badge>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{permit.permit_number}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.87rem', color: 'var(--text-primary)' }}>{permit.purpose}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 6 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <MapPin size={10} /> {permit.road_name}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <Calendar size={10} /> {new Date(permit.requested_start_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {permits.length === 0 && (
                            <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-4)', opacity: 0.5 }}>
                                <LayoutGrid size={40} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>No pending permits</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Bundles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', overflowY: 'auto' }}>
                    <div className="section-label"><Zap size={14} style={{ color: 'var(--yellow)' }} /> Coordination Bundles</div>

                    {bundles.map(bundle => (
                        <Card key={bundle.id} style={{ padding: 'var(--space-5)', borderLeft: '3px solid var(--blue)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)' }}>
                                <div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600 }}>{bundle.bundle_code}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>· {bundle.road_name}</span>
                                </div>
                                <Badge variant="success">Active</Badge>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>{bundle.permit_count} Permits Coordinated</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Start Date</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(bundle.recommended_start).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Impact</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--yellow)' }}>{bundle.traffic_impact_score}/10</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Cost Saved</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)' }}>₹{bundle.cost_savings_inr?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 4 }}>Rationale</div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{bundle.rationale}"</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--blue)' }}>
                                    <AlertCircle size={14} /> Dept: {bundle.coordination_dept}
                                </span>
                                <Button variant="ghost" size="sm">
                                    Download <ArrowRight size={12} />
                                </Button>
                            </div>
                        </Card>
                    ))}

                    {bundles.length === 0 && (
                        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-4)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', opacity: 0.5 }}>
                            <Zap size={32} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' as const }}>No bundles created yet.<br />Select pending permits to run AI optimizer.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
