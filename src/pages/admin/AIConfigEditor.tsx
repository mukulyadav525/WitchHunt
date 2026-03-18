import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input, Textarea, Badge } from '../../components/ui';
import { Save, History, Play, Lock, Unlock, AlertCircle, CheckCircle2, Cpu, BrainCircuit, RefreshCw, ChevronLeft } from 'lucide-react';
import { AIConfiguration, PreviousPrompt } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function AIConfigEditor() {
    const [configs, setConfigs] = useState<AIConfiguration[]>([]);
    const [selected, setSelected] = useState<AIConfiguration | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testInput, setTestInput] = useState('');
    const [testOutput, setTestOutput] = useState<any>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    async function fetchConfigs() {
        const { data } = await supabase.from('ai_configurations').select('*').order('module');
        if (data) setConfigs(data as AIConfiguration[]);
    }

    const handleSave = async () => {
        if (!selected) return;
        setIsSaving(true);

        try {
            const historyItem: PreviousPrompt = {
                prompt: selected.system_prompt,
                version: selected.version,
                changed_at: new Date().toISOString(),
                changed_by: 'current_user',
            };

            const { error } = await supabase
                .from('ai_configurations')
                .update({
                    system_prompt: selected.system_prompt,
                    model_name: selected.model_name,
                    temperature: selected.temperature,
                    version: selected.version + 1,
                    previous_prompts: [historyItem, ...(selected.previous_prompts || [])].slice(0, 10),
                    updated_at: new Date().toISOString()
                })
                .eq('id', selected.id);

            if (error) throw error;
            toast.success('Configuration versioned and saved');
            fetchConfigs();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const runTest = async () => {
        if (!selected || !testInput) return;
        setIsTesting(true);
        setTestOutput(null);
        try {
            // Simulate/Trigger Edge Function Test
            const { data, error } = await supabase.functions.invoke('test-prompt', {
                body: { configId: selected.id, prompt: selected.system_prompt, input: testInput }
            });
            if (error) throw error;
            setTestOutput(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Neural Governance <Cpu className="text-[var(--blue)]" size={24} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">AI Prompt Orchestration & Version Control</p>
                </div>
                <Button variant="ghost" className="border-[var(--border)] text-[var(--text-secondary)]">
                    <History size={16} className="mr-2" />
                    Global Audit Log
                </Button>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Module Sidebar */}
                <div className="space-y-6">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">AI Modules</div>
                    <div className="grid gap-2">
                        {configs.map(cfg => (
                            <button
                                key={cfg.id}
                                onClick={() => { setSelected(cfg); setTestOutput(null); }}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                                    selected?.id === cfg.id
                                        ? "bg-[var(--blue-bg)] border-[var(--blue-border)] text-[var(--text-primary)]"
                                        : "bg-[var(--bg-panel)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">{cfg.display_name}</div>
                                    <div className="text-[8px] font-black uppercase tracking-tighter opacity-50">v{cfg.version} · {cfg.module}</div>
                                </div>
                                {cfg.is_locked && <Lock size={12} className="text-[var(--text-muted)]" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="lg:col-span-3">
                    {!selected ? (
                        <Card className="h-full min-h-[600px] flex flex-col items-center justify-center space-y-4 border-[var(--border)] bg-[var(--bg-surface)]/50 opacity-30 italic">
                            <BrainCircuit size={48} />
                            <div className="text-[10px] font-black uppercase tracking-[0.4em]">Select a module to edit logic</div>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid lg:grid-cols-2 gap-8">
                                {/* Prompt Editor */}
                                <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">System Architecture (Prompt)</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[8px] uppercase font-black tracking-widest"
                                            onClick={() => setSelected(selected ? { ...selected, is_locked: !selected.is_locked } : null)}
                                        >
                                            {selected.is_locked ? <Lock size={10} className="mr-1" /> : <Unlock size={10} className="mr-1" />}
                                            {selected.is_locked ? 'Unlock' : 'Lock'}
                                        </Button>
                                    </div>

                                    <Textarea
                                        className="min-h-[400px] bg-[var(--bg-panel)]/80 border-[var(--border)] font-mono text-xs leading-relaxed text-[var(--text-secondary)] placeholder:text-[var(--text-disabled)]"
                                        value={selected.system_prompt}
                                        disabled={selected.is_locked}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelected({ ...selected, system_prompt: e.target.value })}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Model Primary</label>
                                            <Input
                                                value={selected.model_name}
                                                disabled={selected.is_locked}
                                                className="bg-[var(--bg-panel)] border-[var(--border)] text-[10px] font-mono"
                                                onChange={e => setSelected({ ...selected, model_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Temperature</label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={selected.temperature}
                                                disabled={selected.is_locked}
                                                className="bg-[var(--bg-panel)] border-[var(--border)] text-[10px] font-mono"
                                                onChange={e => setSelected({ ...selected, temperature: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving || selected.is_locked}
                                        className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-primary)] font-black uppercase tracking-widest"
                                    >
                                        {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                                        Deploy Configuration v{selected.version + 1}
                                    </Button>
                                </Card>

                                {/* Sandbox / Testing */}
                                <Card className="p-6 border-[var(--border)] bg-[var(--bg-panel)]/30 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Neural Sandbox (Testing)</div>
                                        <Badge variant="info" className="text-[8px]">Isolated</Badge>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Mock Input (JSON or Text)</label>
                                        <Textarea
                                            placeholder="Enter test data..."
                                            className="min-h-[150px] bg-[var(--bg-surface)]/50 border-[var(--border)] text-xs font-mono"
                                            value={testInput}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTestInput(e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        variant="ghost"
                                        onClick={runTest}
                                        disabled={isTesting || !testInput}
                                        className="w-full border-[var(--border)] text-[var(--blue)] hover:bg-[var(--brand-hover)]/5 font-black uppercase tracking-widest"
                                    >
                                        {isTesting ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                                        Execute Dry Run
                                    </Button>

                                    {/* Test Output */}
                                    <div className="flex-1 space-y-3 pt-4">
                                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Live Inference Analysis</label>
                                        <div className="min-h-[150px] bg-black p-4 rounded-xl border border-[var(--border)] overflow-auto no-scrollbar font-mono text-[10px] text-[var(--green)]">
                                            {testOutput ? (
                                                <pre className="whitespace-pre-wrap">{JSON.stringify(testOutput, null, 2)}</pre>
                                            ) : isTesting ? (
                                                <div className="h-full flex items-center justify-center animate-pulse">Running neural cycle...</div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-[var(--text-disabled)] uppercase tracking-widest">No Inference Data</div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* version History Horizontal */}
                            <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/50 overflow-hidden">
                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">Historical Lineage (Versions)</div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                    {selected.previous_prompts?.map((prev, idx) => (
                                        <div key={idx} className="shrink-0 w-64 p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer group">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge className="bg-[var(--bg-hover)] text-[var(--text-secondary)] border-none text-[8px]">REVISION v{prev.version}</Badge>
                                                <div className="text-[8px] text-[var(--text-muted)] font-bold">{new Date(prev.changed_at).toLocaleDateString()}</div>
                                            </div>
                                            <div className="text-[10px] text-[var(--text-secondary)] line-clamp-3 italic mb-3">"{prev.prompt}"</div>
                                            <Button variant="ghost" size="sm" className="w-full h-8 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                Restore this version
                                            </Button>
                                        </div>
                                    ))}
                                    {(!selected.previous_prompts || selected.previous_prompts.length === 0) && (
                                        <div className="text-[10px] text-[var(--text-disabled)] uppercase tracking-widest italic py-4">No previous versions detected</div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
