import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from './stores/authStore';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import MySolutions from './pages/MySolutions';
import SubmitSolution from './pages/SubmitSolution';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Team from './pages/Team';
import Info from './pages/Info';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = observer(({ children }) => {
  if (authStore.initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div className="glass rounded-xl p-6 text-white/70">Загрузка...</div>
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
    </Router>
    </ErrorBoundary>
  );
}

export default App;
