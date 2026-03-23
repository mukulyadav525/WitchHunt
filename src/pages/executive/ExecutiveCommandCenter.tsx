import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
import {
    listCitizenChampionsData,
    listCitizenCompletionFeedbackData,
    listClosureProofPackagesData,
    listPaymentMilestonesData,
    listPolicyAlertsData,
    listPublicVerificationEventsData,
    listPublicWorksitesData,
    listRouteAlertSubscriptionsData,
    listSmartNotificationsData,
    listTrafficAdvisoriesData,
    listWardLeaderboardData,
    listWorkOrdersData
} from '../../lib/supabaseData';
import {
    AlertTriangle,
    ArrowRight,
    BellRing,
    IndianRupee,
    Landmark,
    Search,
    ShieldCheck,
    Siren,
    Trophy,
    Users
} from 'lucide-react';
import type {
    CitizenChampion,
    CitizenCompletionFeedback,
    ClosureProofPackage,
    PaymentMilestone,
    PolicyAlert,
    PublicVerificationEvent,
    PublicWorksite,
    RouteAlertSubscription,
    SmartNotification,
    TrafficAdvisory,
    WardLeaderboardEntry,
    WorkOrder
} from '../../types';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

type WardHealthBand = 'stable' | 'watch' | 'intervene';

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function bandVariant(band: WardHealthBand) {
    switch (band) {
        case 'stable':
            return 'success';
        case 'watch':
            return 'warning';
        default:
            return 'error';
    }
}

export function ExecutiveCommandCenter() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWardName, setSelectedWardName] = useState('');
    const [worksites, setWorksites] = useState<PublicWorksite[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [policyAlerts, setPolicyAlerts] = useState<PolicyAlert[]>([]);
    const [verifications, setVerifications] = useState<PublicVerificationEvent[]>([]);
    const [feedback, setFeedback] = useState<CitizenCompletionFeedback[]>([]);
    const [proofs, setProofs] = useState<ClosureProofPackage[]>([]);
    const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
    const [traffic, setTraffic] = useState<TrafficAdvisory[]>([]);
    const [notifications, setNotifications] = useState<SmartNotification[]>([]);
    const [routeSubscriptions, setRouteSubscriptions] = useState<RouteAlertSubscription[]>([]);
    const [citizenChampions, setCitizenChampions] = useState<CitizenChampion[]>([]);
    const [wardLeaderboard, setWardLeaderboard] = useState<WardLeaderboardEntry[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [
                nextWorksites,
                nextWorkOrders,
                nextPolicyAlerts,
                nextVerifications,
                nextFeedback,
                nextProofs,
                nextMilestones,
                nextTraffic,
                nextNotifications,
                nextRouteSubscriptions,
                nextCitizenChampions,
                nextWardLeaderboard
            ] = await Promise.all([
                listPublicWorksitesData(),
                listWorkOrdersData(),
                listPolicyAlertsData(),
                listPublicVerificationEventsData(),
                listCitizenCompletionFeedbackData(),
                listClosureProofPackagesData(),
                listPaymentMilestonesData(),
                listTrafficAdvisoriesData(),
                listSmartNotificationsData(),
                listRouteAlertSubscriptionsData(),
                listCitizenChampionsData(),
                listWardLeaderboardData()
            ]);
            setWorksites(nextWorksites);
            setWorkOrders(nextWorkOrders);
            setPolicyAlerts(nextPolicyAlerts);
            setVerifications(nextVerifications);
            setFeedback(nextFeedback);
            setProofs(nextProofs);
            setMilestones(nextMilestones);
            setTraffic(nextTraffic);
            setNotifications(nextNotifications);
            setRouteSubscriptions(nextRouteSubscriptions);
            setCitizenChampions(nextCitizenChampions);
            setWardLeaderboard(nextWardLeaderboard);
            setSelectedWardName((current) => current || nextWardLeaderboard[0]?.ward || nextWorksites[0]?.ward || 'Ward not tagged');
        };

        void loadData();
    }, []);

    const wardByPermit = new Map(worksites.map((item) => [item.permit_number, item.ward || 'Ward not tagged'] as const));
    const wardByRoad = new Map(worksites.map((item) => [item.road_name, item.ward || 'Ward not tagged'] as const));

    const wardSummaries = useMemo(() => {
        const wards = Array.from(new Set([
            ...worksites.map((item) => item.ward || 'Ward not tagged'),
            ...wardLeaderboard.map((item) => item.ward),
            ...routeSubscriptions.map((item) => item.ward),
            ...traffic.map((item) => item.ward)
        ]));

        return wards.map((ward) => {
            const wardWorksites = worksites.filter((item) => (item.ward || 'Ward not tagged') === ward);
            const wardOrders = workOrders.filter((item) => item.ward === ward);
            const wardTraffic = traffic.filter((item) => item.ward === ward);
            const wardFeedback = feedback.filter((item) => item.ward === ward);
            const wardVerifications = verifications.filter((item) => item.ward === ward);
            const wardRouteSubscriptions = routeSubscriptions.filter((item) => item.ward === ward);
            const wardProofs = proofs.filter((item) => item.ward === ward);
            const wardMilestones = milestones.filter((item) => wardProofs.some((proof) => proof.id === item.closure_proof_id));
                const wardAlerts = policyAlerts.filter((alert) => {
                    const mappedWard = alert.permit_number
                        ? wardByPermit.get(alert.permit_number)
                        : wardByRoad.get(alert.road_name);
                    return mappedWard === ward;
                });
            const leaderboard = wardLeaderboard.find((item) => item.ward === ward) || null;
            const champion = citizenChampions
                .filter((item) => item.ward === ward)
                .sort((a, b) => b.points - a.points)[0] || null;

            const activeWorks = wardWorksites.filter((item) => item.status !== 'completed').length;
            const ratingInputs = [
                ...wardFeedback.map((item) => item.rating),
                ...wardWorksites
                    .map((item) => item.citizen_rating)
                    .filter((item): item is number => typeof item === 'number')
            ];
            const avgRating = ratingInputs.length
                ? ratingInputs.reduce((sum, value) => sum + value, 0) / ratingInputs.length
                : 4;
            const flaggedVerifications = wardVerifications.filter((item) => item.outcome === 'flagged').length;
            const criticalAlerts = wardAlerts.filter((item) => item.severity === 'critical').length;
            const highAlerts = wardAlerts.filter((item) => item.severity === 'high').length;
            const archiveReadyRatio = wardProofs.length
                ? wardProofs.filter((item) => item.status === 'approved' || item.status === 'paid').length / wardProofs.length
                : 0.4;
            const trustScore = clamp(
                Math.round(
                    avgRating * 16 +
                    archiveReadyRatio * 18 +
                    (leaderboard?.fix_rate_percent || 72) * 0.22 +
                    Math.min(wardRouteSubscriptions.length, 8) -
                    flaggedVerifications * 10 -
                    criticalAlerts * 10 -
                    highAlerts * 5
                ),
                22,
                98
            );
            const budgetCommitted = wardWorksites.reduce((sum, item) => sum + item.budget_inr, 0);
            const budgetAtRisk = Math.round(wardWorksites.reduce((sum, item) => {
                const alertWeight = wardAlerts.some((alert) => alert.permit_number === item.permit_number) ? 0.18 : 0.06;
                return sum + item.budget_inr * Math.max(item.delay_probability, alertWeight);
            }, 0));
            const payoutLocked = wardMilestones
                .filter((item) => item.status !== 'released')
                .reduce((sum, item) => sum + item.amount_inr, 0);
            const preventiveOrders = wardOrders.filter((item) => item.source === 'prediction');
            const reactiveOrders = wardOrders.filter((item) => item.source !== 'prediction');
            const savingsEstimate = Math.round(
                preventiveOrders.reduce((sum, item) => sum + item.estimated_cost_inr * 0.18, 0) +
                wardAlerts.filter((item) => item.category === 'repeat_dig').length * 240000
            );

            const band: WardHealthBand = trustScore >= 78 && criticalAlerts === 0 && budgetAtRisk < budgetCommitted * 0.2
                ? 'stable'
                : trustScore >= 58 && criticalAlerts <= 1
                    ? 'watch'
                    : 'intervene';

            return {
                ward,
                band,
                activeWorks,
                openOrders: wardOrders.filter((item) => item.status !== 'completed').length,
                trafficAlerts: wardTraffic.filter((item) => item.status !== 'cleared').length,
                policyAlerts: wardAlerts.length,
                criticalAlerts,
                trustScore,
                budgetCommitted,
                budgetAtRisk,
                payoutLocked,
                routeSubscribers: wardRouteSubscriptions.length,
                flaggedVerifications,
                publicVerifications: wardVerifications.length,
                avgRating: Number(avgRating.toFixed(1)),
                savingsEstimate,
                preventiveOrders: preventiveOrders.length,
                reactiveOrders: reactiveOrders.length,
                leaderboard,
                champion
            };
        }).sort((a, b) =>
            (b.criticalAlerts * 100 + b.policyAlerts * 10 + b.budgetAtRisk) -
            (a.criticalAlerts * 100 + a.policyAlerts * 10 + a.budgetAtRisk)
        );
    }, [citizenChampions, feedback, milestones, policyAlerts, proofs, routeSubscriptions, traffic, verifications, wardByPermit, wardByRoad, wardLeaderboard, workOrders, worksites]);

    const filteredWards = wardSummaries.filter((item) => {
        const haystack = `${item.ward} ${item.band} ${item.champion?.name || ''}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
    });

    const selectedWard = filteredWards.find((item) => item.ward === selectedWardName)
        || wardSummaries.find((item) => item.ward === selectedWardName)
        || filteredWards[0]
        || wardSummaries[0]
        || null;

    const selectedNotifications = selectedWard
        ? notifications.filter((item) => item.ward === selectedWard.ward).slice(0, 3)
        : [];
    const selectedAlerts = selectedWard
        ? policyAlerts.filter((alert) => {
            const mappedWard = alert.permit_number
                ? wardByPermit.get(alert.permit_number)
                : wardByRoad.get(alert.road_name);
            return mappedWard === selectedWard.ward;
        }).slice(0, 4)
        : [];

    const executiveStats = useMemo(() => {
        const wardsUnderStress = wardSummaries.filter((item) => item.band !== 'stable').length;
        const budgetAtRisk = wardSummaries.reduce((sum, item) => sum + item.budgetAtRisk, 0);
        const payoutLocked = wardSummaries.reduce((sum, item) => sum + item.payoutLocked, 0);
        const averageTrust = wardSummaries.length
            ? Math.round(wardSummaries.reduce((sum, item) => sum + item.trustScore, 0) / wardSummaries.length)
            : 0;
        const savingsEstimate = wardSummaries.reduce((sum, item) => sum + item.savingsEstimate, 0);

        return {
            wardsUnderStress,
            budgetAtRisk,
            payoutLocked,
            averageTrust,
            savingsEstimate
        };
    }, [wardSummaries]);

    const chartData = wardSummaries.map((item) => ({
        ward: item.ward.replace('Ward ', 'W-'),
        trust: item.trustScore,
        atRiskLakh: Number((item.budgetAtRisk / 100000).toFixed(1))
    }));

    if (!selectedWard) {
        return <div className="page-container">No ward performance data available.</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-display font-black text-2xl text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                        Executive Command Center <Landmark className="text-[var(--brand)]" size={22} />
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Commissioner-ready ward performance, budget-at-risk visibility, citizen trust, and action queues built from the live operations graph.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="info">Ward Performance Dashboard</Badge>
                    <Button variant="ghost" onClick={() => navigate('/audit')}>
                        Audit & Ledger
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/closure-proof')}>
                        Closure Proof
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-6">
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Wards Under Stress</div>
                    <div className="text-3xl font-black text-[var(--red)]">{executiveStats.wardsUnderStress}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Budget At Risk</div>
                    <div className="text-3xl font-black text-[var(--text-primary)]">₹{executiveStats.budgetAtRisk.toLocaleString()}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Locked Payouts</div>
                    <div className="text-3xl font-black text-[var(--yellow)]">₹{executiveStats.payoutLocked.toLocaleString()}</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Citizen Trust</div>
                    <div className="text-3xl font-black text-[var(--green)]">{executiveStats.averageTrust}/100</div>
                </Card>
                <Card className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Estimated Savings</div>
                    <div className="text-3xl font-black text-[var(--blue)]">₹{executiveStats.savingsEstimate.toLocaleString()}</div>
                </Card>
            </div>

            <div className="grid xl:grid-cols-[0.95fr,2.05fr] gap-8">
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-panel)] space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Ward Performance Queue</div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <Input
                                className="pl-9"
                                placeholder="Search ward or champion..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filteredWards.map((item) => (
                            <button
                                key={item.ward}
                                type="button"
                                onClick={() => setSelectedWardName(item.ward)}
                                className="w-full p-4 text-left transition-colors hover:bg-[var(--bg-hover)]"
                                style={selectedWard?.ward === item.ward ? { background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)' } : undefined}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-[var(--text-primary)] break-words">{item.ward}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                            {item.activeWorks} active works · {item.policyAlerts} policy alerts
                                        </div>
                                    </div>
                                    <Badge variant={bandVariant(item.band)}>{item.band}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Badge variant="info">trust {item.trustScore}</Badge>
                                    <Badge variant="warning">risk ₹{item.budgetAtRisk.toLocaleString()}</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="space-y-8 min-w-0">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Commissioner Brief</div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] break-words">{selectedWard.ward}</h2>
                                    <Badge variant={bandVariant(selectedWard.band)}>{selectedWard.band}</Badge>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-2">
                                    {selectedWard.policyAlerts} policy alerts · trust {selectedWard.trustScore}/100 · budget at risk ₹{selectedWard.budgetAtRisk.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button variant="ghost" onClick={() => navigate('/works')}>
                                    Public Works
                                </Button>
                                <Button variant="ghost" onClick={() => navigate('/traffic')}>
                                    Traffic & Delay
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Active Works</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedWard.activeWorks}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Open Orders</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedWard.openOrders}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Traffic Alerts</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedWard.trafficAlerts}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Citizen Rating</div>
                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedWard.avgRating.toFixed(1)}/5</div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <IndianRupee size={16} className="text-[var(--brand)]" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Budget Justification</div>
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Committed budget</span><span className="metric-value">₹{selectedWard.budgetCommitted.toLocaleString()}</span></div>
                                        <div className="metric-row"><span className="metric-label">Budget at risk</span><span className="metric-value">₹{selectedWard.budgetAtRisk.toLocaleString()}</span></div>
                                        <div className="metric-row"><span className="metric-label">Locked payouts</span><span className="metric-value">₹{selectedWard.payoutLocked.toLocaleString()}</span></div>
                                        <div className="metric-row"><span className="metric-label">Preventive orders</span><span className="metric-value">{selectedWard.preventiveOrders}</span></div>
                                        <div className="metric-row"><span className="metric-label">Reactive orders</span><span className="metric-value">{selectedWard.reactiveOrders}</span></div>
                                        <div className="metric-row"><span className="metric-label">Estimated savings</span><span className="metric-value">₹{selectedWard.savingsEstimate.toLocaleString()}</span></div>
                                    </div>
                                    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                                        Estimated savings are inferred from preventive orders and avoided repeat digs in the current local dataset.
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users size={16} className="text-[var(--green)]" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Citizen Trust & Reach</div>
                                    </div>
                                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                        <div className="metric-row"><span className="metric-label">Trust score</span><span className="metric-value">{selectedWard.trustScore}/100</span></div>
                                        <div className="metric-row"><span className="metric-label">Public verifications</span><span className="metric-value">{selectedWard.publicVerifications}</span></div>
                                        <div className="metric-row"><span className="metric-label">Flagged verifications</span><span className="metric-value">{selectedWard.flaggedVerifications}</span></div>
                                        <div className="metric-row"><span className="metric-label">Route subscribers</span><span className="metric-value">{selectedWard.routeSubscribers}</span></div>
                                    </div>
                                    {selectedWard.champion && (
                                        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Trophy size={14} className="text-[var(--yellow)]" />
                                                <div className="text-sm font-black text-[var(--text-primary)]">{selectedWard.champion.name}</div>
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-2">
                                                {selectedWard.champion.badge} · {selectedWard.champion.points} points · {selectedWard.champion.recent_win}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 min-w-0">
                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BellRing size={16} className="text-[var(--blue)]" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Commissioner Action Queue</div>
                                    </div>
                                    <div className="space-y-3">
                                        {selectedAlerts.length > 0 ? selectedAlerts.map((alert) => (
                                            <div key={alert.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="text-sm font-black text-[var(--text-primary)] break-words">{alert.title}</div>
                                                    <Badge variant={bandVariant(alert.severity === 'critical' ? 'intervene' : 'watch')}>{alert.severity}</Badge>
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-2 break-words">{alert.description}</div>
                                            </div>
                                        )) : (
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                                No direct action alerts for this ward right now.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <ShieldCheck size={16} className="text-[var(--green)]" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Public Messaging Queue</div>
                                    </div>
                                    <div className="space-y-3">
                                        {selectedNotifications.length > 0 ? selectedNotifications.map((item) => (
                                            <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-sm font-black text-[var(--text-primary)] break-words">{item.title}</div>
                                                    <Badge variant={item.priority === 'critical' ? 'error' : item.priority === 'high' ? 'warning' : 'info'}>
                                                        {item.priority}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-2 break-words">{item.body}</div>
                                            </div>
                                        )) : (
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                                No scheduled public messages for this ward.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Card className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                                    <div className="flex items-start gap-3">
                                        <Siren className="text-[var(--red)] shrink-0 mt-0.5" size={18} />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-[var(--text-primary)]">Executive note</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed break-words">
                                                This view is designed for city leadership to decide where intervention, commissioner co-sign, or budget protection should happen first.
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-5">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Ward Comparison</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-2">
                                    Trust and budget-at-risk comparison across active wards.
                                </div>
                            </div>
                            <Badge variant="info">{wardSummaries.length} wards</Badge>
                        </div>

                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                    <XAxis dataKey="ward" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar yAxisId="left" dataKey="trust" fill="var(--green)" radius={[8, 8, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="atRiskLakh" fill="var(--brand)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/audit')}>
                                Audit Center <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/notifications')}>
                                Notifications <ArrowRight size={14} />
                            </Button>
                            <Button variant="ghost" className="justify-between" onClick={() => navigate('/contractors')}>
                                Contractor Hub <ArrowRight size={14} />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
