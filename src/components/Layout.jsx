import { Outlet, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import AppHeader from './AppHeader';
import { useHeartbeat } from '../hooks/useHeartbeat';

const Layout = () => {
  useHeartbeat();
  const navigate = useNavigate();
  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <AppHeader
        isAuthenticated={authStore.isAuthenticated}
        user={authStore.user}
        isAdmin={authStore.isAdmin}
        onLogout={handleLogout}
      />

      <main className="app-content">
        <div className="app-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default observer(Layout);
