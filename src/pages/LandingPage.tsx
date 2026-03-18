import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ChevronRight, Check, AlertCircle, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

export function LandingPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

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
        'AI Pothole Detection',
        'Road Health Prediction',
        'Excavation Optimizer',
        'Citizen Complaint Triage',
        'Utility Infrastructure Map',
    ];

    return (
        <div style={{
            minHeight: '100vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            background: '#ffffff',
            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(0,0,0,0.012) 40px, rgba(0,0,0,0.012) 41px)',
        }}>
            {/* Theme Toggle Top Right */}
            <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 50 }}>
                <ThemeToggle />
            </div>

            {/* Left Column: Value Proposition */}
            <div style={{
                flex: '1 1 55%',
                padding: '80px 64px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
            }}>
                {/* Subtle saffron radial glow */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'radial-gradient(ellipse 60% 40% at 20% 40%, rgba(232,101,10,0.04) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
                    {/* Brand mark */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        marginBottom: 32,
                        padding: '6px 14px',
                        background: 'var(--brand-light)',
                        border: '1px solid var(--brand-border)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem', fontWeight: 700,
                        color: 'var(--brand)',
                        letterSpacing: '0.04em',
                    }}>
                        🛣️ RoadTwin India
                    </div>

                    {/* Hero heading */}
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '3.2rem',
                        fontWeight: 600,
                        lineHeight: 1.1,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        marginBottom: 20,
                    }}>
                        India's Road<br />
                        Infrastructure<br />
                        Command Center
                    </h1>

                    <p style={{
                        fontSize: '1.05rem',
                        lineHeight: 1.65,
                        color: 'var(--text-secondary)',
                        maxWidth: 460,
                        marginBottom: 32,
                    }}>
                        AI-powered road health, defect detection, and citizen complaint management for Indian municipalities.
                    </p>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border)', marginBottom: 28, maxWidth: 400 }} />

                    {/* Feature list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
                        {features.map((f, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                fontSize: '0.9rem', color: 'var(--text-secondary)',
                            }}>
                                <Check size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                                {f}
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border)', marginBottom: 28, maxWidth: 400 }} />

                    {/* Public complaint CTA */}
                    <button
                        onClick={() => navigate('/report')}
                        className="btn btn-primary btn-lg"
                        style={{ marginBottom: 16 }}
                    >
                        <AlertCircle size={18} />
                        Report a Road Issue
                    </button>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Public complaint form — no login needed
                    </div>

                    {/* City names */}
                    <div style={{
                        marginTop: 40,
                        fontSize: '0.82rem', color: 'var(--text-muted)',
                        fontWeight: 500,
                    }}>
                        Mumbai · Pune · Indore
                    </div>
                </div>
            </div>

            {/* Right Column: Login Card */}
            <div style={{
                width: 440,
                flexShrink: 0,
                padding: '48px 40px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: 'var(--bg-base)',
            }}>
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '36px 32px',
                    boxShadow: 'var(--shadow-xl)',
                }}>
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.6rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 4,
                    }}>Sign In</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>
                        Municipal Staff Portal
                    </p>

                    <form onSubmit={handleLogin}>
                        <div className="field">
                            <label className="field-label">Email address</label>
                            <input
                                type="email"
                                className="input"
                                placeholder="you@municipality.gov.in"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                style={{ height: 44 }}
                            />
                        </div>

                        <div className="field">
                            <label className="field-label">Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{ height: 44 }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary"
                            style={{ width: '100%', height: 44, justifyContent: 'center', marginTop: 8 }}
                        >
                            {isLoading ? <span className="spinner" /> : (
                                <>
                                    <span>Sign In</span>
                                    <ChevronRight size={18} style={{ transition: 'transform 150ms' }} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        margin: '28px 0', color: 'var(--text-muted)', fontSize: '0.78rem',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        or
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    {/* Track complaint link */}
                    <button
                        onClick={() => navigate('/track/CMP-')}
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        <ClipboardList size={16} />
                        Track your complaint →
                    </button>
                </div>
            </div>
        </div>
    );
}
