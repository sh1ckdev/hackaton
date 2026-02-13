import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import authStore from './stores/authStore';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';


const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/Landing'));
const Cases = lazy(() => import('./pages/Cases'));
const CaseDetail = lazy(() => import('./pages/CaseDetail'));
const MySolutions = lazy(() => import('./pages/MySolutions'));
const SubmitSolution = lazy(() => import('./pages/SubmitSolution'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Profile = lazy(() => import('./pages/Profile'));
const Team = lazy(() => import('./pages/Team'));
const Info = lazy(() => import('./pages/Info'));

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
              &gt; Verifying credentials
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

function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
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
                    &gt; Initializing system
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
            <Route path="/" element={<Landing />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:id" element={<CaseDetail />} />
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
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
