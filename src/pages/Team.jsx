import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import api from '../utils/api';

const Team = () => {
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [nameError, setNameError] = useState(false);

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
      setTeamError(null);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка вступления в команду');
    }
  };

  const handleCreate = async () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }
    setNameError(false);
    try {
      const response = await api.post('/teams/create', {
        name: trimmedName
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
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2 font-mono">
          <span className="text-terminal-green">&gt;</span> Команда
        </h1>
        <p className="text-white/60 font-mono">Управление командой и участниками</p>
      </div>

      {loadingTeam ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-white/60 font-mono">Загрузка...</p>
        </div>
      ) : hasTeam ? (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 border border-terminal-gray/30">
            <h2 className="text-xl font-semibold text-white mb-4 font-mono">Информация о команде</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Код команды</div>
                <div className="text-white text-2xl font-mono font-bold text-terminal-green">{team.code}</div>
                <div className="text-white/40 text-xs font-mono mt-2">Поделитесь этим кодом для приглашения</div>
              </div>
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Название</div>
                <div className="text-white text-xl font-mono">{team.name}</div>
              </div>
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Ваша роль</div>
                <div className="text-white text-lg font-mono">
                  {team.role === 'captain' ? (
                    <span className="text-terminal-green">Капитан</span>
                  ) : (
                    <span className="text-terminal-cyan">Участник</span>
                  )}
                </div>
              </div>
              <div className="glass rounded-lg p-4 border border-terminal-gray/20">
                <div className="text-white/60 text-sm font-mono mb-1">Участников</div>
                <div className="text-white text-2xl font-mono font-bold">{team.members?.length || 0}</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6 border border-terminal-gray/30">
            <h2 className="text-xl font-semibold text-white mb-4 font-mono">Участники команды</h2>
            <div className="space-y-3">
              {team.members?.map((member) => (
                <div
                  key={member.id}
                  className="glass rounded-lg p-4 border border-terminal-gray/20 flex items-center gap-4 hover:border-terminal-green transition-all"
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray flex-shrink-0">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/50 text-lg font-mono">
                        {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-mono">
                      {member.first_name || ''} {member.last_name || ''}
                      {(!member.first_name && !member.last_name) && (member.username || 'Участник')}
                    </div>
                    <div className="text-white/60 text-sm font-mono">
                      @{member.username || '—'} · {member.role === 'captain' ? 'Капитан' : 'Участник'}
                    </div>
                  </div>
                  {member.role === 'captain' && (
                    <div className="px-3 py-1 border border-terminal-green text-terminal-green text-xs font-mono rounded">
                      Капитан
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 border border-terminal-gray/30">
            <h2 className="text-xl font-semibold text-white mb-4 font-mono">Создать команду</h2>
            <div className="space-y-4">
              <div>
                <input
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    setNameError(false);
                  }}
                  placeholder="Название команды"
                  className={`w-full px-4 py-3 rounded border font-mono bg-terminal-dark/50 text-white focus:outline-none transition-all ${
                    nameError
                      ? 'border-terminal-red focus:border-terminal-red'
                      : 'border-terminal-gray focus:border-terminal-green'
                  }`}
                />
                {nameError && (
                  <p className="text-terminal-red text-xs mt-1 font-mono">Укажите название команды</p>
                )}
              </div>
              <button
                onClick={handleCreate}
                className="w-full px-4 py-3 rounded border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono font-semibold"
              >
                Создать команду
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-6 border border-terminal-gray/30">
            <h2 className="text-xl font-semibold text-white mb-4 font-mono">Войти в команду</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowJoin((prev) => !prev)}
                className="w-full px-4 py-3 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all font-mono"
              >
                {showJoin ? 'Скрыть' : 'Показать форму входа'}
              </button>

              {showJoin && (
                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    placeholder="Введите код команды (6 букв)"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded border border-terminal-gray bg-terminal-dark/50 text-white focus:border-terminal-green focus:outline-none font-mono uppercase"
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-3 rounded border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono font-semibold"
                  >
                    Войти в команду
                  </button>
                </form>
              )}
              <p className="text-xs text-white/60 font-mono">
                Код команды можно получить у капитана
              </p>
            </div>
          </div>
        </div>
      )}

      {teamError && (
        <div className="mt-4 glass rounded-lg p-4 border border-terminal-red">
          <p className="text-terminal-red text-sm font-mono">{teamError}</p>
        </div>
      )}
    </div>
  );
};

export default observer(Team);
