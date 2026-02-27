import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import adminStore from '../stores/adminStore';

const NAV = [
  {
    group: 'Модерация',
    items: [
      { to: '/admin/solutions', label: 'Решения', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>, badge: 'pending' },
      { to: '/admin/users',     label: 'Пользователи', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
      { to: '/admin/teams',     label: 'Команды',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/></svg> },
      { to: '/admin/cases',     label: 'Кейсы',        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
    ],
  },
  {
    group: 'Коммуникации',
    items: [
      { to: '/admin/broadcast',          label: 'Рассылка',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
      { to: '/admin/broadcast-settings', label: 'Авто-рассылки', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/></svg> },
    ],
  },
  {
    group: 'Данные',
    items: [
      { to: '/admin/analytics', label: 'Аналитика',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      { to: '/admin/hackathon', label: 'Хакатон',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
      { to: '/admin/info',      label: 'Страница Инфо', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
      { to: '/admin/support',   label: 'Поддержка',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, badge: 'support' },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap(g => g.items);

const AdminLayout = () => {
  const location = useLocation();

  const currentItem = ALL_ITEMS.find(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));

  useEffect(() => {
    adminStore.fetchStats();
    adminStore.fetchSupportUnread();
    const interval = setInterval(() => {
      adminStore.fetchStats();
      adminStore.fetchSupportUnread();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="admin-page">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-title">Hackathon</div>
          <div className="admin-sidebar-logo-sub">Панель управления</div>
        </div>

        {adminStore.stats && (
          <div className="admin-sidebar-stats">
            <div className="admin-sidebar-stat">
              <div className="admin-sidebar-stat-value">{adminStore.stats.users}</div>
              <div className="admin-sidebar-stat-label">Участников</div>
            </div>
            <div className="admin-sidebar-stat">
              <div className="admin-sidebar-stat-value">{adminStore.stats.solutions}</div>
              <div className="admin-sidebar-stat-label">Решений</div>
            </div>
            <div className="admin-sidebar-stat">
              <div className="admin-sidebar-stat-value">{adminStore.stats.cases}</div>
              <div className="admin-sidebar-stat-label">Кейсов</div>
            </div>
            <div className="admin-sidebar-stat">
              <div className="admin-sidebar-stat-value" style={{ color: adminStore.pendingCount > 0 ? '#f59e0b' : '#60a5fa' }}>
                {adminStore.pendingCount}
              </div>
              <div className="admin-sidebar-stat-label">На проверке</div>
            </div>
          </div>
        )}

        {NAV.map(({ group, items }) => (
          <div key={group} className="admin-sidebar-section">
            <div className="admin-sidebar-section-title">{group}</div>
            {items.map(({ to, label, icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
              >
                <span className="admin-nav-item-icon">{icon}</span>
                {label}
                {badge === 'pending' && adminStore.pendingCount > 0 && (
                  <span className="admin-nav-badge">{adminStore.pendingCount}</span>
                )}
                {badge === 'support' && adminStore.supportUnread > 0 && (
                  <span className="admin-nav-badge">{adminStore.supportUnread}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>

      {/* ── Main ── */}
      <div className="admin-main">
        {currentItem && (
          <div className="admin-topbar">
            <div className="admin-topbar-title">{currentItem.label}</div>
          </div>
        )}
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default observer(AdminLayout);
