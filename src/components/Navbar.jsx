import { Link, useLocation } from 'react-router-dom';
import { SolutionIcon, TeamIcon, AdminIcon, ContactsIcon } from './Icons';

const Navbar = ({ isAdmin }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  const navItems = [
    { path: '/solutions',  label: 'Решения',    icon: SolutionIcon },
    { path: '/team',       label: 'Команда',     icon: TeamIcon },
    { path: '/contacts',   label: 'Контакты',    icon: ContactsIcon },
    { path: '/info',       label: 'Информация',  icon: null },
    { path: '/feedback',   label: 'Обратная связь', icon: null },
  ];

  return (
    <nav className="app-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link key={item.path} to={item.path} className={`app-nav-link ${active ? 'is-active' : ''}`}>
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
  );
};

export default Navbar;
