import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { CaseIcon, SolutionIcon, TeamIcon, ProfileIcon, AdminIcon } from './Icons';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const navItems = [
    { path: '/cases', label: 'Кейсы', icon: CaseIcon },
    { path: '/solutions', label: 'Решения', icon: SolutionIcon },
    { path: '/team', label: 'Команда', icon: TeamIcon },
    { path: '/info', label: 'Информация', icon: null },
  ];

  return (
    <div className="min-h-screen bg-terminal-bg flex">
      {/* Боковая панель навигации */}
      <aside className="w-64 border-r border-terminal-gray/30 bg-terminal-dark/40 backdrop-blur-sm shrink-0 sticky top-0 h-screen">
        <div className="flex flex-col h-full">
          {/* Логотип */}
          <div className="p-6 border-b border-terminal-gray/30">
            <Link 
              to="/" 
              className="text-xl font-bold text-white hover:text-terminal-green transition-colors inline-block"
            >
              &gt; hackathon
            </Link>
          </div>

          {/* Навигация */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? 'bg-terminal-green/20 border border-terminal-green/50 text-terminal-green'
                      : 'text-white/60 hover:text-white hover:bg-terminal-gray/20 border border-transparent'
                  }`}
                >
                  {Icon && <Icon size={18} />}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            {authStore.isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/admin')
                    ? 'bg-terminal-red/20 border border-terminal-red/50 text-terminal-red'
                    : 'text-terminal-red/70 hover:text-terminal-red hover:bg-terminal-red/10 border border-transparent'
                }`}
              >
                <AdminIcon size={18} />
                <span className="text-sm font-medium">Админ</span>
              </Link>
            )}
          </nav>

          {/* Профиль и выход */}
          <div className="p-4 border-t border-terminal-gray/30 space-y-2">
            <Link
              to="/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive('/profile')
                  ? 'bg-terminal-cyan/20 border border-terminal-cyan/50 text-terminal-cyan'
                  : 'text-terminal-green hover:text-terminal-cyan hover:bg-terminal-cyan/10 border border-transparent'
              }`}
            >
              <ProfileIcon size={18} />
              <span className="text-sm font-medium">@{authStore.user?.username || 'guest'}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/40 hover:text-terminal-red hover:bg-terminal-red/10 border border-transparent transition-all"
            >
              <span className="text-sm">Выход</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default observer(Layout);
