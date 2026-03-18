import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input, Badge } from '../../components/ui';
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
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, position: 'relative', overflow: 'hidden',
        }}>
            {/* Subtle background accent */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
                background: 'radial-gradient(ellipse at center, rgba(232,101,10,0.04) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%',
                background: 'radial-gradient(ellipse at center, rgba(232,101,10,0.04) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                width: '100%', maxWidth: 420, position: 'relative', zIndex: 10,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '32px 32px 16px', textAlign: 'center' as const }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 'var(--radius-md)',
                        background: 'var(--brand-light)', border: '1px solid var(--brand-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <Shield size={28} style={{ color: 'var(--brand)' }} />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        RoadTwin <span style={{ color: 'var(--brand)' }}>India</span>
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Municipal Staff Portal</p>
                </div>

                {/* Form */}
                <div style={{ padding: '16px 32px 32px' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="field">
                            <label className="field-label">Email address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    placeholder="you@municipality.gov.in"
                                    className="input"
                                    style={{ paddingLeft: 36, height: 44 }}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="input"
                                    style={{ paddingLeft: 36, height: 44 }}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary"
                            style={{ width: '100%', height: 44, justifyContent: 'center', marginTop: 4 }}
                        >
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

                    {/* Toggle */}
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' as const }}>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            style={{
                                background: 'none', border: 'none',
                                fontSize: '0.82rem', fontWeight: 600,
                                color: 'var(--text-muted)', cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--brand)'}
                            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            {isLogin ? "Need access? Create account" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 32px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-panel)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    <AlertCircle size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Authorized Personnel Only</span>
                </div>
            </div>
        </div>
    );
}
