import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import AppHeader from './AppHeader';
import SupportChat from './SupportChat';
import { useHeartbeat } from '../hooks/useHeartbeat';

const MOBILE_BREAKPOINT = 768;

const Layout = () => {
  useHeartbeat();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSupport, setShowSupport] = useState(false);

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  const handleSupportClick = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      // На мобиле — переходим на отдельную страницу
      navigate('/support');
    } else {
      setShowSupport(prev => !prev);
    }
  };

  // Не показываем FAB на самой странице /support
  const isSupportPage = location.pathname === '/support';

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

      {/* FAB поддержки — только для авторизованных, не на странице /support */}
      {authStore.isAuthenticated && !isSupportPage && (
        <>
          <button
            className={`support-fab${showSupport ? ' support-fab-active support-fab-hidden' : ''}`}
            onClick={handleSupportClick}
            aria-label="Поддержка"
            title="Поддержка"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            <span className="support-fab-label">Поддержка</span>
          </button>

          {/* Десктоп попап */}
          {showSupport && <SupportChat onClose={() => setShowSupport(false)} />}
        </>
      )}
    </div>
  );
};

export default observer(Layout);
