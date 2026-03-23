import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadRoadImage } from '../../lib/storage';
import { invokeAIFunction } from '../../lib/edgeFunctions';
import { Card, Button, Textarea } from '../../components/ui';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Camera, MapPin, Send, CheckCircle2, ShieldCheck, Globe, Loader2, Languages, Radar } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function PublicComplaintForm() {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [complaint, setComplaint] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');
    const [submittedToDemo, setSubmittedToDemo] = useState(false);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    const submitComplaint = async () => {
        if (!complaint) return;
        setIsSubmitting(true);
        let photoUrl: string | null = null;

        try {
            if (file) {
                photoUrl = await uploadRoadImage(file, 'complaint-photos');
            }

            // 1. Create Complaint Entry
            const { data, error } = await supabase
                .from('complaints')
                .insert({
                    complaint_text: complaint,
                    photo_url: photoUrl,
                    status: 'open'
                })
                .select()
                .single();

            if (error) throw error;
            setTicketNumber(data.ticket_number);
            setSubmittedToDemo(false);

            invokeAIFunction('analyze-complaint', { complaintId: data.id });

            setStep('success');
            toast.success('Complaint Filed Successfully');

        } catch (error: any) {
            toast.error(error.message || 'Unable to submit this complaint to Supabase.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                    <ThemeToggle />
                </div>
                <Card className="max-w-md w-full p-6 sm:p-10 text-center space-y-6 border-[var(--border)] bg-[var(--bg-surface)]/70 backdrop-blur-3xl relative overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--blue-bg)] blur-[100px] rounded-full" />
                    <div className="w-20 h-20 rounded-full bg-[var(--green-bg)] flex items-center justify-center mx-auto border border-[var(--green-border)]">
                        <CheckCircle2 className="text-[var(--green)]" size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-widest">Report Filed</h2>
                        <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Your ticket has been logged into the municipal grid</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--bg-panel)]/80 border border-[var(--border)]">
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Ticket Multi-Token</div>
                        <div className="text-xl font-mono font-black text-[var(--blue)] tracking-widest">{ticketNumber}</div>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase leading-relaxed">
                        {submittedToDemo
                            ? 'Demo mode is active, so this report is stored locally in the browser and can still be tracked with the ticket below.'
                            : 'Our AI is currently triaging your report. You will receive an automated update if contact info was provided.'}
                    </p>
                    <Button className="w-full" onClick={() => { window.location.href = `/track/${ticketNumber}`; }}>
                        Track This Ticket
                    </Button>
                    <Button variant="ghost" className="w-full text-[var(--text-secondary)]" onClick={() => window.location.reload()}>
                        File Another Report
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--brand)]/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--blue)]/15 blur-[120px] rounded-full" />
            </div>

            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="max-w-2xl w-full space-y-6 sm:space-y-8 relative z-10 pt-14 sm:pt-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[var(--blue-bg)] border border-[var(--blue-border)] text-[var(--blue)] text-[10px] font-black uppercase tracking-widest">
                        <Globe size={12} />
                        Indian Civic Reporting Portal
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] uppercase tracking-tighter leading-none">
                        REPORT A <span className="text-[var(--blue)]">ROAD DEFECT</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest max-w-md mx-auto">
                        Anonymous, AI-powered citizen reporting for a safer city grid.
                    </p>
                </div>

                <Card className="p-5 sm:p-8 border-[var(--border)] bg-[var(--bg-surface)]/70 backdrop-blur-3xl shadow-2xl space-y-6 sm:space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] px-1">Evidence Acquisition</label>
                        <div
                            onClick={() => document.getElementById('public-upload')?.click()}
                            className={cn(
                                "relative h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group",
                                preview ? "border-blue-500/50" : "border-[var(--border)] hover:border-[var(--blue-border)] hover:bg-[var(--brand-hover)]/5"
                            )}
                        >
                            {preview ? (
                                <img src={preview} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                            ) : (
                                <>
                                    <Camera className="text-[var(--text-disabled)] group-hover:text-[var(--blue)] mb-3 transition-colors" size={32} />
                                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Upload Photo (Optional)</div>
                                </>
                            )}
                            <input type="file" id="public-upload" className="hidden" onChange={handleFile} accept="image/*" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] px-1">Incident Intelligence</label>
                        <Textarea
                            placeholder="Describe the defect, location details, or impact..."
                            className="min-h-[120px] bg-[var(--bg-panel)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:ring-blue-500/20"
                            value={complaint}
                            onChange={e => setComplaint(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--bg-panel)]/30 border border-[var(--border)] flex items-center gap-3">
                            <MapPin className="text-[var(--blue)]/50" size={16} />
                            <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Auto-Location Enabled</div>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--bg-panel)]/30 border border-[var(--border)] flex items-center gap-3">
                            <ShieldCheck className="text-[var(--green)]/50" size={16} />
                            <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Secure & Anonymous</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--brand-light)]/40 border border-[var(--brand-border)] flex items-start gap-3 min-w-0">
                            <Radar className="text-[var(--brand)] shrink-0 mt-0.5" size={16} />
                            <div className="min-w-0">
                                <div className="text-[9px] font-black text-[var(--brand)] uppercase tracking-widest">48-Hour Auto Escalation</div>
                                <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-2 break-words">
                                    Three or more similar citizen reports on the same corridor within 48 hours are automatically escalated for engineer review.
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--blue-bg)]/50 border border-[var(--blue-border)] flex items-start gap-3 min-w-0">
                            <Languages className="text-[var(--blue)] shrink-0 mt-0.5" size={16} />
                            <div className="min-w-0">
                                <div className="text-[9px] font-black text-[var(--blue)] uppercase tracking-widest">Hindi-First Intake</div>
                                <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-2 break-words">
                                    Hindi, English, and mixed-language reports all enter the same civic triage and work-order pipeline.
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={submitComplaint}
                        disabled={!complaint || isSubmitting}
                        className="w-full h-14 text-sm sm:text-lg font-black uppercase tracking-[0.18em] group"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={20} />}
                        Transmit Report
                    </Button>

                    <div className="text-center">
                        <div className="text-[8px] text-[var(--text-disabled)] font-bold uppercase tracking-[0.4em]">Integrated with Brihanmumbai Municipal Corporation</div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
