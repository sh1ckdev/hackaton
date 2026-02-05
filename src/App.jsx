import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from './stores/authStore';
import Login from './pages/Login';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import MySolutions from './pages/MySolutions';
import SubmitSolution from './pages/SubmitSolution';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Info from './pages/Info';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Leaderboard from './pages/Leaderboard';

const ProtectedRoute = observer(({ children }) => {
  console.log('[App] ProtectedRoute рендер:', {
    initializing: authStore.initializing,
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    hasUser: !!authStore.user,
    loading: authStore.loading
  });
  
  if (authStore.initializing) {
    console.log('[App] ProtectedRoute: показываю загрузку (initializing=true)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div className="glass rounded-xl p-6 text-white/70">Загрузка...</div>
      </div>
    );
  }
  if (!authStore.isAuthenticated) {
    console.log('[App] ProtectedRoute: редирект на /login (не авторизован)');
    return <Navigate to="/login" replace />;
  }
  console.log('[App] ProtectedRoute: рендер children');
  return children;
});

const AdminRoute = observer(({ children }) => {
  if (!authStore.isAuthenticated || !authStore.isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
});

const LandingRoute = observer(() => {
  if (authStore.initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div className="glass rounded-xl p-6 text-white/70">Загрузка...</div>
      </div>
    );
  }
  if (authStore.isAuthenticated) {
    return <Navigate to="/cases" replace />;
  }
  return <Landing />;
});

function App() {
  console.log('[App] App компонент рендерится');
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Публичная главная - только для неавторизованных */}
        <Route path="/" element={<LandingRoute />} />

        {/* Логин */}
        <Route path="/login" element={<Login />} />

        {/* Рабочее приложение */}
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
          <Route path="info" element={<Info />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
        </Route>

        {/* Редиректы со старых /app путей */}
        <Route path="/app" element={<Navigate to="/cases" replace />} />
        <Route path="/app/*" element={<Navigate to="/cases" replace />} />

        {/* Фоллбек */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
