import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProfileIcon, SolutionIcon, TeamIcon, AdminIcon, ContactsIcon, InfoIcon } from './Icons';
import Logo from './Logo';

const AppHeader = ({ isAuthenticated, user, isAdmin, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);

  const isActive = (path) => location.pathname.startsWith(path);

  // Закрываем меню при смене маршрута
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Закрываем при клике снаружи
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Пункты доступные всем (без авторизации)
  const publicNavItems = [
    { path: '/contacts', label: 'Контакты',   icon: ContactsIcon },
    { path: '/info',     label: 'Информация', icon: InfoIcon },
  ];

  // Пункты только для авторизованных
  const authNavItems = [
    { path: '/solutions', label: 'Решения', icon: SolutionIcon },
    { path: '/team',      label: 'Команда', icon: TeamIcon },
  ];

  const visibleNavItems = isAuthenticated
    ? [...authNavItems, ...publicNavItems]
    : publicNavItems;

  return (
    <header className="app-topbar" ref={menuRef}>
      <div className="app-topbar-inner">
        <Logo showVersion={true} asLink={true} />

        {/* Десктоп навигация */}
        <nav className="app-nav app-nav-desktop">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={`app-nav-link ${isActive(item.path) ? 'is-active' : ''}`}>
                {Icon && <Icon size={18} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" className={`app-nav-link ${isActive('/admin') ? 'is-active is-admin' : 'is-admin'}`}>
              <AdminIcon size={18} />
              <span>Админ</span>
            </Link>
          )}
        </nav>

        <div className="app-actions app-actions-desktop">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="app-user">
                <ProfileIcon size={18} />
                <span>@{user?.username || 'guest'}</span>
              </Link>
              <button onClick={onLogout} className="app-logout">Выход</button>
            </>
          ) : (
            <Link to="/login" className="app-login">[ Вход ]</Link>
          )}
        </div>

        {/* Бургер (мобиль) */}
        <button
          className={`app-burger${menuOpen ? ' app-burger-open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Меню"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Мобильное меню */}
      {menuOpen && (
        <div className="app-mobile-menu">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={`app-mobile-link ${isActive(item.path) ? 'is-active' : ''}`}>
                {Icon && <Icon size={18} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" className={`app-mobile-link ${isActive('/admin') ? 'is-active is-admin' : 'is-admin'}`}>
              <AdminIcon size={18} />
              <span>Админ</span>
            </Link>
          )}
          <div className="app-mobile-divider" />
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="app-mobile-link">
                <ProfileIcon size={18} />
                <span>@{user?.username || 'guest'}</span>
              </Link>
              <button onClick={() => { onLogout(); setMenuOpen(false); }} className="app-mobile-logout">
                Выход
              </button>
            </>
          ) : (
            <Link to="/login" className="app-mobile-link">[ Вход ]</Link>
          )}
        </div>
      )}
    </header>
  );
};

export default AppHeader;
