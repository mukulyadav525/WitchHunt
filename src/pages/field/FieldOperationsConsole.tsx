import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Input, TextArea } from '../../components/ui';
import {
    createFieldCaptureDraftData,
    listEmergencyIncidentsData,
    listFieldCaptureDraftsData,
    listPermitApprovalsData,
    listPreDigClearancesData,
    listPublicWorksitesData,
    listRoadSegmentsData,
    listRoadSurveysData,
    syncFieldCaptureDraftData
} from '../../lib/supabaseData';
import type { FieldCaptureDraft, FieldWorkflowKind, PreDigClearanceRecord, RoadSegment } from '../../types';
import {
    AlertTriangle,
    ArrowRight,
    Camera,
    Cable,
    CheckCircle2,
    Clock3,
    MapPin,
    Radio,
    ShieldCheck,
    Siren,
    Smartphone,
    Upload,
    WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const WORKFLOW_COPY: Record<FieldWorkflowKind, { title: string; hindi: string; helper: string; icon: typeof Camera }> = {
    road_survey: {
        title: 'Road Survey',
        hindi: 'सड़क सर्वे',
        helper: 'Capture defects, seepage, and surface condition for AI review.',
        icon: Camera
    },
    emergency: {
        title: 'Emergency',
        hindi: 'आपातकाल',
        helper: 'Fast record for burst main, gas leak, electrical fault, or collapse.',
        icon: Siren
    },
    utility_marking: {
        title: 'Utility Marking',
        hindi: 'यूटिलिटी मार्किंग',
        helper: 'Mark buried asset observations before or during safe digging.',
        icon: Cable
    }
};

function statusBadge(status: FieldCaptureDraft['status']) {
    switch (status) {
        case 'synced':
            return 'success';
        case 'ready_to_sync':
            return 'warning';
        default:
            return 'info';
    }
}

export function FieldOperationsConsole() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [workflow, setWorkflow] = useState<FieldWorkflowKind>('road_survey');
    const [drafts, setDrafts] = useState<FieldCaptureDraft[]>([]);
    const [operatorName, setOperatorName] = useState('');
    const [roadName, setRoadName] = useState('');
    const [ward, setWard] = useState('');
    const [language, setLanguage] = useState<FieldCaptureDraft['language']>('Hindi');
    const [voiceNote, setVoiceNote] = useState('यहाँ सड़क की हालत खराब हो रही है और तुरंत रिकॉर्ड करना है।');
    const [summary, setSummary] = useState('Field observation captured for supervisor review and sync.');
    const [photoCount, setPhotoCount] = useState('2');
    const [permitNumber, setPermitNumber] = useState('');
    const [emergencyType, setEmergencyType] = useState<NonNullable<FieldCaptureDraft['emergency_type']>>('burst_main');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [surveys, setSurveys] = useState<any[]>([]);
    const [emergencies, setEmergencies] = useState<any[]>([]);
    const [approvals, setApprovals] = useState<any[]>([]);
    const [worksites, setWorksites] = useState<any[]>([]);
    const [clearances, setClearances] = useState<PreDigClearanceRecord[]>([]);
    const [roads, setRoads] = useState<RoadSegment[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [nextDrafts, nextSurveys, nextEmergencies, nextApprovals, nextWorksites, nextClearances, nextRoads] = await Promise.all([
                listFieldCaptureDraftsData(),
                listRoadSurveysData(),
                listEmergencyIncidentsData(),
                listPermitApprovalsData(),
                listPublicWorksitesData(),
                listPreDigClearancesData(),
                listRoadSegmentsData()
            ]);
            setDrafts(nextDrafts);
            setSurveys(nextSurveys);
            setEmergencies(nextEmergencies);
            setApprovals(nextApprovals);
            setWorksites(nextWorksites);
            setClearances(nextClearances);
            setRoads(nextRoads);
            const permitQuery = searchParams.get('permit');
            const linkedWorksite = nextWorksites.find((item) => item.permit_number === permitQuery) || null;
            const linkedRoad = nextRoads.find((item) => item.name === linkedWorksite?.road_name) || null;
            setRoadName((current) => linkedWorksite?.road_name || current || nextWorksites[0]?.road_name || '');
            setWard((current) => linkedWorksite?.ward || current || nextWorksites[0]?.ward || '');
            setPermitNumber((current) => permitQuery || current);
            setLat((current) => {
                if (linkedWorksite?.location?.lat != null) return String(linkedWorksite.location.lat);
                if (linkedRoad?.location?.lat != null) return String(linkedRoad.location.lat);
                return current;
            });
            setLng((current) => {
                if (linkedWorksite?.location?.lng != null) return String(linkedWorksite.location.lng);
                if (linkedRoad?.location?.lng != null) return String(linkedRoad.location.lng);
                return current;
            });
            if (permitQuery) {
                setWorkflow('utility_marking');
                setSummary('Utility marking note captured before excavation and hand-dig clearance.');
                setVoiceNote('केबल/पाइप की गहराई और दिशा को साइट पर मार्क किया गया है।');
            }
        };

        void loadData();
    }, [searchParams]);

    const stats = useMemo(() => ({
        queued: drafts.filter((draft) => draft.status !== 'synced').length,
        synced: drafts.filter((draft) => draft.status === 'synced').length,
        emergencies: emergencies.filter((incident) => incident.status !== 'closed').length,
        surveys: surveys.length
    }), [drafts, emergencies, surveys.length]);

    const taskFeed = useMemo(() => {
        const emergencyTasks = emergencies
            .filter((incident) => incident.status !== 'closed')
            .map((incident) => ({
                id: incident.id,
                type: 'Emergency',
                title: `${incident.road_name} · ${incident.protocol}`,
                note: incident.summary,
                action: () => navigate('/emergency')
            }));

        const approvalTasks = approvals
            .filter((record) => record.closure_state !== 'archived')
            .map((record) => ({
                id: record.id,
                type: 'Closure',
                title: `${record.permit_number} · ${record.road_name}`,
                note: `Closure state: ${record.closure_state.replace(/_/g, ' ')}`,
                action: () => navigate('/approvals')
            }));

        const clearanceTasks = clearances
            .filter((record) => record.status === 'blocked' || record.status === 'gpr_required')
            .map((record) => ({
                id: record.id,
                type: 'Clearance',
                title: `${record.permit_number} · ${record.status.replace(/_/g, ' ')}`,
                note: `${record.road_name} needs dig-safe review before excavation starts.`,
                action: () => navigate(`/clearance?permit=${record.permit_number}`)
            }));

        return [...clearanceTasks, ...emergencyTasks, ...approvalTasks].slice(0, 4);
    }, [approvals, clearances, emergencies, navigate]);

    const selectedWorkflow = WORKFLOW_COPY[workflow];
    const fieldArTarget = permitNumber.trim()
        ? `/field-ar?permit=${encodeURIComponent(permitNumber.trim())}`
        : roadName.trim()
            ? `/field-ar?road=${encodeURIComponent(roadName.trim())}`
            : '/field-ar';

    const resetFormForWorkflow = (nextWorkflow: FieldWorkflowKind) => {
        setWorkflow(nextWorkflow);
        if (nextWorkflow === 'road_survey') {
            setSummary('Field observation captured for supervisor review and sync.');
            setVoiceNote('क्रैक, गड्ढा और पानी की स्थिति रिकॉर्ड की गई है।');
        } else if (nextWorkflow === 'emergency') {
            setSummary('Emergency capture prepared for fast-track control room sync.');
            setVoiceNote('आपातकालीन स्थिति है, तुरंत ट्रैफिक और यूटिलिटी टीम को अलर्ट करें।');
        } else {
            setSummary('Utility marking note captured before excavation and hand-dig clearance.');
            setVoiceNote('केबल/पाइप की गहराई और दिशा को साइट पर मार्क किया गया है।');
        }
    };

    const refreshDrafts = async () => setDrafts(await listFieldCaptureDraftsData());

    const handleSaveOffline = () => {
        const normalizedRoad = roadName.trim();
        const normalizedWard = ward.trim();
        const normalizedOperator = operatorName.trim();
        const matchedWorksite = worksites.find((item) =>
            (permitNumber.trim() && item.permit_number === permitNumber.trim())
            || item.road_name === normalizedRoad
        ) || null;
        const matchedRoad = roads.find((item) => item.name === normalizedRoad) || null;
        const derivedLat = Number(lat) || matchedWorksite?.location?.lat || matchedRoad?.location?.lat || null;
        const derivedLng = Number(lng) || matchedWorksite?.location?.lng || matchedRoad?.location?.lng || null;

        if (!normalizedRoad || !normalizedWard || !normalizedOperator) {
            toast.error('Add road, ward, and operator details before saving.');
            return;
        }

        if (derivedLat == null || derivedLng == null) {
            toast.error('Add valid coordinates or link this field record to a mapped worksite.');
            return;
        }

        void (async () => {
            await createFieldCaptureDraftData({
                workflow,
                road_name: normalizedRoad,
                ward: normalizedWard,
                operator_name: normalizedOperator,
                language,
                voice_note_text: voiceNote.trim(),
                summary: summary.trim() || 'Field capture saved for offline sync.',
                photo_count: Number(photoCount) || 1,
                lat: derivedLat,
                lng: derivedLng,
                permit_number: permitNumber.trim() || null,
                emergency_type: workflow === 'emergency' ? emergencyType : null
            });

            await refreshDrafts();
            toast.success('Field draft saved to the offline queue.');
        })();
    };

    const handleSyncDraft = (draftId: string) => {
        void (async () => {
            const synced = await syncFieldCaptureDraftData(draftId);
            if (!synced) {
                toast.error('Draft could not be synced.');
                return;
            }
            await refreshDrafts();
            const [nextSurveys, nextEmergencies] = await Promise.all([
                listRoadSurveysData(),
                listEmergencyIncidentsData()
            ]);
            setSurveys(nextSurveys);
            setEmergencies(nextEmergencies);
            toast.success('Field draft synced into the command system.');
        })();
    };

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Field Operations Console <Smartphone className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Hindi-first, offline-ready capture for survey, emergency, and utility-safe digging workflows.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">3-button field mode</Badge>
                    <Button variant="ghost" onClick={() => navigate(fieldArTarget)}>
                        Field AR Briefing
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/clearance')}>
                        Pre-Dig Clearance
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/surveys')}>
                        Full Survey Studio
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Queued Offline</div>
                    <div className="text-3xl font-black text-[var(--brand)]">{stats.queued}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Synced Drafts</div>
                    <div className="text-3xl font-black text-[var(--green)]">{stats.synced}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Active Emergencies</div>
                    <div className="text-3xl font-black text-[var(--red)]">{stats.emergencies}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Survey Records</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{stats.surveys}</div>
                </Card>
            </div>

            <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/80">
                <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-light)] border border-[var(--brand-border)]">
                        <WifiOff size={20} className="text-[var(--brand)]" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-black text-[var(--text-primary)]">Hindi-first field UX</div>
                        <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                            Primary workflows stay within three taps: choose capture type, record bilingual notes, and save offline or sync. Voice-note text is supported as the lightweight fallback for crews using basic phones or poor connectivity.
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid xl:grid-cols-[1.15fr,0.85fr] gap-8">
                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Quick Workflows</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-2">
                                Pick one field workflow and keep the primary action count low.
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            {(Object.keys(WORKFLOW_COPY) as FieldWorkflowKind[]).map((key) => {
                                const WorkflowIcon = WORKFLOW_COPY[key].icon;
                                const active = workflow === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => resetFormForWorkflow(key)}
                                        className="rounded-2xl border p-5 text-left transition-colors"
                                        style={active
                                            ? { borderColor: 'var(--brand-border)', background: 'var(--brand-light)' }
                                            : { borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <WorkflowIcon size={18} className={active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'} />
                                            {active && <Badge variant="success">Active</Badge>}
                                        </div>
                                        <div className="text-sm font-black text-[var(--text-primary)] mt-4">{WORKFLOW_COPY[key].title}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand)] mt-1">{WORKFLOW_COPY[key].hindi}</div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed break-words">
                                            {WORKFLOW_COPY[key].helper}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                    <div className="text-sm font-black text-[var(--text-primary)]">{selectedWorkflow.title}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand)] mt-1">{selectedWorkflow.hindi}</div>
                                </div>
                                <Badge variant={workflow === 'emergency' ? 'error' : workflow === 'utility_marking' ? 'warning' : 'info'}>
                                    {workflow.replace(/_/g, ' ')}
                                </Badge>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mt-5">
                                <Input value={operatorName} onChange={(event) => setOperatorName(event.target.value)} placeholder="Operator name" />
                                <Input value={roadName} onChange={(event) => setRoadName(event.target.value)} placeholder="Road name" />
                                <Input value={ward} onChange={(event) => setWard(event.target.value)} placeholder="Ward" />
                                <Input value={permitNumber} onChange={(event) => setPermitNumber(event.target.value)} placeholder="Permit number (optional)" />
                                <Input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="Latitude" type="number" />
                                <Input value={lng} onChange={(event) => setLng(event.target.value)} placeholder="Longitude" type="number" />
                                <Input value={photoCount} onChange={(event) => setPhotoCount(event.target.value)} placeholder="Photo count" type="number" min={1} />
                                <Input
                                    value={language}
                                    onChange={(event) => setLanguage(event.target.value as FieldCaptureDraft['language'])}
                                    placeholder="Language"
                                    list="field-languages"
                                />
                            </div>

                            {workflow === 'emergency' && (
                                <div className="mt-4">
                                    <Input
                                        value={emergencyType}
                                        onChange={(event) => setEmergencyType(event.target.value as NonNullable<FieldCaptureDraft['emergency_type']>)}
                                        placeholder="Emergency type"
                                        list="emergency-types"
                                    />
                                </div>
                            )}

                            <div className="mt-4">
                                <TextArea
                                    rows={4}
                                    value={voiceNote}
                                    onChange={(event) => setVoiceNote(event.target.value)}
                                    placeholder="Voice note transcript / bilingual field note"
                                />
                            </div>

                            <div className="mt-4">
                                <TextArea
                                    rows={3}
                                    value={summary}
                                    onChange={(event) => setSummary(event.target.value)}
                                    placeholder="Short capture summary"
                                />
                            </div>

                            <div className="grid sm:grid-cols-3 gap-3 mt-5">
                                <Button onClick={handleSaveOffline}>
                                    <WifiOff size={14} /> Save Offline
                                </Button>
                                <Button variant="secondary" onClick={() => navigate(fieldArTarget)}>
                                    <ShieldCheck size={14} /> Open Field AR
                                </Button>
                                <Button variant="ghost" onClick={() => navigate('/emergency')}>
                                    <Siren size={14} /> Emergency Desk
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-5">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Offline Queue</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-2">
                                    Drafts are stored locally until the crew is ready to sync.
                                </div>
                            </div>
                            <Badge variant="warning">{drafts.filter((draft) => draft.status !== 'synced').length} pending</Badge>
                        </div>

                        <div className="space-y-4">
                            {drafts.map((draft) => (
                                <div key={draft.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-[var(--text-primary)] break-words">{draft.title}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                                {draft.road_name} · {draft.ward} · {draft.language}
                                            </div>
                                        </div>
                                        <Badge variant={statusBadge(draft.status)}>{draft.status.replace(/_/g, ' ')}</Badge>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-3 mt-4 text-xs text-[var(--text-secondary)]">
                                        <div className="flex items-center gap-2"><Camera size={12} className="text-[var(--blue)]" /> {draft.photo_count} photo{draft.photo_count === 1 ? '' : 's'}</div>
                                        <div className="flex items-center gap-2"><MapPin size={12} className="text-[var(--blue)]" /> {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}</div>
                                        <div className="flex items-center gap-2"><Clock3 size={12} className="text-[var(--blue)]" /> {new Date(draft.captured_at).toLocaleString()}</div>
                                    </div>

                                    <div className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed break-words">
                                        {draft.summary}
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                                        <Button
                                            onClick={() => handleSyncDraft(draft.id)}
                                            disabled={draft.status === 'synced'}
                                            variant={draft.status === 'synced' ? 'ghost' : 'primary'}
                                        >
                                            <Upload size={14} /> {draft.status === 'synced' ? 'Synced' : 'Sync Now'}
                                        </Button>
                                        <Button variant="ghost" onClick={() => navigate(draft.workflow === 'emergency' ? '/emergency' : '/map')}>
                                            Open Related Surface <ArrowRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-5">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Field Task Feed</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-2">
                                High-priority work packages that field crews are likely to touch next.
                            </div>
                        </div>

                        <div className="space-y-4">
                            {taskFeed.map((task) => (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={task.action}
                                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 text-left transition-colors hover:bg-[var(--bg-hover)]"
                                >
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{task.title}</div>
                                        <Badge variant={task.type === 'Emergency' ? 'error' : 'warning'}>{task.type}</Badge>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed break-words">
                                        {task.note}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 space-y-5">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Connected System State</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-2">
                                Offline sync feeds back into surveys, emergencies, and public work tracking.
                            </div>
                        </div>

                        <div className="space-y-4">
                            {worksites.slice(0, 3).map((worksite) => (
                                <div key={worksite.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{worksite.road_name}</div>
                                        <Badge variant={worksite.status === 'completed' ? 'success' : worksite.status === 'active' ? 'warning' : 'info'}>
                                            {worksite.status}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-3 break-words">
                                        {worksite.purpose}
                                    </div>
                                    <Button className="w-full mt-4" variant="ghost" onClick={() => navigate(`/track/${worksite.permit_number}`)}>
                                        Public tracker <ArrowRight size={14} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/70">
                        <div className="flex items-start gap-3">
                            <Radio className="text-[var(--brand)] shrink-0 mt-0.5" size={18} />
                            <div className="min-w-0">
                                <div className="text-sm font-black text-[var(--text-primary)]">Field SOP guardrail</div>
                                <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                    If connectivity drops, crews should still capture notes, coordinates, and photo count locally. Sync can happen later without losing the emergency or survey audit trail.
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <datalist id="field-languages">
                <option value="Hindi" />
                <option value="Hindi + English" />
                <option value="English" />
            </datalist>
            <datalist id="emergency-types">
                <option value="gas_leak" />
                <option value="electrical_fault" />
                <option value="burst_main" />
                <option value="road_collapse" />
            </datalist>
        </div>
    );
}
