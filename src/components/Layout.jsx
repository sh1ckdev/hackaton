import { Outlet, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import AppHeader from './AppHeader';

const Layout = () => {
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
      <footer className="app-footer">
        <span>СТАТУС_СИСТЕМЫ: НОРМА</span>
        <span>© 2023 HACKATHON_OS / ВСЕ ПРАВА ЗАЩИЩЕНЫ</span>
      </footer>
    </div>
  );
};

export default observer(Layout);
