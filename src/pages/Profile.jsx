import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import authStore from '../stores/authStore';

const Profile = () => {
  const user = authStore.user;

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2 font-mono">
          <span className="text-terminal-green">&gt;</span> Профиль
        </h1>
        <p className="text-white/60 font-mono">Информация о вашем аккаунте</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6 border border-terminal-gray/30">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-terminal-dark border-2 border-terminal-green">
                {user?.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/50 text-2xl font-mono">
                    {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white font-mono">
                  {user?.first_name || 'Пользователь'} {user?.last_name || ''}
                </h2>
                <p className="text-white/70 font-mono">@{user?.username || 'username'}</p>
                {user?.role === 'admin' && (
                  <span className="inline-block mt-2 px-3 py-1 border border-terminal-red text-terminal-red text-xs font-mono rounded">
                    Администратор
                  </span>
                )}
                {user?.role === 'moderator' && (
                  <span className="inline-block mt-2 px-3 py-1 border border-terminal-cyan text-terminal-cyan text-xs font-mono rounded">
                    Модератор
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Telegram ID</div>
                <div className="text-white font-mono">{user?.telegram_id || '—'}</div>
              </div>
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Телефон</div>
                <div className="text-white font-mono">{user?.phone || 'Не указан'}</div>
              </div>
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Имя пользователя</div>
                <div className="text-white font-mono">@{user?.username || '—'}</div>
              </div>
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Дата регистрации</div>
                <div className="text-white font-mono text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="glass rounded-xl p-6 h-fit border border-terminal-gray/30">
          <h2 className="text-lg font-semibold text-white mb-4 font-mono">Навигация</h2>
          <div className="space-y-3">
            <Link
              to="/cases"
              className="block px-4 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all font-mono text-sm"
            >
              Кейсы
            </Link>
            <Link
              to="/solutions"
              className="block px-4 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all font-mono text-sm"
            >
              Мои решения
            </Link>
            <Link
              to="/team"
              className="block px-4 py-2 rounded border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all font-mono text-sm"
            >
              Команда
            </Link>
            <Link
              to="/info"
              className="block px-4 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all font-mono text-sm"
            >
              Информация
            </Link>
            {authStore.isAdmin && (
              <Link
                to="/admin"
                className="block px-4 py-2 rounded border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all font-mono text-sm"
              >
                Админ-панель
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default observer(Profile);
