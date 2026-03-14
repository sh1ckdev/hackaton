import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense, useEffect } from 'react';
import authStore from './stores/authStore';
import backendHealthStore from './stores/backendHealthStore';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import BackendDownPage from './components/BackendDownPage';


const Login = lazy(() => import('./pages/Login'));
const AuthVkCallback = lazy(() => import('./pages/AuthVkCallback'));
const Landing = lazy(() => import('./pages/Landing'));
const MySolutions = lazy(() => import('./pages/MySolutions'));
const SubmitSolution = lazy(() => import('./pages/SubmitSolution'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const Team = lazy(() => import('./pages/Team'));
const Info = lazy(() => import('./pages/Info'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SupportPage = lazy(() => import('./pages/SupportPage'));

const AdminSolutions = lazy(() => import('./pages/admin/AdminSolutions'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminTeams = lazy(() => import('./pages/admin/AdminTeams'));
const AdminCases = lazy(() => import('./pages/admin/AdminCases'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));
const AdminBroadcast = lazy(() => import('./pages/admin/AdminBroadcast'));
const AdminBroadcastSettings = lazy(() => import('./pages/admin/AdminBroadcastSettings'));
const AdminHackathon = lazy(() => import('./pages/admin/AdminHackathon'));
const AdminInfo = lazy(() => import('./pages/admin/AdminInfo'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminContacts = lazy(() => import('./pages/admin/AdminContacts'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const Contacts = lazy(() => import('./pages/Contacts'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));

const ProtectedRoute = observer(({ children }) => {
  const location = useLocation();
  if (authStore.initializing) {
    return (
            <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
              <div className="terminal-loading">
                <div className="terminal-loading-container">
                  <div>
                    <span className="terminal-loading-prompt">sys@platform:~$</span>
                    <span className="terminal-loading-command">auth_check</span>
                  </div>
                  <div className="terminal-loading-status">
                    &gt; Проверка учетных данных
                    <span className="terminal-loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                  <div className="terminal-loading-bar"></div>
                </div>
              </div>
            </div>
    );
  }
  if (!authStore.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!authStore.hasRequiredProfileData && location.pathname !== '/profile/setup') {
    return <Navigate to="/profile/setup" replace />;
  }
  return children;
});

const AdminRoute = observer(({ children }) => {
  if (!authStore.isAuthenticated || (!authStore.isAdmin && !authStore.isModerator)) {
    return <Navigate to="/" replace />;
  }
  return children;
});

const BackendHealthGuard = observer(({ children }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/' || location.pathname === '';

  useEffect(() => {
    backendHealthStore.startPolling();
    return () => backendHealthStore.stopPolling();
  }, []);

  if (!backendHealthStore.isHealthy && !isLanding) {
    return <BackendDownPage />;
  }

  return children;
});

function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <BackendHealthGuard>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
              <div className="terminal-loading">
                <div className="terminal-loading-container">
                  <div>
                    <span className="terminal-loading-prompt">sys@platform:~$</span>
                    <span className="terminal-loading-command">load_module</span>
                  </div>
                  <div className="terminal-loading-status">
                    &gt; Инициализация системы
                    <span className="terminal-loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                  <div className="terminal-loading-bar"></div>
                </div>
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/vk/callback" element={<AuthVkCallback />} />
            <Route path="/" element={<Landing />} />
            <Route path="contacts" element={<Layout />}>
              <Route index element={<Contacts />} />
            </Route>
            <Route path="info" element={<Layout />}>
              <Route index element={<Info />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="solutions" element={<MySolutions />} />
              <Route path="solutions/submit/:caseId" element={<SubmitSolution />} />
              <Route path="profile/setup" element={<ProfileSetup />} />
              <Route path="profile" element={<Profile />} />
              <Route path="team" element={<Team />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="feedback" element={<FeedbackPage />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<Navigate to="solutions" replace />} />
                <Route path="solutions" element={<AdminSolutions />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="teams" element={<AdminTeams />} />
                <Route path="cases" element={<AdminCases />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="security" element={<AdminSecurity />} />
                <Route path="broadcast" element={<AdminBroadcast />} />
                <Route path="broadcast-settings" element={<AdminBroadcastSettings />} />
                <Route path="hackathon" element={<AdminHackathon />} />
                <Route path="info" element={<AdminInfo />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="contacts" element={<AdminContacts />} />
                <Route path="feedback" element={<AdminFeedback />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </BackendHealthGuard>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
