import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import {
    listCitizenChampionsData,
    listCivicRewardRulesData,
    listWardLeaderboardData
} from '../../lib/supabaseData';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { ArrowLeft, Trophy, Sparkles, ShieldCheck, Star, MapPinned } from 'lucide-react';
import type { CitizenChampion, CivicRewardRule, WardLeaderboardEntry } from '../../types';

export function CivicEngagement() {
    const navigate = useNavigate();
    const [rules, setRules] = useState<CivicRewardRule[]>([]);
    const [champions, setChampions] = useState<CitizenChampion[]>([]);
    const [leaderboard, setLeaderboard] = useState<WardLeaderboardEntry[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [nextRules, nextChampions, nextLeaderboard] = await Promise.all([
                listCivicRewardRulesData(),
                listCitizenChampionsData(),
                listWardLeaderboardData()
            ]);
            setRules(nextRules);
            setChampions(nextChampions);
            setLeaderboard(nextLeaderboard);
        };

        void loadData();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/')}>
                            <ArrowLeft size={16} /> Home
                        </Button>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--blue)]">Civic Engagement Layer</div>
                            <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mt-2">
                                Road Guardian Leaderboard
                            </h1>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    {rules.map((rule) => (
                        <Card key={rule.id} className="p-5 border-[var(--border)] bg-[var(--bg-surface)]/70">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">{rule.action}</div>
                            <div className="text-3xl font-black text-[var(--blue)]">+{rule.points}</div>
                            <div className="text-xs text-[var(--text-secondary)] mt-3">{rule.description}</div>
                        </Card>
                    ))}
                </div>

                <div className="grid lg:grid-cols-[0.8fr,1.2fr] gap-8">
                    <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/70 space-y-6">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--text-muted)]">Top Citizens</div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] mt-2">Monthly Champions</h2>
                        </div>

                        <div className="space-y-4">
                            {champions.map((champion, index) => (
                                <div key={champion.id} className="p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-black text-[var(--text-primary)]">{index + 1}. {champion.name}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                {champion.ward} · {champion.badge}
                                            </div>
                                        </div>
                                        <Badge variant="info">{champion.points} pts</Badge>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-3">{champion.recent_win}</div>
                                    <div className="flex items-center gap-4 mt-4 text-[11px] text-[var(--text-secondary)]">
                                        <span>{champion.validated_reports} validated reports</span>
                                        <span>{champion.streak_days}-day streak</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="space-y-8">
                        <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/70">
                            <div className="flex items-center gap-3 mb-5">
                                <Trophy className="text-[var(--yellow)]" size={20} />
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Ward Leaderboard</div>
                            </div>
                            <div className="space-y-4">
                                {leaderboard.map((ward, index) => (
                                    <div key={ward.ward} className="grid grid-cols-[40px,1fr,120px] gap-4 items-center p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                        <div className="w-10 h-10 rounded-full bg-[var(--blue-bg)] flex items-center justify-center text-[var(--blue)] font-black">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-[var(--text-primary)]">{ward.ward}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                {ward.validated_reports} validated reports · {ward.top_badge}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-[var(--text-primary)]">{ward.total_points}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                                {ward.fix_rate_percent}% fix rate
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-6 border-[var(--border)] bg-[var(--bg-surface)]/70">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <Sparkles className="text-[var(--blue)]" size={18} />
                                    <div className="text-sm font-black text-[var(--text-primary)] mt-3">Earn Points</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2">Submit geo-tagged reports, validate fixes, and rate completed worksites.</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <ShieldCheck className="text-[var(--green)]" size={18} />
                                    <div className="text-sm font-black text-[var(--text-primary)] mt-3">Build Trust</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2">High-quality citizen feedback improves repair prioritization and transparency.</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)]">
                                    <MapPinned className="text-[var(--brand)]" size={18} />
                                    <div className="text-sm font-black text-[var(--text-primary)] mt-3">Lift Your Ward</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2">Top wards gain visibility, faster validation, and public recognition.</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 flex-wrap">
                    <Button onClick={() => navigate('/report')}>
                        Report a Road Issue
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/works')}>
                        Explore Public Works
                    </Button>
                </div>
            </div>
        </div>
    );
}
