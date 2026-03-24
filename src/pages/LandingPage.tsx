import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ChevronRight, Check, AlertCircle, ClipboardList, BellRing, Trophy, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBrandingDefaultsData } from '../lib/supabaseData';

export function LandingPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [supportedCities, setSupportedCities] = useState<string[]>([]);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        void (async () => {
            try {
                const brandingDefaults = await getBrandingDefaultsData();
                setSupportedCities(brandingDefaults.supported_cities || []);
            } catch (error: any) {
                toast.error(error.message || 'Unable to load branding defaults from Supabase.');
            }
        })();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const toastId = toast.loading('Signing in...');

        try {
            await signIn(email, password);
            toast.success('Welcome back', { id: toastId });
            navigate('/dashboard');
        } catch (err: any) {
            toast.error(err.message || 'Login Failed', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        'AI pothole detection and ward-level triage',
        'Road health prediction and intervention planning',
        'Excavation coordination with public transparency',
        'Citizen complaint routing with multilingual intelligence',
        'Digital twin, permits, and utility corridor visibility',
        'Commissioner ward performance and budget-at-risk command view',
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-[var(--bg-base)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-8%] top-[-6%] h-[26rem] w-[26rem] rounded-full bg-[var(--brand-light)] blur-[100px]" />
                <div className="absolute bottom-[-12%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-[var(--blue-bg)] blur-[120px]" />
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)] opacity-80" />
            </div>

            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,440px)]">
                <section className="flex min-w-0 flex-col justify-center px-5 pb-12 pt-24 sm:px-8 lg:px-14 lg:py-16">
                    <div className="max-w-3xl">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-light)] px-4 py-2 text-[0.74rem] font-black uppercase tracking-[0.18em] text-[var(--brand)]">
                            <ShieldCheck size={14} />
                            India Urban Works Mission
                        </div>

                        <h1 className="max-w-4xl text-[clamp(2.6rem,7vw,5.5rem)] font-black uppercase leading-[0.92] tracking-[-0.05em] text-[var(--text-primary)]">
                            Built for Indian cities,
                            <span className="block text-[var(--blue)]">designed for modern civic trust.</span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                            A government-inspired road intelligence platform with transparent public works, modern command tooling,
                            and responsive field-ready screens for every device size.
                        </p>

                        <div className="mt-8 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-surface)]/90 p-5 shadow-[var(--shadow-sm)]">
                                <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Civic Reach</div>
                                <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">24x7</div>
                                <div className="mt-2 text-sm text-[var(--text-secondary)]">Citizen reporting, permit tracking, and service transparency.</div>
                            </div>
                            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-surface)]/90 p-5 shadow-[var(--shadow-sm)]">
                                <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Design System</div>
                                <div className="mt-2 text-3xl font-black text-[var(--brand)]">Light + Dark</div>
                                <div className="mt-2 text-sm text-[var(--text-secondary)]">Indian govtech palette with modern mobile-first responsiveness.</div>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-3">
                            {features.map((feature) => (
                                <div key={feature} className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 px-4 py-3">
                                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
                                        <Check size={14} />
                                    </span>
                                    <span className="text-sm leading-6 text-[var(--text-secondary)]">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <button onClick={() => navigate('/report')} className="btn btn-primary btn-lg">
                                <AlertCircle size={18} />
                                Report a Road Issue
                            </button>
                            <button onClick={() => navigate('/works')} className="btn btn-secondary btn-lg">
                                <BellRing size={18} />
                                View Public Works
                            </button>
                            <button onClick={() => navigate('/engage')} className="btn btn-ghost btn-lg">
                                <Trophy size={18} />
                                Civic Leaderboard
                            </button>
                        </div>

                        {supportedCities.length > 0 && (
                            <div className="mt-10 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                {supportedCities.map((city, index) => (
                                    <React.Fragment key={city}>
                                        {index > 0 && <span className="h-1 w-1 rounded-full bg-[var(--brand)]" />}
                                        <span>{city}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="flex min-w-0 items-center px-5 pb-10 pt-4 sm:px-8 lg:px-10 lg:py-16">
                    <div className="w-full rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)]/95 p-6 shadow-[var(--shadow-xl)] backdrop-blur-xl sm:p-8">
                        <div className="mb-6">
                            <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--brand)]">Municipal Staff Access</div>
                            <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">Secure sign-in</h2>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                Built for city operations teams, engineers, utility agencies, and command dashboards.
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="field !mb-0">
                                <label className="field-label">Government Email</label>
                                <input
                                    type="email"
                                    className="input h-12"
                                    placeholder="you@municipality.gov.in"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field !mb-0">
                                <label className="field-label">Password</label>
                                <input
                                    type="password"
                                    className="input h-12"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" disabled={isLoading} className="btn btn-primary h-12 w-full justify-center">
                                {isLoading ? (
                                    <span className="spinner" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            <div className="h-px flex-1 bg-[var(--border)]" />
                            or
                            <div className="h-px flex-1 bg-[var(--border)]" />
                        </div>

                        <button onClick={() => navigate('/track/CMP-')} className="btn btn-ghost w-full justify-center">
                            <ClipboardList size={16} />
                            Track your complaint
                        </button>

                        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4">
                            <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--blue)]">Public Confidence Layer</div>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                Public works, alerts, civic reporting, and audit trails are now driven from the live Supabase operations graph.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
