import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useRealtime } from './hooks/useRealtime';
import { useUIStore } from './store/uiStore';
import { PageLayout } from './components/layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

const LandingPage = React.lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then((module) => ({ default: module.AdminPanel })));
const RoadInventory = React.lazy(() => import('./pages/roads/RoadInventory').then((module) => ({ default: module.RoadInventory })));
const RoadHealthPredictions = React.lazy(() => import('./pages/predictions/RoadHealthPredictions').then((module) => ({ default: module.RoadHealthPredictions })));
const ExcavationOptimizer = React.lazy(() => import('./pages/excavations/ExcavationOptimizer').then((module) => ({ default: module.ExcavationOptimizer })));
const ComplaintAI = React.lazy(() => import('./pages/complaints/ComplaintAI').then((module) => ({ default: module.ComplaintAI })));
const RoadSurveyUpload = React.lazy(() => import('./pages/surveys/RoadSurveyUpload').then((module) => ({ default: module.RoadSurveyUpload })));
const UtilityPortal = React.lazy(() => import('./pages/utility/UtilityPortal').then((module) => ({ default: module.UtilityPortal })));
const PublicComplaintForm = React.lazy(() => import('./pages/complaints/PublicComplaintForm').then((module) => ({ default: module.PublicComplaintForm })));
const PublicTracker = React.lazy(() => import('./pages/public/PublicTracker').then((module) => ({ default: module.PublicTracker })));
const PublicWorksPortal = React.lazy(() => import('./pages/public/PublicWorksPortal').then((module) => ({ default: module.PublicWorksPortal })));
const CivicEngagement = React.lazy(() => import('./pages/public/CivicEngagement').then((module) => ({ default: module.CivicEngagement })));
const RoadPassport = React.lazy(() => import('./pages/roads/RoadPassport').then((module) => ({ default: module.RoadPassport })));
const CabDashcamPlaceholder = React.lazy(() => import('./pages/dashcam/CabDashcamPlaceholder').then((module) => ({ default: module.CabDashcamPlaceholder })));
const MapPage = React.lazy(() => import('./pages/map/MapPage').then((module) => ({ default: module.MapPage })));
const DeptDashboard = React.lazy(() => import('./pages/department/DeptDashboard').then((module) => ({ default: module.DeptDashboard })));
const Auth = React.lazy(() => import('./pages/auth/Auth').then((module) => ({ default: module.Auth })));
const NotificationCenter = React.lazy(() => import('./pages/notifications/NotificationCenter').then((module) => ({ default: module.NotificationCenter })));
const DigitalTwinRoadView = React.lazy(() => import('./pages/twin/DigitalTwinRoadView').then((module) => ({ default: module.DigitalTwinRoadView })));
const PermitApprovalCenter = React.lazy(() => import('./pages/approvals/PermitApprovalCenter').then((module) => ({ default: module.PermitApprovalCenter })));
const AuditComplianceCenter = React.lazy(() => import('./pages/audit/AuditComplianceCenter').then((module) => ({ default: module.AuditComplianceCenter })));
const ExecutiveCommandCenter = React.lazy(() => import('./pages/executive/ExecutiveCommandCenter').then((module) => ({ default: module.ExecutiveCommandCenter })));
const EmergencyCommandCenter = React.lazy(() => import('./pages/emergency/EmergencyCommandCenter').then((module) => ({ default: module.EmergencyCommandCenter })));
const ContractorPerformanceHub = React.lazy(() => import('./pages/contractors/ContractorPerformanceHub').then((module) => ({ default: module.ContractorPerformanceHub })));
const FieldOperationsConsole = React.lazy(() => import('./pages/field/FieldOperationsConsole').then((module) => ({ default: module.FieldOperationsConsole })));
const WorkOrderControlCenter = React.lazy(() => import('./pages/workorders/WorkOrderControlCenter').then((module) => ({ default: module.WorkOrderControlCenter })));
const ClosureProofCenter = React.lazy(() => import('./pages/closure/ClosureProofCenter').then((module) => ({ default: module.ClosureProofCenter })));
const SignalFusionCenter = React.lazy(() => import('./pages/signals/SignalFusionCenter').then((module) => ({ default: module.SignalFusionCenter })));
const TrafficDelayCommandCenter = React.lazy(() => import('./pages/traffic/TrafficDelayCommandCenter').then((module) => ({ default: module.TrafficDelayCommandCenter })));
const PreDigClearanceCenter = React.lazy(() => import('./pages/clearance/PreDigClearanceCenter').then((module) => ({ default: module.PreDigClearanceCenter })));
const FieldARBriefing = React.lazy(() => import('./pages/ar/FieldARBriefing').then((module) => ({ default: module.FieldARBriefing })));

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
                        <Route path="/works" element={<PublicWorksPortal />} />
                        <Route path="/engage" element={<CivicEngagement />} />
                        <Route path="/track/:ticket" element={<PublicTracker />} />

                        {/* Protected Group */}
                        <Route element={<ProtectedRoute><AppInner /></ProtectedRoute>}>
                            <Route element={<PageLayout profile={profile} onLogout={signOut}><Outlet /></PageLayout>}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/executive/*" element={<ExecutiveCommandCenter />} />
                                <Route path="/roads/:id" element={<RoadPassport />} />
                                <Route path="/roads" element={<RoadInventory />} />
                                <Route path="/twin/*" element={<DigitalTwinRoadView />} />
                                <Route path="/predictions/*" element={<RoadHealthPredictions />} />
                                <Route path="/excavations/*" element={<ExcavationOptimizer />} />
                                <Route path="/approvals/*" element={<PermitApprovalCenter />} />
                                <Route path="/clearance/*" element={<PreDigClearanceCenter />} />
                                <Route path="/field-ar/*" element={<FieldARBriefing />} />
                                <Route path="/audit/*" element={<AuditComplianceCenter />} />
                                <Route path="/closure-proof/*" element={<ClosureProofCenter />} />
                                <Route path="/emergency/*" element={<EmergencyCommandCenter />} />
                                <Route path="/traffic/*" element={<TrafficDelayCommandCenter />} />
                                <Route path="/contractors/*" element={<ContractorPerformanceHub />} />
                                <Route path="/work-orders/*" element={<WorkOrderControlCenter />} />
                                <Route path="/signal-fusion/*" element={<SignalFusionCenter />} />
                                <Route path="/complaints/*" element={<ComplaintAI />} />
                                <Route path="/notifications/*" element={<NotificationCenter />} />
                                <Route path="/surveys/*" element={<RoadSurveyUpload />} />
                                <Route path="/utility/*" element={<UtilityPortal />} />
                                <Route path="/field/*" element={<FieldOperationsConsole />} />
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
