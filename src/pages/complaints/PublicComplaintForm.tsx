import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadRoadImage } from '../../lib/storage';
import { invokeAIFunction } from '../../lib/edgeFunctions';
import { Card, Button, Badge, Input, Textarea } from '../../components/ui';
import { MessageSquare, Camera, MapPin, Send, CheckCircle2, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function PublicComplaintForm() {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [complaint, setComplaint] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');

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

        try {
            let photoUrl = null;
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

            // 2. Trigger AI Triage (fire and forget for public form speed)
            invokeAIFunction('analyze-complaint', { complaintId: data.id });

            setStep('success');
            toast.success('Complaint Filed Successfully');

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
                <Card className="max-w-md w-full p-10 text-center space-y-6 border-[var(--border)] bg-[var(--bg-surface)]/50 backdrop-blur-3xl relative overflow-hidden">
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
                        Our AI is currently triaging your report. You will receive an automated update if contact info was provided.
                    </p>
                    <Button variant="ghost" className="w-full text-[var(--text-secondary)]" onClick={() => window.location.reload()}>
                        File Another Report
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--brand)]/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[var(--blue-bg)] border border-[var(--blue-border)] text-[var(--blue)] text-[10px] font-black uppercase tracking-widest">
                        <Globe size={12} />
                        Delhi Public Intelligence Portal
                    </div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tighter leading-none">
                        REPORT A <span className="text-[var(--blue)]">ROAD DEFECT</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest max-w-md mx-auto">
                        Anonymous, AI-powered citizen reporting for a safer city grid.
                    </p>
                </div>

                <Card className="p-8 border-[var(--border)] bg-[var(--bg-surface)]/50 backdrop-blur-3xl shadow-2xl space-y-8">
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--bg-panel)]/30 border border-[var(--border)] flex items-center gap-3">
                            <MapPin className="text-[var(--blue)]/50" size={16} />
                            <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Auto-Location Enabled</div>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--bg-panel)]/30 border border-[var(--border)] flex items-center gap-3">
                            <ShieldCheck className="text-[var(--green)]/50" size={16} />
                            <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Secure & Anonymous</div>
                        </div>
                    </div>

                    <Button
                        onClick={submitComplaint}
                        disabled={!complaint || isSubmitting}
                        className="w-full h-14 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-primary)] text-lg font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 group"
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
