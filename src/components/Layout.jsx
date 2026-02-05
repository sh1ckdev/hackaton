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
      <nav className="glass-strong border-b border-terminal-gray/40 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-8">
              <Link 
                to="/" 
                className="flex items-center gap-2 px-4 py-2 text-lg font-bold text-white hover:text-terminal-green transition-all duration-300 group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-terminal-green/20 blur-xl group-hover:bg-terminal-green/40 transition-all rounded-full"></div>
                  <span className="relative text-terminal-green text-xl">&gt;</span>
                </div>
                <span className="relative">hackathon</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link
                  to="/cases"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-terminal-green transition-all duration-300 rounded-lg hover:bg-glass-light group relative"
                >
                  <CaseIcon size={18} className="group-hover:scale-110 transition-transform" />
                  <span>cases</span>
                </Link>
                <Link
                  to="/solutions"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-terminal-cyan transition-all duration-300 rounded-lg hover:bg-glass-light group relative"
                >
                  <SolutionIcon size={18} className="group-hover:scale-110 transition-transform" />
                  <span>solutions</span>
                </Link>
                <Link
                  to="/team"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-terminal-blue transition-all duration-300 rounded-lg hover:bg-glass-light group relative"
                >
                  <TeamIcon size={18} className="group-hover:scale-110 transition-transform" />
                  <span>team</span>
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-terminal-purple transition-all duration-300 rounded-lg hover:bg-glass-light group relative"
                >
                  <ProfileIcon size={18} className="group-hover:scale-110 transition-transform" />
                  <span>profile</span>
                </Link>
                {authStore.isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-terminal-red transition-all duration-300 rounded-lg hover:bg-glass-light group relative"
                  >
                    <AdminIcon size={18} className="group-hover:scale-110 transition-transform" />
                    <span>admin</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="glass-light px-4 py-2 rounded-lg">
                <span className="text-sm text-white/80 font-medium">
                  @{authStore.user?.username || 'guest'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white/70 hover:text-terminal-red transition-all duration-300 rounded-lg hover:bg-glass-light border border-terminal-gray/40 hover:border-terminal-red/50 transform hover:scale-105"
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
