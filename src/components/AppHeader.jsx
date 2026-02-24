import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CaseIcon, SolutionIcon, TeamIcon, ProfileIcon, AdminIcon } from './Icons';
import Logo from './Logo';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const AppHeader = ({ isAuthenticated, user, isAdmin, onLogout }) => {
  const location = useLocation();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const isActive = (path) => location.pathname.startsWith(path);

  const navItems = [
    { path: '/cases', label: t('nav.cases'), icon: CaseIcon },
    { path: '/solutions', label: t('nav.solutions'), icon: SolutionIcon },
    { path: '/team', label: t('nav.team'), icon: TeamIcon },
    { path: '/info', label: t('nav.info'), icon: null },
  ];

  return (
    <header className="app-topbar">
      <Logo showVersion={true} asLink={true} />

      <nav className="app-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path} className={`app-nav-link ${active ? 'is-active' : ''}`}>
              {Icon && <Icon size={16} />}
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" className={`app-nav-link ${isActive('/admin') ? 'is-active is-admin' : 'is-admin'}`}>
            <AdminIcon size={16} />
            <span>Админ</span>
          </Link>
        )}
      </nav>

      <div className="app-actions">
        <button
          type="button"
          className="app-lang-toggle"
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        >
          {lang === 'ru' ? 'RU' : 'EN'}
        </button>
        {isAuthenticated ? (
          <>
            <Link to="/profile" className="app-user">
              <ProfileIcon size={16} />
              <span>@{user?.username || 'guest'}</span>
            </Link>
            <button onClick={onLogout} className="app-logout">Выход</button>
          </>
        ) : (
          <Link to="/login" className="app-login">{t('nav.login')}</Link>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
