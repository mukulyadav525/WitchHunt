import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card, Button, Input } from '../../components/ui';
import { Search, MapPin, Clock, CheckCircle, Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Complaint } from '../../types';
import { cn } from '../../lib/utils';

export function PublicTracker() {
    const { ticket } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState(ticket || '');
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTicket = async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('complaints')
                .select('*')
                .eq('ticket_number', id)
                .single();

            if (error) throw error;
            setComplaint(data);
        } catch (err: any) {
            setError('Ticket not found. Please verify the ID.');
            setComplaint(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (ticket) fetchTicket(ticket);
    }, [ticket]);

    return (
        <div className="min-h-screen bg-[var(--bg-base)] p-6 flex flex-col items-center">
            {/* Header / Brand */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-12">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <Shield className="text-[var(--blue)]" size={24} />
                    <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">RoadTwin <span className="text-[var(--blue)]">Pulse</span></span>
                </div>
                <Button variant="ghost" onClick={() => navigate('/')} className="text-[var(--text-muted)]">
                    <ArrowLeft size={16} /> Exit Tracker
                </Button>
            </div>

            <div className="w-full max-w-2xl space-y-8">
                {/* Search Box */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="text-[var(--text-muted)] group-focus-within:text-[var(--blue)] transition-colors" size={20} />
                    </div>
                    <Input
                        className="pl-12 h-16 bg-[var(--bg-panel)] border-[var(--border)] text-lg font-bold tracking-widest text-[var(--blue)] placeholder:text-[var(--text-disabled)]"
                        placeholder="ENTER TICKET ID (e.g. CMP-2026-1002)"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && fetchTicket(searchQuery)}
                    />
                    <Button
                        onClick={() => fetchTicket(searchQuery)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6"
                    >
                        TRACK
                    </Button>
                </div>

                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="spinner w-8 h-8" />
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Searching Municipal Archives...</span>
                    </div>
                )}

                {error && (
                    <div className="p-8 rounded-xl bg-red-600/5 border border-[var(--red-border)] text-center space-y-2">
                        <AlertTriangle className="mx-auto text-[var(--red)]" size={24} />
                        <p className="text-sm font-bold text-[var(--red)]">{error}</p>
                    </div>
                )}

                {complaint && !isLoading && (
                    <Card className="bg-[var(--bg-hover)] border-[var(--border)] backdrop-blur-xl overflow-hidden leading-none">
                        <div className="p-8 border-b border-[var(--border)] flex justify-between items-start">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Signal Record</span>
                                <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-widest">{complaint.ticket_number}</h2>
                            </div>
                            <StatusBadge
                                status={complaint.status}
                                variant={complaint.status === 'resolved' ? 'success' : 'orange'}
                                className="h-8 px-4 text-xs"
                            />
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> Acquisition Time
                                    </label>
                                    <p className="text-xs font-bold text-[var(--text-secondary)]">
                                        {new Date(complaint.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Neural Anchor (Location)
                                    </label>
                                    <p className="text-xs font-bold text-[var(--text-secondary)]">
                                        {complaint.road_name || 'Grid Coordinates Locked'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Signal Category</label>
                                    <p className="text-xs font-bold text-[var(--blue)] uppercase tracking-widest">{complaint.defect_type || 'General Infra Anomaly'}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">AI Analysis Narrative</label>
                                    <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium italic">
                                        "{complaint.complaint_text}"
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Workflow Stage</label>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { label: 'Signal Received', date: complaint.created_at, done: true },
                                            { label: 'AI Triage Complete', date: complaint.created_at, done: true },
                                            { label: 'Assigned to Dept', date: null, done: complaint.status !== 'open' },
                                            { label: 'Resolution Confirmed', date: complaint.resolved_at, done: complaint.status === 'resolved' }
                                        ].map((step, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                                    step.done ? "bg-[var(--green-bg)] border-[var(--green-border)]" : "border-[var(--border)]"
                                                )}>
                                                    {step.done && <CheckCircle size={10} className="text-[var(--green)]" />}
                                                </div>
                                                <span className={cn("text-[10px] font-bold uppercase tracking-widest", step.done ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]")}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-hover)] border-t border-[var(--border)] text-center">
                            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em]">Auth AES-256 Integrated Channel</span>
                        </div>
                    </Card>
                )}

                {!complaint && !isLoading && !error && (
                    <div className="text-center p-20 opacity-30">
                        <Shield size={64} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Uplink Input</p>
                    </div>
                )}
            </div>
        </div>
    );
}
