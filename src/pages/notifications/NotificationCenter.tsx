import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge, Input } from '../../components/ui';
import {
    createRouteAlertSubscriptionData,
    listNotificationSubscriptionsData,
    listRouteAlertSubscriptionsData,
    listSmartNotificationsData,
    saveSmartNotificationData
} from '../../lib/supabaseData';
import { BellRing, Search, Send, ShieldCheck, Siren, Route, Users } from 'lucide-react';
import type { NotificationSubscription, RouteAlertSubscription, SmartNotification } from '../../types';
import toast from 'react-hot-toast';

type AudienceFilter = 'all' | 'citizens' | 'traffic_police' | 'shopkeepers' | 'fleet_operators' | 'utility_teams';

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<SmartNotification[]>([]);
    const [routeSubscriptions, setRouteSubscriptions] = useState<RouteAlertSubscription[]>([]);
    const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
    const [routeSubscriberName, setRouteSubscriberName] = useState('');
    const [routeSubscriberPhone, setRouteSubscriberPhone] = useState('');
    const [routeChannel, setRouteChannel] = useState<'whatsapp' | 'sms' | 'push'>('whatsapp');
    const [routeName, setRouteName] = useState('');
    const [routeWard, setRouteWard] = useState('');
    const [commuteWindow, setCommuteWindow] = useState('08:00 - 10:00');

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        try {
            const [nextNotifications, nextRouteSubscriptions, nextSubscriptions] = await Promise.all([
                listSmartNotificationsData(),
                listRouteAlertSubscriptionsData(),
                listNotificationSubscriptionsData()
            ]);
            setNotifications(nextNotifications);
            setRouteSubscriptions(nextRouteSubscriptions);
            setSubscriptions(nextSubscriptions);
            setRouteName((current) => current || nextRouteSubscriptions[0]?.route_name || '');
            setRouteWard((current) => current || nextRouteSubscriptions[0]?.ward || '');
        } catch (error: any) {
            toast.error(error.message || 'Unable to load notification data from Supabase.');
        }
    }

    const filteredNotifications = useMemo(() => {
        return notifications.filter((notification) => {
            const matchesAudience = audienceFilter === 'all' || notification.audience === audienceFilter;
            const haystack = `${notification.title} ${notification.road_name} ${notification.ward} ${notification.channel}`.toLowerCase();
            const matchesSearch = haystack.includes(searchQuery.toLowerCase());
            return matchesAudience && matchesSearch;
        });
    }, [audienceFilter, notifications, searchQuery]);

    const handleReplay = async (notification: SmartNotification) => {
        try {
            await saveSmartNotificationData({
                ...notification,
                id: '',
                status: 'scheduled',
                scheduled_for: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            });
            await loadData();
            toast.success(`Replay queued for ${notification.road_name}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to replay this notification.');
        }
    };

    const handleRouteSubscribe = async () => {
        const normalizedName = routeSubscriberName.trim();
        const normalizedPhone = routeSubscriberPhone.trim();
        const normalizedRoute = routeName.trim();
        const normalizedWard = routeWard.trim();

        if (!normalizedName || !normalizedPhone || !normalizedRoute || !normalizedWard) {
            toast.error('Enter name, phone, route, and ward to add a route alert subscriber.');
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
                source: 'notification_center'
            });

            if (!result.created) {
                toast.error('This route alert subscription already exists for the selected channel.');
                return;
            }

            await loadData();
            setRouteSubscriberName('');
            setRouteSubscriberPhone('');
            toast.success(`Route alerts enabled for ${normalizedRoute}.`);
        } catch (error: any) {
            toast.error(error.message || 'Unable to save the route subscription.');
        }
    };

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Notification Center <BellRing className="text-[var(--blue)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Proactive civic messaging for planned works, emergency response, and traffic coordination.
                    </p>
                </div>
                <Badge variant="info">Smart Notification System</Badge>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Scheduled</div>
                    <div className="text-3xl font-black text-[var(--blue)]">{notifications.filter((item) => item.status === 'scheduled').length}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Sent</div>
                    <div className="text-3xl font-black text-[var(--green)]">{notifications.filter((item) => item.status === 'sent' || item.status === 'delivered').length}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Critical</div>
                    <div className="text-3xl font-black text-[var(--red)]">{notifications.filter((item) => item.priority === 'critical').length}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Subscribers</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">{subscriptions.length + routeSubscriptions.length}</div>
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Citizen Opt-Ins</div>
                        <div className="text-sm text-[var(--text-secondary)] mt-2">
                            Active public subscriptions created from the worksite transparency portal.
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="info">{subscriptions.filter((item) => item.channel === 'whatsapp').length} WhatsApp</Badge>
                        <Badge variant="success">{subscriptions.filter((item) => item.channel === 'sms').length} SMS</Badge>
                        <Badge variant="warning">{subscriptions.filter((item) => item.channel === 'push').length} Push</Badge>
                    </div>
                </div>

                {subscriptions.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-4">
                        {subscriptions.slice(0, 6).map((subscription) => (
                            <div key={subscription.id} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-black text-[var(--text-primary)]">{subscription.subscriber_name}</div>
                                    <Badge variant="info">{subscription.channel}</Badge>
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">{subscription.road_name} · {subscription.ward}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    {subscription.subscriber_phone}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    Radius {subscription.radius_m}m · {new Date(subscription.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-[var(--text-muted)]">No citizen subscriptions yet. New opt-ins from the public works portal will appear here.</div>
                )}
            </Card>

            <Card className="p-6">
                <div className="grid xl:grid-cols-[1.2fr,0.8fr] gap-6">
                    <div>
                        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Route Alert Subscribers</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-2">
                                    Commute and ward-based alert subscribers who should receive 24-hour and emergency closure notices.
                                </div>
                            </div>
                            <Badge variant="warning">{routeSubscriptions.length} active</Badge>
                        </div>

                        {routeSubscriptions.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                {routeSubscriptions.slice(0, 6).map((subscription) => (
                                    <div key={subscription.id} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm font-black text-[var(--text-primary)]">{subscription.subscriber_name}</div>
                                            <Badge variant="info">{subscription.channel}</Badge>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)]">{subscription.route_name}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                            {subscription.ward} · {subscription.commute_window}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                            {subscription.subscriber_phone}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-[var(--text-muted)]">No route-based subscribers yet.</div>
                        )}
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)] space-y-4">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Add Route Subscriber</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-2">
                                Capture commute-based alerts for citizens, police, or fleet operators when they opt in.
                            </div>
                        </div>

                        <Input
                            placeholder="Subscriber name"
                            value={routeSubscriberName}
                            onChange={(event) => setRouteSubscriberName(event.target.value)}
                        />
                        <Input
                            placeholder="Phone / WhatsApp number"
                            value={routeSubscriberPhone}
                            onChange={(event) => setRouteSubscriberPhone(event.target.value)}
                        />
                        <Input
                            placeholder="Route name"
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
                            <Users size={14} /> Save Route Subscriber
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Notification Queue</div>
                        <Badge variant="warning">{filteredNotifications.length} visible</Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <Input
                                className="pl-9 w-64"
                                placeholder="Search road, ward, or channel..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                        {(['all', 'citizens', 'traffic_police', 'shopkeepers', 'fleet_operators', 'utility_teams'] as AudienceFilter[]).map((audience) => (
                            <Button
                                key={audience}
                                variant={audienceFilter === audience ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setAudienceFilter(audience)}
                            >
                                {audience}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
                    {filteredNotifications.map((notification) => (
                        <div key={notification.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-3 max-w-3xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={notification.priority === 'critical' ? 'error' : notification.priority === 'high' ? 'warning' : 'info'}>
                                        {notification.priority}
                                    </Badge>
                                    <Badge variant="success">{notification.channel}</Badge>
                                    <Badge variant="info">{notification.audience}</Badge>
                                </div>
                                <div>
                                    <div className="text-sm font-black text-[var(--text-primary)]">{notification.title}</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{notification.body}</div>
                                </div>
                                <div className="flex items-center gap-5 text-[11px] text-[var(--text-secondary)] flex-wrap">
                                    <span className="flex items-center gap-2"><Route size={12} className="text-[var(--blue)]" /> {notification.road_name}</span>
                                    <span className="flex items-center gap-2"><Users size={12} className="text-[var(--blue)]" /> {notification.ward}</span>
                                    <span className="flex items-center gap-2"><Siren size={12} className="text-[var(--blue)]" /> Radius {notification.radius_m}m</span>
                                </div>
                            </div>

                            <div className="min-w-[220px] space-y-3">
                                <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Delivery State</div>
                                    <div className="text-sm font-black text-[var(--text-primary)] uppercase">{notification.status}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                        {new Date(notification.scheduled_for).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-[var(--green)]" />
                                        {notification.language}
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleReplay(notification)}>
                                        <Send size={12} /> Replay
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
