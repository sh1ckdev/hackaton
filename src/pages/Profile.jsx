import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import api from '../utils/api';

const Profile = () => {
  const user = authStore.user;
  const [showJoin, setShowJoin] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamNameTouched, setTeamNameTouched] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      setLoadingTeam(true);
      setTeamError(null);
      try {
        const response = await api.get('/teams/me');
        setTeam(response.data.team);
      } catch (error) {
        setTeamError(error.response?.data?.error || 'Ошибка загрузки команды');
      } finally {
        setLoadingTeam(false);
      }
    };
    fetchTeam();
  }, []);

  const hasTeam = !!team;

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!teamCode.trim()) {
      return;
    }
    try {
      const response = await api.post('/teams/join', { team_code: teamCode.trim().toUpperCase() });
      setTeam(response.data.team);
      setShowJoin(false);
      setTeamCode('');
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка вступления в команду');
    }
  };

  const handleCreate = async () => {
    const trimmed = teamName.trim();
    setTeamNameTouched(true);
    if (!trimmed) {
      return;
    }
    try {
      const response = await api.post('/teams/create', {
        name: trimmed
      });
      setTeam(response.data.team);
      setTeamName('');
      setTeamError(null);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка создания команды');
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray">
                {user?.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/50">
                    {user?.first_name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  {user?.first_name || 'Пользователь'} {user?.last_name || ''}
                </h1>
                <p className="text-white/70">@{user?.username || 'username'}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="glass rounded-lg p-4">
                <div className="text-white/60">Telegram ID</div>
                <div className="text-white">{user?.telegram_id || '—'}</div>
              </div>
              <div className="glass rounded-lg p-4">
                <div className="text-white/60">Телефон</div>
                <div className="text-white">{user?.phone || 'Не указан'}</div>
              </div>
              <div className="glass rounded-lg p-4">
                <div className="text-white/60">Имя пользователя</div>
                <div className="text-white">@{user?.username || '—'}</div>
              </div>
              <div className="glass rounded-lg p-4">
                <div className="text-white/60">Статус</div>
                <div className="text-white">{hasTeam ? 'В команде' : 'Не в команде'}</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Команда</h2>
            {loadingTeam ? (
              <p className="text-white/60">Загрузка...</p>
            ) : hasTeam ? (
              <div className="space-y-3">
                <div className="glass rounded-lg p-4">
                  <div className="text-white/60 text-sm">Код команды</div>
                  <div className="text-white text-lg">{team.code}</div>
                  <div className="text-white/60 text-sm mt-2">Название</div>
                  <div className="text-white">{team.name}</div>
                  <div className="text-white/60 text-sm mt-2">Роль</div>
                  <div className="text-white">{team.role === 'captain' ? 'Капитан' : 'Участник'}</div>
                </div>
                <div className="glass rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-2">Участники</div>
                  <div className="space-y-3">
                    {team.members?.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray">
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt="avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/50 text-sm">
                              {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="text-sm">
                          <div className="text-white/90">
                            {member.first_name || ''} {member.last_name || ''}{' '}
                            {(!member.first_name && !member.last_name) ? (member.username || 'Участник') : ''}
                          </div>
                          <div className="text-white/60">@{member.username || '—'} · {member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <input
                      value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (!teamNameTouched) setTeamNameTouched(true);
                    }}
                    placeholder="Придумайте название команды"
                    className={`w-full px-4 py-2 rounded bg-terminal-dark/50 text-white focus:outline-none ${
                      teamNameTouched && !teamName.trim()
                        ? 'border border-terminal-red focus:border-terminal-red'
                        : 'border border-terminal-gray focus:border-terminal-green'
                    }`}
                    />
                  {teamNameTouched && !teamName.trim() && (
                    <p className="mt-1 text-xs text-terminal-red">
                      Нужно ввести название — это увидят другие участники.
                    </p>
                  )}
                  </div>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 rounded border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all"
                  >
                    Создать команду
                  </button>
                  <button
                    onClick={() => setShowJoin((prev) => !prev)}
                    className="px-4 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all"
                  >
                    Войти в команду
                  </button>
                </div>

                {showJoin && (
                  <form onSubmit={handleJoin} className="mt-4 flex flex-col sm:flex-row gap-3">
                    <input
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      placeholder="Введите код команды (6 букв)"
                      className="flex-1 px-4 py-2 rounded border border-terminal-gray bg-terminal-dark/50 text-white focus:border-terminal-green focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all"
                    >
                      Войти
                    </button>
                  </form>
                )}
                <p className="text-xs text-white/60 mt-3">
                  ID команды можно получить у капитана.
                </p>
              </>
            )}

            {teamError && (
              <div className="mt-4 glass rounded p-3 border border-terminal-red">
                <p className="text-terminal-red text-sm">{teamError}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="glass rounded-xl p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-4">Меню</h2>
          <div className="space-y-3">
            <Link
              to="/cases"
              className="block px-4 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all"
            >
              Выбор кейса
            </Link>
            <Link
              to="/info"
              className="block px-4 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all"
            >
              Информация
            </Link>
            <button
              disabled={!hasTeam}
              className={`w-full text-left px-4 py-2 rounded border ${
                hasTeam
                  ? 'border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all'
                  : 'border-terminal-gray/50 text-white/40 cursor-not-allowed'
              }`}
            >
              Команда
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default observer(Profile);
