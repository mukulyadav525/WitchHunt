import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Input, Textarea } from '../../components/ui';
import {
    createCitizenCompletionFeedbackData,
    createNotificationSubscriptionData,
    createRouteAlertSubscriptionData,
    listCitizenCompletionFeedbackData,
    listClosureProofPackagesData,
    listPaymentMilestonesData,
    listPublicWorksitesData,
    listRouteAlertSubscriptionsData,
    listNotificationSubscriptionsData
} from '../../lib/supabaseData';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Search, MapPin, Route, IndianRupee, Clock, ShieldCheck, ArrowLeft, HardHat, BellRing, Star, Camera, ClipboardCheck, ImageOff, MessageSquare } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import type { CitizenCompletionFeedback, ClosureProofPackage, NotificationSubscription, PaymentMilestone, PublicWorksite, RouteAlertSubscription } from '../../types';

type StatusFilter = 'all' | 'planned' | 'active' | 'completed';

function statusColor(status: StatusFilter | 'delayed') {
    switch (status) {
        case 'active':
            return '#f59e0b';
        case 'planned':
            return '#3b82f6';
        case 'completed':
            return '#16a34a';
        case 'delayed':
            return '#dc2626';
        default:
            return '#64748b';
    }
}

export function PublicWorksPortal() {
    const navigate = useNavigate();
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [proofs, setProofs] = useState<ClosureProofPackage[]>([]);
    const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
    const [feedback, setFeedback] = useState<CitizenCompletionFeedback[]>([]);
    const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
    const [routeSubscriptions, setRouteSubscriptions] = useState<RouteAlertSubscription[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPermit, setSelectedPermit] = useState<PublicWorksite | null>(null);
    const [subscriberName, setSubscriberName] = useState('');
    const [subscriberPhone, setSubscriberPhone] = useState('');
    const [subscriberChannel, setSubscriberChannel] = useState<'whatsapp' | 'sms' | 'push'>('whatsapp');
    const [routeSubscriberName, setRouteSubscriberName] = useState('');
    const [routeSubscriberPhone, setRouteSubscriberPhone] = useState('');
    const [routeChannel, setRouteChannel] = useState<'whatsapp' | 'sms' | 'push'>('whatsapp');
    const [routeName, setRouteName] = useState(worksites[0]?.road_name || '');
    const [routeWard, setRouteWard] = useState(worksites[0]?.ward || '');
    const [commuteWindow, setCommuteWindow] = useState('08:00 - 10:00');
    const [feedbackName, setFeedbackName] = useState('');
    const [feedbackRating, setFeedbackRating] = useState('5');
    const [feedbackText, setFeedbackText] = useState('');

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        try {
            const [
                nextWorksites,
                nextProofs,
                nextMilestones,
                nextFeedback,
                nextSubscriptions,
                nextRouteSubscriptions
            ] = await Promise.all([
                listPublicWorksitesData(),
                listClosureProofPackagesData(),
                listPaymentMilestonesData(),
                listCitizenCompletionFeedbackData(),
                listNotificationSubscriptionsData(),
                listRouteAlertSubscriptionsData()
            ]);

            setWorksites(nextWorksites);
            setProofs(nextProofs);
            setMilestones(nextMilestones);
            setFeedback(nextFeedback);
            setSubscriptions(nextSubscriptions);
            setRouteSubscriptions(nextRouteSubscriptions);
            setSelectedPermit((current) => nextWorksites.find((item) => item.id === current?.id) || nextWorksites[0] || null);
        } catch (error: any) {
            toast.error(error.message || 'Unable to load public works data from Supabase.');
        }
    }

    const selectedProof = selectedPermit
        ? proofs.find((record) => record.permit_number === selectedPermit.permit_number || record.worksite_id === selectedPermit.id) || null
        : null;
    const selectedMilestones = selectedProof
        ? milestones.filter((milestone) => milestone.closure_proof_id === selectedProof.id)
        : [];
    const selectedFeedback = selectedPermit
        ? feedback.filter((entry) => entry.permit_number === selectedPermit.permit_number)
        : [];

    useEffect(() => {
        if (!selectedPermit) return;
        setRouteName(selectedPermit.road_name);
        setRouteWard(selectedPermit.ward || 'Ward not tagged');
    }, [selectedPermit]);

    const filteredWorksites = useMemo(() => {
        return worksites.filter((worksite) => {
            const matchesStatus = statusFilter === 'all' || worksite.status === statusFilter;
            const haystack = `${worksite.road_name} ${worksite.department} ${worksite.permit_number} ${worksite.ward || ''}`.toLowerCase();
            const matchesSearch = haystack.includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [searchQuery, statusFilter, worksites]);

    const counts = {
        planned: worksites.filter((item) => item.status === 'planned').length,
        active: worksites.filter((item) => item.status === 'active').length,
        completed: worksites.filter((item) => item.status === 'completed').length
    };

    const handleSubscribe = async () => {
        if (!selectedPermit) return;

        const normalizedName = subscriberName.trim();
        const normalizedPhone = subscriberPhone.trim();

        if (!normalizedName || !normalizedPhone) {
            toast.error('Enter name and phone to subscribe.');
            return;
        }

        if (normalizedPhone.replace(/\D/g, '').length < 10) {
            toast.error('Enter a valid phone or WhatsApp number.');
            return;
        }

        try {
            const result = await createNotificationSubscriptionData({
                worksite_id: selectedPermit.id,
                permit_number: selectedPermit.permit_number,
                road_name: selectedPermit.road_name,
                ward: selectedPermit.ward || 'Ward not tagged',
                subscriber_name: normalizedName,
                subscriber_phone: normalizedPhone,
                channel: subscriberChannel,
                language: 'Hindi + English',
                radius_m: selectedPermit.traffic_impact_score >= 35 ? 750 : 500
            });

            if (!result.created) {
                toast.error('This number is already subscribed for the selected channel.');
                return;
            }

            await loadData();
            setSubscriberName('');
            setSubscriberPhone('');
            toast.success(`Subscribed to ${selectedPermit.road_name} alerts via ${subscriberChannel}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to subscribe this user.');
        }
    };

    const handleRouteSubscribe = async () => {
        const normalizedName = routeSubscriberName.trim();
        const normalizedPhone = routeSubscriberPhone.trim();
        const normalizedRoute = routeName.trim();
        const normalizedWard = routeWard.trim() || selectedPermit?.ward || 'Ward not tagged';

        if (!normalizedName || !normalizedPhone || !normalizedRoute) {
            toast.error('Enter name, phone, and route to subscribe.');
            return;
        }

        if (normalizedPhone.replace(/\D/g, '').length < 10) {
            toast.error('Enter a valid phone or WhatsApp number.');
            return;
        }

        try {
            const result = await createRouteAlertSubscriptionData({
                subscriber_name: normalizedName,
                subscriber_phone: normalizedPhone,
                channel: routeChannel,
                language: 'Hindi + English',
                ward: normalizedWard,
                route_name: normalizedRoute,
                commute_window: commuteWindow,
                source: 'public_portal'
            });

            if (!result.created) {
                toast.error('This route alert subscription already exists for the selected channel.');
                return;
            }

            await loadData();
            setRouteSubscriberName('');
            setRouteSubscriberPhone('');
            toast.success(`Subscribed to ${normalizedRoute} commute alerts via ${routeChannel}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to save route alerts.');
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!selectedPermit) return;

        const normalizedName = feedbackName.trim();
        const normalizedFeedback = feedbackText.trim();
        const parsedRating = Number(feedbackRating);

        if (!normalizedName || !normalizedFeedback) {
            toast.error('Enter your name and completion feedback.');
            return;
        }

        if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            toast.error('Rating must be between 1 and 5.');
            return;
        }

        try {
            await createCitizenCompletionFeedbackData({
                permit_number: selectedPermit.permit_number,
                road_name: selectedPermit.road_name,
                ward: selectedPermit.ward || 'Ward not tagged',
                citizen_name: normalizedName,
                rating: parsedRating,
                feedback: normalizedFeedback,
                photo_url: null
            });

            await loadData();
            setFeedbackName('');
            setFeedbackRating('5');
            setFeedbackText('');
            toast.success('Completion feedback submitted to the public record.');
        } catch (error: any) {
            toast.error(error.message || 'Unable to submit completion feedback.');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/')}>
                            <ArrowLeft size={16} /> Home
                        </Button>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--blue)]">Citizen Transparency Portal</div>
                            <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mt-2">
                                Public Road Works Dashboard
                            </h1>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Planned</div>
                        <div className="text-3xl font-black text-[var(--blue)]">{counts.planned}</div>
                    </Card>
                    <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Active</div>
                        <div className="text-3xl font-black text-[var(--brand)]">{counts.active}</div>
                    </Card>
                    <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Completed</div>
                        <div className="text-3xl font-black text-[var(--green)]">{counts.completed}</div>
                    </Card>
                    <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Subscribers</div>
                        <div className="text-3xl font-black text-[var(--text-primary)]">
                            {worksites.reduce((sum, item) => sum + (item.subscriber_count || 0), 0) + routeSubscriptions.length}
                        </div>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-8">
                    <Card className="overflow-hidden border-[var(--border)]">
                        <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-between gap-4 flex-wrap">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">
                                Active City Works Map
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                                    <Input
                                        className="pl-9 w-64"
                                        placeholder="Search by road, permit, ward..."
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                    />
                                </div>
                                {(['all', 'planned', 'active', 'completed'] as StatusFilter[]).map((status) => (
                                    <Button
                                        key={status}
                                        variant={statusFilter === status ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setStatusFilter(status)}
                                    >
                                        {status}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[460px]">
                            <MapContainer center={[22.7196, 75.8577]} zoom={12} className="h-full w-full">
                                <TileLayer
                                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                />
                                {filteredWorksites.filter((worksite) => worksite.location).map((worksite) => (
                                    <CircleMarker
                                        key={worksite.id}
                                        center={[worksite.location!.lat, worksite.location!.lng]}
                                        radius={8}
                                        pathOptions={{
                                            color: '#ffffff',
                                            fillColor: statusColor(worksite.status),
                                            fillOpacity: 0.9,
                                            weight: 2
                                        }}
                                        eventHandlers={{
                                            click: () => setSelectedPermit(worksite)
                                        }}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[180px]">
                                                <div className="font-black text-[var(--text-primary)] text-sm">{worksite.road_name}</div>
                                                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold mt-1">{worksite.permit_number}</div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-2">{worksite.purpose}</div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    </Card>

                    <Card className="border-[var(--border)] bg-[var(--bg-surface)]/70">
                        {selectedPermit ? (
                            <div className="p-6 space-y-6">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Selected Worksite</div>
                                        <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">{selectedPermit.road_name}</h2>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                            {selectedPermit.permit_number} · {selectedPermit.ward}
                                        </div>
                                    </div>
                                    <Badge variant={selectedPermit.status === 'completed' ? 'success' : selectedPermit.status === 'active' ? 'warning' : 'info'}>
                                        {selectedPermit.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                            <HardHat size={12} /> Department
                                        </div>
                                        <div className="text-sm font-black text-[var(--text-primary)]">{selectedPermit.department}</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                            <Route size={12} /> Closure
                                        </div>
                                        <div className="text-sm font-black text-[var(--text-primary)]">{selectedPermit.closure_type || 'Partial'}</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                            <IndianRupee size={12} /> Budget
                                        </div>
                                        <div className="text-sm font-black text-[var(--text-primary)]">₹{selectedPermit.budget_inr.toLocaleString()}</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                            <BellRing size={12} /> Subscribers
                                        </div>
                                        <div className="text-sm font-black text-[var(--text-primary)]">{selectedPermit.subscriber_count || 0}</div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Public Timeline</div>
                                    {selectedPermit.updates.map((update, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <div className={`mt-1 w-4 h-4 rounded-full border-2 ${update.done ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : 'border-[var(--border)]'}`} />
                                            <div>
                                                <div className="text-xs font-black text-[var(--text-primary)] uppercase">{update.label}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                                    {new Date(update.date).toLocaleString()}
                                                </div>
                                                {update.note && <div className="text-[11px] text-[var(--text-secondary)] mt-1">{update.note}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-[var(--green)]" />
                                        Blockchain hash verified
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                        <Star size={14} className="text-[var(--yellow)]" />
                                        Citizen rating {selectedPermit.citizen_rating || 0}/5
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Closure Proof</div>
                                            <div className="text-sm font-black text-[var(--text-primary)]">
                                                {selectedPermit.photo_timeline?.length || 0} stage photo{(selectedPermit.photo_timeline?.length || 0) === 1 ? '' : 's'}
                                            </div>
                                        </div>
                                        {selectedProof && (
                                            <Badge variant={selectedProof.status === 'paid' ? 'success' : selectedProof.status === 'approved' ? 'info' : 'warning'}>
                                                {selectedProof.status.replace(/_/g, ' ')}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="text-xs text-[var(--text-secondary)]">
                                        {selectedPermit.archive_ready ? 'Archive-ready proof package is complete.' : 'Evidence package still in progress.'}
                                    </div>

                                    {selectedProof && (
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                                    <ClipboardCheck size={12} /> Engineer Sign-Off
                                                </div>
                                                <div className="text-xs font-black text-[var(--text-primary)]">
                                                    {selectedProof.engineer_sign_off || 'Pending'}
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                                    <IndianRupee size={12} /> Payout Release
                                                </div>
                                                <div className="text-xs font-black text-[var(--text-primary)]">
                                                    {selectedProof.payout_completion_percent}% · {selectedMilestones.filter((item) => item.status === 'released').length}/{selectedMilestones.length} milestones
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedPermit.photo_timeline && selectedPermit.photo_timeline.length > 0 && (
                                    <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] flex items-center gap-2">
                                            <Camera size={12} /> Before / During / After Timeline
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {selectedPermit.photo_timeline.map((item) => (
                                                <div key={item.id} className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-base)]">
                                                    {item.photo_url ? (
                                                        <img src={item.photo_url} alt={item.stage} className="h-40 w-full object-cover" />
                                                    ) : (
                                                        <div className="h-40 w-full bg-[var(--bg-hover)] border-b border-[var(--border)] flex items-center justify-center gap-2 text-[var(--text-muted)]">
                                                            <ImageOff size={16} />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Photo pending upload</span>
                                                        </div>
                                                    )}
                                                    <div className="p-4 space-y-2">
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <Badge variant={item.stage === 'after' ? 'success' : item.stage === 'during' ? 'warning' : 'info'}>
                                                                {item.stage}
                                                            </Badge>
                                                            <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                                                {new Date(item.captured_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-[var(--text-secondary)] break-words">{item.note}</div>
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                                            Uploaded by {item.uploaded_by}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Citizen Feedback</div>
                                            <div className="text-sm font-black text-[var(--text-primary)]">Rate the final quality after the road reopens</div>
                                        </div>
                                        <Badge variant="success">{selectedFeedback.length} responses</Badge>
                                    </div>

                                    {selectedFeedback.length > 0 && (
                                        <div className="space-y-3">
                                            {selectedFeedback.slice(0, 3).map((entry) => (
                                                <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div className="text-sm font-black text-[var(--text-primary)]">{entry.citizen_name}</div>
                                                        <Badge variant={entry.rating >= 4 ? 'success' : 'warning'}>{entry.rating}/5</Badge>
                                                    </div>
                                                    <div className="text-xs text-[var(--text-secondary)] mt-2 break-words">{entry.feedback}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Citizen name"
                                            value={feedbackName}
                                            onChange={(event) => setFeedbackName(event.target.value)}
                                        />
                                        <Input
                                            placeholder="Rating (1-5)"
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={feedbackRating}
                                            onChange={(event) => setFeedbackRating(event.target.value)}
                                        />
                                    </div>

                                    <Textarea
                                        placeholder="Share how the reopened road feels, whether the signage was clear, and whether the final surface quality is acceptable..."
                                        value={feedbackText}
                                        onChange={(event) => setFeedbackText(event.target.value)}
                                        className="min-h-[110px]"
                                    />

                                    <Button className="w-full" onClick={handleFeedbackSubmit}>
                                        <MessageSquare size={14} /> Submit Completion Feedback
                                    </Button>
                                </div>

                                <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Work Alerts</div>
                                            <div className="text-sm font-black text-[var(--text-primary)]">Subscribe for closure and completion updates</div>
                                        </div>
                                        <Badge variant="info">{selectedPermit.subscriber_count || 0} active</Badge>
                                    </div>

                                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                        Receive permit start notices, detour changes, and final reinstatement confirmation for this corridor.
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Citizen name"
                                            value={subscriberName}
                                            onChange={(event) => setSubscriberName(event.target.value)}
                                        />
                                        <Input
                                            placeholder="Phone / WhatsApp number"
                                            value={subscriberPhone}
                                            onChange={(event) => setSubscriberPhone(event.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {(['whatsapp', 'sms', 'push'] as const).map((channel) => (
                                            <Button
                                                key={channel}
                                                size="sm"
                                                variant={subscriberChannel === channel ? 'primary' : 'ghost'}
                                                onClick={() => setSubscriberChannel(channel)}
                                            >
                                                {channel}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Button onClick={handleSubscribe}>
                                            <BellRing size={14} /> Subscribe to Alerts
                                        </Button>
                                        <Button variant="ghost" onClick={() => navigate('/notifications')}>
                                            View Notification Center
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Ward + Commute Alerts</div>
                                            <div className="text-sm font-black text-[var(--text-primary)]">Follow a route, not only one worksite</div>
                                        </div>
                                        <Badge variant="info">{routeSubscriptions.length} route subscribers</Badge>
                                    </div>

                                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                        Get 24-hour and emergency alerts for your usual corridor or ward, including detours and completion notices.
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Citizen name"
                                            value={routeSubscriberName}
                                            onChange={(event) => setRouteSubscriberName(event.target.value)}
                                        />
                                        <Input
                                            placeholder="Phone / WhatsApp number"
                                            value={routeSubscriberPhone}
                                            onChange={(event) => setRouteSubscriberPhone(event.target.value)}
                                        />
                                        <Input
                                            placeholder="Commute route"
                                            value={routeName}
                                            onChange={(event) => setRouteName(event.target.value)}
                                        />
                                        <Input
                                            placeholder="Ward"
                                            value={routeWard}
                                            onChange={(event) => setRouteWard(event.target.value)}
                                        />
                                        <Input
                                            placeholder="Commute window"
                                            value={commuteWindow}
                                            onChange={(event) => setCommuteWindow(event.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {(['whatsapp', 'sms', 'push'] as const).map((channel) => (
                                            <Button
                                                key={channel}
                                                size="sm"
                                                variant={routeChannel === channel ? 'primary' : 'ghost'}
                                                onClick={() => setRouteChannel(channel)}
                                            >
                                                {channel}
                                            </Button>
                                        ))}
                                    </div>

                                    <Button className="w-full" onClick={handleRouteSubscribe}>
                                        <BellRing size={14} /> Subscribe to Route Alerts
                                    </Button>
                                </div>

                                <Button className="w-full" onClick={() => navigate(`/track/${selectedPermit.permit_number}`)}>
                                    Open Full Public Tracker
                                </Button>
                                <Button className="w-full" variant="ghost" onClick={() => navigate('/traffic')}>
                                    View Traffic & Delay Command
                                </Button>
                            </div>
                        ) : (
                            <div className="p-10 text-center text-[var(--text-muted)]">Select a worksite to inspect public details.</div>
                        )}
                    </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {filteredWorksites.map((worksite) => (
                        <Card key={worksite.id} className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <div className="text-sm font-black text-[var(--text-primary)]">{worksite.road_name}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                        {worksite.permit_number} · {worksite.ward}
                                    </div>
                                </div>
                                <Badge variant={worksite.status === 'completed' ? 'success' : worksite.status === 'active' ? 'warning' : 'info'}>
                                    {worksite.status}
                                </Badge>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{worksite.purpose}</div>
                            <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
                                <div className="flex items-center gap-2"><MapPin size={12} className="text-[var(--blue)]" /> {worksite.zone} · {worksite.department}</div>
                                <div className="flex items-center gap-2"><Clock size={12} className="text-[var(--blue)]" /> Ends {new Date(worksite.estimated_completion).toLocaleDateString()}</div>
                                <div className="flex items-center gap-2"><IndianRupee size={12} className="text-[var(--blue)]" /> ₹{worksite.budget_inr.toLocaleString()}</div>
                            </div>
                            <Button className="w-full mt-5" variant="ghost" onClick={() => navigate(`/track/${worksite.permit_number}`)}>
                                View Tracker
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
