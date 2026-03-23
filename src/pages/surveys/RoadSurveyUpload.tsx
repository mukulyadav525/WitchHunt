import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { uploadRoadImage } from '../../lib/storage';
import { invokeAIFunction } from '../../lib/edgeFunctions';
import { Card, Button, Badge, Input } from '../../components/ui';
import { Camera, MapPin, BrainCircuit, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function RoadSurveyUpload() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [coords, setCoords] = useState({ lat: 19.0760, lng: 72.8777 });
    const [isUploading, setIsUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setAnalysisResult(null);
        }
    };

    const startUpload = async () => {
        if (!file) return;
        setIsUploading(true);

        try {
            // 1. Upload to Supabase Storage
            const publicUrl = await uploadRoadImage(file, 'road-images');

            // 2. Create Database Entry
            let surveyId = '';
            try {
                const { data: survey, error: surveyError } = await supabase
                    .from('road_image_surveys')
                    .insert({
                        title: `Survey - ${new Date().toLocaleDateString()}`,
                        photo_url: publicUrl,
                        lat_center: coords.lat,
                        lng_center: coords.lng,
                        source: 'manual_upload'
                    })
                    .select()
                    .single();

                if (surveyError) throw surveyError;
                surveyId = survey.id;
            } catch (error: any) {
                throw new Error(error?.message || 'Could not create survey record in Supabase.');
            }

            // 3. Trigger AI Analysis
            const toastId = toast.loading('Initializing Neural Analysis...');
            const result = await invokeAIFunction('analyze-road-survey', {
                surveyId,
                imageUrl: publicUrl,
                location: coords
            });

            if (result.status === 'success') {
                setAnalysisResult(result.data);
                toast.success('Analysis Complete', { id: toastId });
            } else if (result.status === 'error') {
                throw new Error(result.error);
            }

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Neural Road Survey <Sparkles className="text-[var(--blue)]" size={24} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">Deploying AI vision for infrastructure forensic inspection</p>
                </div>
                <Button variant="ghost" onClick={() => navigate('/field')}>
                    Field Console
                </Button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Card className="p-1 min-h-[400px] flex flex-col bg-[var(--bg-surface)] border-[var(--border)] shadow-2xl relative overflow-hidden group">
                        {preview ? (
                            <div className="relative h-full flex-1">
                                <img src={preview} className="w-full h-full object-cover rounded-xl grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" alt="Preview" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                                <Button
                                    onClick={() => { setFile(null); setPreview(null); }}
                                    className="absolute top-4 right-4 bg-[var(--bg-hover)] backdrop-blur-md border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-panel)]"
                                    size="sm"
                                >
                                    Change Media
                                </Button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] m-4 rounded-2xl hover:border-blue-500/50 hover:bg-[var(--brand-hover)]/5 cursor-pointer transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-[var(--bg-panel)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-[var(--shadow-sm)]">
                                    <Camera className="text-[var(--blue)]" size={32} />
                                </div>
                                <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Target Acquisition</div>
                                <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase mt-2 tracking-tighter">Click to select high-res survey imagery</div>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                            </div>
                        )}
                    </Card>

                    <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <MapPin className="text-[var(--brand)]" size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest text-[8px]">Geo-Spatial Lock</div>
                                <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">Define inspection coordinates</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Latitude</label>
                                <Input
                                    type="number"
                                    value={coords.lat}
                                    onChange={e => setCoords(c => ({ ...c, lat: parseFloat(e.target.value) }))}
                                    className="bg-[var(--bg-surface)] border-[var(--border)] font-mono text-xs text-[var(--blue)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Longitude</label>
                                <Input
                                    type="number"
                                    value={coords.lng}
                                    onChange={e => setCoords(c => ({ ...c, lng: parseFloat(e.target.value) }))}
                                    className="bg-[var(--bg-surface)] border-[var(--border)] font-mono text-xs text-[var(--blue)]"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={startUpload}
                            disabled={!file || isUploading}
                            className="w-full mt-8 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-primary)] font-black uppercase tracking-[0.2em] h-12 shadow-lg shadow-blue-500/20 border-t border-[var(--border)]"
                        >
                            {isUploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <BrainCircuit className="mr-2" size={18} />}
                            Execute Analysis
                        </Button>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="h-full border-[var(--border)] bg-[var(--bg-surface)]/80 flex flex-col relative overflow-hidden backdrop-blur-xl min-h-[600px]">
                        {isUploading && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--brand-light)]0 blur-[2px] animate-pulse z-10" />
                        )}

                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.3em]">AI Inspection Log</div>
                            {analysisResult && <Badge className="bg-green-500/20 text-[var(--green)] animate-pulse border-none">Analysis Finalized</Badge>}
                        </div>

                        <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
                            {!analysisResult && !isUploading && (
                                <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                                    <BrainCircuit size={64} className="text-[var(--text-muted)]" />
                                    <div className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Uplink...</div>
                                </div>
                            )}

                            {isUploading && (
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 bg-[var(--bg-panel)] rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            )}

                            {analysisResult && (
                                <>
                                    <div className="flex items-center gap-6 p-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="relative w-24 h-24 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90">
                                                <circle cx="48" cy="48" r="40" fill="transparent" stroke="#1e293b" strokeWidth="8" />
                                                <circle cx="48" cy="48" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="8" strokeDasharray={251} strokeDashoffset={251 - (251 * analysisResult.health_score / 100)} />
                                            </svg>
                                            <div className="absolute text-2xl font-black text-[var(--text-primary)]">{analysisResult.health_score}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Index Rating</div>
                                            <div className="text-xl font-black text-[var(--text-primary)] uppercase mb-1">{analysisResult.condition}</div>
                                            <div className="text-[10px] text-[var(--blue)] font-bold">Confidence: {(analysisResult.confidence * 100).toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Detected Defects</div>
                                        {analysisResult.defects?.map((defect: any, idx: number) => (
                                            <div key={idx} className="p-4 rounded-xl bg-red-500/5 border border-[var(--red-border)] flex items-center gap-4 group hover:border-red-500/40 transition-all">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--red-bg)] flex items-center justify-center text-[var(--red)] font-black text-xs">{(idx + 1).toString().padStart(2, '0')}</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tighter">{defect.type}</div>
                                                        <Badge className="bg-red-500/20 text-[var(--red)] border-none text-[8px] h-4">SEV {defect.severity}</Badge>
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{defect.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Strategic Recommendations</div>
                                        <div className="grid gap-3">
                                            {analysisResult.recommendations?.map((rec: string, idx: number) => (
                                                <div key={idx} className="flex gap-3 text-xs">
                                                    <CheckCircle2 size={14} className="text-[var(--green)] shrink-0 mt-0.5" />
                                                    <span className="text-[var(--text-secondary)] italic">"{rec}"</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
