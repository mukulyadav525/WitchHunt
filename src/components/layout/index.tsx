import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Landmark,
    Map as MapIcon,
    FileText,
    MessageSquare,
    LogOut,
    ShieldCheck,
    TrendingUp,
    Route,
    ClipboardList,
    ClipboardCheck,
    ShieldAlert,
    Building2,
    BellRing,
    Layers3,
    Stamp,
    Siren,
    HardHat,
    Smartphone,
    TrafficCone,
    Radar,
    Menu,
    X,
    type LucideIcon
} from 'lucide-react';
import { Profile } from '../../types';
import { cn } from '../ui';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useUIStore } from '../../store/uiStore';

interface SidebarProps {
    profile: Profile | null;
    onLogout: () => void;
    onNavigate?: () => void;
    onClose?: () => void;
}

export function Sidebar({ profile, onLogout, onNavigate, onClose }: SidebarProps) {
    const overviewLinks = [
        { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { title: 'Executive', path: '/executive', icon: Landmark },
        { title: 'City Map', path: '/map', icon: MapIcon },
    ];

    const roadLinks = [
        { title: 'Road Inventory', path: '/roads', icon: Route },
        { title: 'Digital Twin', path: '/twin', icon: Layers3 },
        { title: 'Road Surveys', path: '/surveys', icon: FileText },
        { title: 'Health Predictions', path: '/predictions', icon: TrendingUp },
    ];

    const opsLinks = [
        { title: 'Excavation Permits', path: '/excavations', icon: ClipboardList },
        { title: 'Work Orders', path: '/work-orders', icon: FileText },
        { title: 'Signal Fusion', path: '/signal-fusion', icon: Radar },
        { title: 'Permit Approvals', path: '/approvals', icon: Stamp },
        { title: 'Audit & Ledger', path: '/audit', icon: ShieldAlert },
        { title: 'Closure Proof', path: '/closure-proof', icon: ClipboardCheck },
        { title: 'Traffic & Delay', path: '/traffic', icon: TrafficCone },
        { title: 'Emergency Ops', path: '/emergency', icon: Siren },
        { title: 'Field Console', path: '/field', icon: Smartphone },
        { title: 'Utility Portal', path: '/utility', icon: Building2 },
        { title: 'Contractors', path: '/contractors', icon: HardHat },
        { title: 'Notifications', path: '/notifications', icon: BellRing },
        { title: 'Complaints', path: '/complaints', icon: MessageSquare },
    ];

    const adminLinks = [
        { title: 'AI Configuration', path: '/admin/ai-config', icon: ShieldCheck },
    ];

    const NavItem = ({ link }: { link: { title: string; path: string; icon: LucideIcon } }) => (
        <NavLink
            to={link.path}
            onClick={onNavigate}
            className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all min-w-0',
                isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
            style={({ isActive }) => isActive ? {
                background: 'linear-gradient(90deg, var(--brand-light), transparent)',
                border: '1px solid var(--brand-border)',
                boxShadow: 'var(--shadow-xs)'
            } : undefined}
        >
            <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)'
                }}
            >
                <link.icon size={16} className="shrink-0" />
            </span>
            <span className="truncate">{link.title}</span>
        </NavLink>
    );

    const SectionLabel = ({ label }: { label: string }) => (
        <div className="px-4 pt-5 pb-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {label}
        </div>
    );

    return (
        <div className="shell-sidebar__inner">
            <div className="border-b border-[var(--border)] px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="shell-brand">
                        <div className="shell-brand__logo">
                            <Route size={20} />
                        </div>
                        <div>
                            <div className="shell-brand__eyebrow">GovTech India</div>
                            <div className="shell-brand__title">RoadTwin Grid</div>
                            <div className="shell-brand__subtitle">Urban works command center</div>
                        </div>
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-icon lg:hidden"
                            onClick={onClose}
                            aria-label="Close navigation"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
                    <div className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[var(--brand)]">National Style Theme</div>
                    <div className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                        Saffron, Ashoka blue, and civic green with a modern municipal dashboard feel.
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
                <SectionLabel label="Overview" />
                <nav className="flex flex-col gap-2">
                    {overviewLinks.map((link) => <NavItem key={link.path} link={link} />)}
                </nav>

                <SectionLabel label="Roads" />
                <nav className="flex flex-col gap-2">
                    {roadLinks.map((link) => <NavItem key={link.path} link={link} />)}
                </nav>

                <SectionLabel label="Operations" />
                <nav className="flex flex-col gap-2">
                    {opsLinks.map((link) => <NavItem key={link.path} link={link} />)}
                </nav>

                {profile?.role === 'admin' && (
                    <>
                        <SectionLabel label="Admin" />
                        <nav className="flex flex-col gap-2">
                            {adminLinks.map((link) => <NavItem key={link.path} link={link} />)}
                        </nav>
                    </>
                )}
            </div>

            <div className="border-t border-[var(--border)] px-4 py-4">
                {profile && (
                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
                        <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white"
                            style={{ background: 'linear-gradient(135deg, var(--brand), var(--blue))' }}
                        >
                            {profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-black text-[var(--text-primary)]">{profile.full_name || 'User'}</div>
                            <div className="truncate text-[0.72rem] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                {profile.role.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <ThemeToggle size="sm" />
                    <button type="button" onClick={onLogout} className="btn btn-secondary btn-sm">
                        <LogOut size={13} />
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}

export function PageLayout({ children, profile, onLogout }: { children: React.ReactNode; profile: Profile | null; onLogout: () => void }) {
    const location = useLocation();
    const { sidebarOpen, setSidebar } = useUIStore();

    useEffect(() => {
        setSidebar(false);
    }, [location.pathname, setSidebar]);

    return (
        <div className="shell-layout">
            <button
                type="button"
                aria-label="Close navigation"
                className={cn('shell-sidebar-backdrop', sidebarOpen && 'open')}
                onClick={() => setSidebar(false)}
            />

            <aside className={cn('shell-sidebar', sidebarOpen && 'open')}>
                <Sidebar
                    profile={profile}
                    onLogout={onLogout}
                    onNavigate={() => setSidebar(false)}
                    onClose={() => setSidebar(false)}
                />
            </aside>

            <div className="shell-main">
                <div className="shell-mobile-bar">
                    <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        onClick={() => setSidebar(true)}
                        aria-label="Open navigation"
                    >
                        <Menu size={16} />
                    </button>

                    <div className="flex flex-1 items-center gap-3 min-w-0">
                        <div className="shell-brand__logo h-10 w-10 rounded-xl">
                            <Route size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--brand)]">GovTech India</div>
                            <div className="truncate text-sm font-black text-[var(--text-primary)]">RoadTwin Grid</div>
                        </div>
                    </div>

                    <ThemeToggle size="sm" />
                </div>

                <main className="shell-main__inner">
                    <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>{children}</div>
                </main>
            </div>
        </div>
    );
}
