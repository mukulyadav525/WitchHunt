import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useRealtime } from './hooks/useRealtime';
import { useUIStore } from './store/uiStore';
import { PageLayout } from './components/layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/admin/AdminPanel';
import { RoadInventory } from './pages/roads/RoadInventory';
import { RoadHealthPredictions } from './pages/predictions/RoadHealthPredictions';
import { ExcavationOptimizer } from './pages/excavations/ExcavationOptimizer';
import { ComplaintAI } from './pages/complaints/ComplaintAI';
import { RoadSurveyUpload } from './pages/surveys/RoadSurveyUpload';
import { UtilityPortal } from './pages/utility/UtilityPortal';
import { PublicComplaintForm } from './pages/complaints/PublicComplaintForm';
import { PublicTracker } from './pages/public/PublicTracker';
import { RoadPassport } from './pages/roads/RoadPassport';
import { CabDashcamPlaceholder } from './pages/dashcam/CabDashcamPlaceholder';
import { MapPage } from './pages/map/MapPage';
import { DeptDashboard } from './pages/department/DeptDashboard';
import { Auth } from './pages/auth/Auth';
import { Toaster } from 'react-hot-toast';

function AppInner() {
    useRealtime(); // Initialize global city signals
    return <Outlet />;
}

// PRODUCTION COMPONENT: Error Boundary to prevent white screen of death
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) { console.error("Global Production Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--red)', opacity: 0.8 }} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 8 }}>System Error</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 320, marginBottom: 32 }}>A critical error occurred. Please reload the page to continue.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    const { profile, signOut } = useAuth(); // Auth listener initialized here
    const { setTheme } = useUIStore();

    useEffect(() => {
        const saved = localStorage.getItem('roadtwin-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        setTheme(saved as 'dark' | 'light');
    }, [setTheme]);

    return (
        <ErrorBoundary>
            <React.Suspense fallback={
                <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, marginBottom: 16 }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Loading RoadTwin...</div>
                </div>
            }>
                <BrowserRouter>
                    <Toaster position="top-right" />
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/dept" element={<DeptDashboard />} />
                        <Route path="/report" element={<PublicComplaintForm />} />
                        <Route path="/track/:ticket" element={<PublicTracker />} />

                        {/* Protected Group */}
                        <Route element={<ProtectedRoute><AppInner /></ProtectedRoute>}>
                            <Route element={<PageLayout profile={profile} onLogout={signOut}><Outlet /></PageLayout>}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/roads/:id" element={<RoadPassport />} />
                                <Route path="/roads" element={<RoadInventory />} />
                                <Route path="/predictions/*" element={<RoadHealthPredictions />} />
                                <Route path="/excavations/*" element={<ExcavationOptimizer />} />
                                <Route path="/complaints/*" element={<ComplaintAI />} />
                                <Route path="/surveys/*" element={<RoadSurveyUpload />} />
                                <Route path="/utility/*" element={<UtilityPortal />} />
                                <Route path="/dashcam/*" element={<CabDashcamPlaceholder />} />
                                <Route path="/map/*" element={<MapPage />} />

                                {/* Admin Routes */}
                                <Route path="/admin/*" element={
                                    <ProtectedRoute requireAdmin>
                                        <AdminPanel />
                                    </ProtectedRoute>
                                } />
                            </Route>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </React.Suspense>
        </ErrorBoundary>
    );
}
