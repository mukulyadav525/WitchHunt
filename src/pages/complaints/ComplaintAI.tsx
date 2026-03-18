import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Badge, cn } from '../../components/ui';
import { MessageSquare, ShieldAlert, Send, Languages, Search, SlidersHorizontal, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';

export function ComplaintAI() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newComplaintType, setNewComplaintType] = useState('');
    const [newComplaintText, setNewComplaintText] = useState('');

    useEffect(() => {
        fetchComplaints();
    }, []);

    async function fetchComplaints() {
        const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
        if (data) setComplaints(data as Complaint[]);
    }

    async function handleAnalyze(complaint: Complaint) {
        setIsAnalyzing(true);
        const toastId = toast.loading('Analyzing complaint...');
        try {
            const { data, error } = await supabase.functions.invoke('prioritize-complaint', {
                body: {
                    complaintText: complaint.complaint_text,
                    complaintId: complaint.id,
                    userId: (await supabase.auth.getUser()).data.user?.id
                }
            });
            if (error) throw error;
            toast.success(`Complaint analyzed: ${data.analysis.urgency_label} urgency`, { id: toastId });
            fetchComplaints();
            if (selectedComplaint?.id === complaint.id) {
                setSelectedComplaint({ ...complaint, ...data.analysis });
            }
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    }

    async function handleSubmit() {
        if (!newComplaintText) return;
        const { data, error } = await supabase.from('complaints').insert({
            complaint_text: newComplaintText,
            status: 'open'
        }).select().single();
        if (data) {
            toast.success('Complaint logged. Starting AI analysis...');
            handleAnalyze(data as Complaint);
            setNewComplaintText('');
            fetchComplaints();
        }
    }

    return (
        <div style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Complaints</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginTop: 4 }}>Multilingual citizen complaints with AI priority routing.</p>
                </div>
                <span className="ai-badge"><span className="ai-dot" /> NLP Analysis Active</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-8)', flex: 1, minHeight: 0 }}>
                {/* Feed */}
                <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-header">
                        <span className="card-title">Complaint Feed</span>
                        <Badge variant="info">{complaints.length} Total</Badge>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {complaints.map(complaint => (
                            <button
                                key={complaint.id}
                                onClick={() => setSelectedComplaint(complaint)}
                                style={{
                                    width: '100%', textAlign: 'left' as const,
                                    padding: 'var(--space-4) var(--space-5)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: selectedComplaint?.id === complaint.id ? 'var(--brand-light)' : 'transparent',
                                    borderLeft: selectedComplaint?.id === complaint.id ? '3px solid var(--brand)' : '3px solid transparent',
                                    cursor: 'pointer', transition: 'background 150ms',
                                    fontFamily: 'var(--font-sans)',
                                }}
                                onMouseOver={e => { if (selectedComplaint?.id !== complaint.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseOut={e => { if (selectedComplaint?.id !== complaint.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)' }}>
                                    <Badge variant={complaint.urgency_score && complaint.urgency_score > 3 ? 'error' : (complaint.urgency_score ? 'warning' : 'info')}>
                                        {complaint.urgency_score ? `Priority ${complaint.urgency_score}` : 'Pending AI'}
                                    </Badge>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(complaint.created_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', fontStyle: 'italic' }}>
                                    "{complaint.complaint_text}"
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{complaint.ticket_number}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' as const }}>{complaint.status}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Content */}
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    {/* New complaint */}
                    <Card style={{ padding: 'var(--space-5)' }}>
                        <span className="card-title" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>Submit New Complaint</span>
                        <textarea
                            value={newComplaintText}
                            onChange={e => setNewComplaintText(e.target.value)}
                            placeholder="Enter complaint text (English, Hindi, or mixed)..."
                            className="textarea"
                            style={{ minHeight: 80, marginBottom: 'var(--space-3)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={handleSubmit} disabled={!newComplaintText}>
                                <Send size={14} /> Submit
                            </Button>
                        </div>
                    </Card>

                    {selectedComplaint ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <MessageSquare size={20} style={{ color: 'var(--brand)' }} /> {selectedComplaint.ticket_number}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Button variant="ghost" size="sm" onClick={() => handleAnalyze(selectedComplaint)} disabled={isAnalyzing}>
                                        <Languages size={14} /> {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
                                    </Button>
                                    <Button variant="secondary" size="sm"><CheckCircle size={14} /> Resolve</Button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
                                <Card style={{ padding: 'var(--space-5)', borderLeft: '3px solid var(--blue)' }}>
                                    <span className="card-title" style={{ display: 'block', marginBottom: 'var(--space-4)' }}>AI Priority Analysis</span>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>
                                        {selectedComplaint.urgency_score ? `Level ${selectedComplaint.urgency_score}` : 'Analyzing...'}
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Urgency via Claude AI</p>

                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                        <div className="metric-row"><span className="metric-label">Department</span><span className="metric-value">Road Infrastructure</span></div>
                                        <div className="metric-row"><span className="metric-label">SLA Window</span><span className="metric-value">24 Hours</span></div>
                                        <div className="metric-row"><span className="metric-label">Impact</span><span className="metric-value">Substantial</span></div>
                                    </div>
                                </Card>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                    <Card style={{ padding: 'var(--space-5)' }}>
                                        <span className="card-title" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>Original Complaint</span>
                                        <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>"{selectedComplaint.complaint_text}"</p>
                                    </Card>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                        <Card style={{ padding: 'var(--space-4)', textAlign: 'center' as const }}>
                                            <Languages size={16} style={{ color: 'var(--blue)', margin: '0 auto 6px' }} />
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' as const }}>{selectedComplaint.sentiment || 'Neutral'}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sentiment</div>
                                        </Card>
                                        <Card style={{ padding: 'var(--space-4)', textAlign: 'center' as const }}>
                                            <Clock size={16} style={{ color: 'var(--green)', margin: '0 auto 6px' }} />
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' as const }}>{selectedComplaint.status}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status</div>
                                        </Card>
                                    </div>
                                </div>
                            </div>

                            <Card style={{ padding: 'var(--space-5)', border: '1px dashed var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                    <span className="card-title">AI Analysis Data</span>
                                    <Badge variant="success">NLP Active</Badge>
                                </div>
                                <pre style={{
                                    background: 'var(--bg-panel)', border: '1px solid var(--border)',
                                    padding: 'var(--space-5)', borderRadius: 'var(--radius-sm)',
                                    fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                                    color: 'var(--text-muted)', lineHeight: 1.6, overflow: 'auto',
                                    whiteSpace: 'pre-wrap' as const,
                                }}>
                                    {selectedComplaint.urgency_score
                                        ? JSON.stringify(selectedComplaint, null, 2)
                                        : "// Analysis data will appear here after processing..."}
                                </pre>
                            </Card>
                        </div>
                    ) : (
                        <div style={{ height: 256, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 'var(--space-4)', opacity: 0.5, marginTop: 80 }}>
                            <Languages size={48} />
                            <span style={{ fontSize: '0.87rem', fontWeight: 500, textAlign: 'center' as const, maxWidth: 280 }}>Select a complaint from the feed to view AI analysis.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
