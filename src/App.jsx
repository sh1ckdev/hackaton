import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense, useEffect } from 'react';
import authStore from './stores/authStore';
import backendHealthStore from './stores/backendHealthStore';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import BackendDownPage from './components/BackendDownPage';


const Login = lazy(() => import('./pages/Login'));
const AuthVkCallback = lazy(() => import('./pages/AuthVkCallback'));
const Landing = lazy(() => import('./pages/Landing'));
const MySolutions = lazy(() => import('./pages/MySolutions'));
const SubmitSolution = lazy(() => import('./pages/SubmitSolution'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Profile = lazy(() => import('./pages/Profile'));
const Team = lazy(() => import('./pages/Team'));
const Info = lazy(() => import('./pages/Info'));
const NotFound = lazy(() => import('./pages/NotFound'));

const ProtectedRoute = observer(({ children }) => {
  if (authStore.initializing) {
    return (
            <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
              <div className="terminal-loading">
                <div className="terminal-loading-container">
                  <div>
                    <span className="terminal-loading-prompt">sys@hackathon:~$</span>
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
                    <span className="terminal-loading-prompt">sys@hackathon:~$</span>
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
              <Route path="profile" element={<Profile />} />
              <Route path="team" element={<Team />} />
              <Route path="info" element={<Info />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                }
              />
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
