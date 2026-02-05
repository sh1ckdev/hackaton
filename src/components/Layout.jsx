import { Link, Outlet, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-terminal-bg">
      <nav className="glass border-b border-terminal-gray/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/cases" className="flex items-center px-2 py-2 text-lg font-semibold text-white/90 hover:text-white transition-colors font-mono">
                <span className="text-terminal-green mr-2">$</span> hackathon
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/cases"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green font-mono"
                >
                  cases
                </Link>
                <Link
                  to="/solutions"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green font-mono"
                >
                  solutions
                </Link>
                <Link
                  to="/team"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-cyan font-mono"
                >
                  team
                </Link>
                <Link
                  to="/leaderboard"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-blue font-mono"
                >
                  leaderboard
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green font-mono"
                >
                  profile
                </Link>
                {authStore.isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-red font-mono"
                  >
                    admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/70">
                {authStore.user?.username || 'guest'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1 border border-terminal-gray/60 hover:border-terminal-red rounded"
              >
                exit
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default observer(Layout);
