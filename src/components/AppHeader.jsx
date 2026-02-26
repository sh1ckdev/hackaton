import { Link } from 'react-router-dom';
import { ProfileIcon } from './Icons';
import Logo from './Logo';
import Navbar from './Navbar';

const AppHeader = ({ isAuthenticated, user, isAdmin, onLogout }) => {
  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
      <Logo showVersion={true} asLink={true} />
      <Navbar isAdmin={isAdmin} />
      <div className="app-actions">
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
      </div>
    </header>
  );
};

export default AppHeader;
