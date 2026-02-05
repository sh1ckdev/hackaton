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
              <Link to="/" className="flex items-center px-2 py-2 text-lg font-semibold text-white/90 hover:text-white transition-colors">
                <span className="text-terminal-green mr-2">&gt;</span> hackathon
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/cases"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green"
                >
                  cases
                </Link>
                <Link
                  to="/solutions"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green"
                >
                  solutions
                </Link>
                <Link
                  to="/team"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green"
                >
                  team
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-green"
                >
                  profile
                </Link>
                {authStore.isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white/70 hover:text-white transition-colors border-b-2 border-transparent hover:border-terminal-red"
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
