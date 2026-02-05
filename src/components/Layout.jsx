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
      <nav className="border-b border-terminal-gray/20 sticky top-0 z-50 bg-terminal-bg/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link 
                to="/" 
                className="text-lg font-medium text-white hover:text-terminal-green transition-colors"
              >
                &gt; hackathon
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/cases"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  cases
                </Link>
                <Link
                  to="/solutions"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  solutions
                </Link>
                <Link
                  to="/team"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  team
                </Link>
                {authStore.isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                @{authStore.user?.username || 'guest'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                exit
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
