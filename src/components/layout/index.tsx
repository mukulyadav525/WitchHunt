import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Map as MapIcon,
    FileText,
    Zap,
    MessageSquare,
    Settings,
    LogOut,
    ShieldCheck,
    TrendingUp,
    Route,
    ClipboardList,
    Building2
} from 'lucide-react';
import { Profile } from '../../types';
import { cn } from '../ui';
import { ThemeToggle } from '../ui/ThemeToggle';

interface SidebarProps {
    profile: Profile | null;
    onLogout: () => void;
}

export function Sidebar({ profile, onLogout }: SidebarProps) {
    const overviewLinks = [
        { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { title: 'City Map', path: '/map', icon: MapIcon },
    ];

    const roadLinks = [
        { title: 'Road Inventory', path: '/roads', icon: Route },
        { title: 'Road Surveys', path: '/surveys', icon: FileText },
        { title: 'Health Predictions', path: '/predictions', icon: TrendingUp },
    ];

    const opsLinks = [
        { title: 'Excavation Permits', path: '/excavations', icon: ClipboardList },
        { title: 'Utility Portal', path: '/utility', icon: Building2 },
        { title: 'Complaints', path: '/complaints', icon: MessageSquare },
    ];

    const adminLinks = [
        { title: 'AI Configuration', path: '/admin/ai-config', icon: ShieldCheck },
    ];

    const NavItem = ({ link }: { link: { title: string; path: string; icon: any } }) => (
        <NavLink
            to={link.path}
            className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all relative",
                isActive
                    ? "text-[var(--brand)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
            style={({ isActive }) => isActive ? {
                background: 'var(--brand-light)',
                borderLeft: '3px solid var(--brand)',
                paddingLeft: '13px',
            } : {}}
        >
            <link.icon size={16} className="shrink-0" />
            <span className="truncate">{link.title}</span>
        </NavLink>
    );

    const SectionLabel = ({ label }: { label: string }) => (
        <div style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--text-muted)',
            padding: '16px 16px 6px',
        }}>{label}</div>
    );

    return (
        <div style={{
            width: 240,
            background: 'var(--bg-base)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            {/* Logo */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32,
                        background: 'var(--brand)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Route size={18} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>RoadTwin</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.06em' }}>India</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
                <SectionLabel label="Overview" />
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {overviewLinks.map(link => <NavItem key={link.path} link={link} />)}
                </nav>

                <SectionLabel label="Roads" />
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {roadLinks.map(link => <NavItem key={link.path} link={link} />)}
                </nav>

                <SectionLabel label="Operations" />
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {opsLinks.map(link => <NavItem key={link.path} link={link} />)}
                </nav>

                {profile?.role === 'admin' && (
                    <>
                        <SectionLabel label="Admin" />
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {adminLinks.map(link => <NavItem key={link.path} link={link} />)}
                        </nav>
                    </>
                )}
            </div>

            {/* User Card & Footer */}
            <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border)' }}>
                {profile && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        background: 'var(--bg-panel)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 10,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                            background: 'var(--brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, color: '#fff', fontSize: '0.85rem', flexShrink: 0
                        }}>
                            {profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1-min-0">
                            <div className="truncate" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.full_name || 'User'}</div>
                            <div className="truncate" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' as const }}>{profile.role.replace('_', ' ')}</div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    <ThemeToggle size="sm" />
                    <button
                        onClick={onLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 11px',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.8rem', fontWeight: 600,
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            fontFamily: 'var(--font-sans)',
                        }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red-border)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        <LogOut size={13} />
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}

export function PageLayout({ children, profile, onLogout }: { children: React.ReactNode; profile: Profile | null; onLogout: () => void }) {
    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
            <Sidebar profile={profile} onLogout={onLogout} />
            <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
            </main>
        </div>
    );
}
