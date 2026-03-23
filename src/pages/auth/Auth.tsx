import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Shield, Lock, Mail, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signIn, signUp } = useAuth() as any;
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const toastId = toast.loading(isLogin ? 'Signing in...' : 'Creating account...');

        try {
            if (isLogin) {
                await signIn(email, password);
                toast.success('Welcome back', { id: toastId });
            } else {
                if (signUp) {
                    await signUp(email, password);
                    toast.success('Account created — check your email', { id: toastId });
                } else {
                    throw new Error('Self-registration disabled. Contact Admin.');
                }
            }

            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('department')
                    .eq('id', currentUser.id)
                    .single();

                if (profile?.department) {
                    navigate('/dept');
                } else {
                    navigate('/dashboard');
                }
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            toast.error(err.message || 'Authentication Failed', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4 py-10 sm:px-6">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-[var(--brand-light)] blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] h-80 w-80 rounded-full bg-[var(--blue-bg)] blur-[120px]" />
            </div>

            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--bg-surface)]/95 shadow-[var(--shadow-xl)] backdrop-blur-xl">
                <div className="border-b border-[var(--border)] px-6 pb-5 pt-8 text-center sm:px-8">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--brand-border)] bg-[var(--brand-light)]">
                        <Shield size={30} className="text-[var(--brand)]" />
                    </div>
                    <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--brand)]">Government Access</div>
                    <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                        RoadTwin <span className="text-[var(--brand)]">India</span>
                    </h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Municipal staff and department portal</p>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="field !mb-0">
                            <label className="field-label">Email address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="email"
                                    placeholder="you@municipality.gov.in"
                                    className="input h-12 pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="field !mb-0">
                            <label className="field-label">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="input h-12 pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="btn btn-primary h-12 w-full justify-center">
                            {isLoading ? (
                                <Activity className="animate-spin" size={20} />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-[var(--border)] pt-5 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand)]"
                        >
                            {isLogin ? 'Need access? Create account' : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--bg-panel)] px-6 py-4 text-center text-[0.74rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] sm:px-8">
                    <AlertCircle size={12} />
                    Authorized personnel only
                </div>
            </div>
        </div>
    );
}
