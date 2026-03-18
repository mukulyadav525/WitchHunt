import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AIConfigEditor } from './AIConfigEditor';
import { Card, Badge } from '../../components/ui';
import { Cpu, Users, BarChart3, Database, ShieldAlert, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AdminPanel() {
    const adminLinks = [
        { title: 'Neural Config', path: 'ai-config', icon: Cpu, desc: 'Prompt engineering & model params' },
        { title: 'User Access', path: 'users', icon: Users, desc: 'Profiles, roles & permissions' },
        { title: 'Health Logs', path: 'logs', icon: Database, desc: 'AI usage & system latency' },
        { title: 'Fleet Control', path: 'fleet', icon: ShieldAlert, desc: 'Partner telemetric access' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            {/* Admin Header Sub-nav */}
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-8 flex items-center h-16 gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[var(--brand)] flex items-center justify-center">
                            <ShieldAlert className="text-[var(--text-primary)]" size={14} />
                        </div>
                        <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.3em]">Supreme Command</div>
                    </div>

                    <nav className="flex items-center gap-2 ml-auto">
                        {adminLinks.map(link => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) => cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    isActive ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                )}
                            >
                                {link.title}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-8">
                <Routes>
                    <Route path="/" element={<Navigate to="ai-config" replace />} />
                    <Route path="ai-config" element={<AIConfigEditor />} />
                    <Route path="users" element={<div className="p-8 text-center text-[var(--text-disabled)] italic">User Management coming soon...</div>} />
                    <Route path="logs" element={<div className="p-8 text-center text-[var(--text-disabled)] italic">System Logs coming soon...</div>} />
                    <Route path="fleet" element={<div className="p-8 text-center text-[var(--text-disabled)] italic">Fleet Control coming soon...</div>} />
                </Routes>
            </div>
        </div>
    );
}
