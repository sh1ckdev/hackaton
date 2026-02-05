import { Link, Outlet, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { CaseIcon, SolutionIcon, TeamIcon, ProfileIcon, AdminIcon } from './Icons';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-terminal-bg">
      <nav className="border-b border-terminal-gray/30 sticky top-0 z-50 bg-terminal-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-16 items-center">
            <Link 
              to="/" 
              className="text-lg font-bold text-white hover:text-terminal-green transition-colors"
            >
              &gt; hackathon
            </Link>
            <div className="flex items-center gap-6">
              <Link
                to="/cases"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Кейсы
              </Link>
              <Link
                to="/solutions"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Решения
              </Link>
              <Link
                to="/team"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Команда
              </Link>
              {authStore.isAdmin && (
                <Link
                  to="/admin"
                  className="text-sm text-terminal-red/70 hover:text-terminal-red transition-colors"
                >
                  Админ
                </Link>
              )}
              <Link
                to="/profile"
                className="text-sm text-terminal-green hover:text-terminal-cyan transition-colors"
              >
                @{authStore.user?.username || 'guest'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-white/40 hover:text-terminal-red transition-colors"
              >
                Выход
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default observer(Layout);
