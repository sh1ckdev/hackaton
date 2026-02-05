import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import api from '../utils/api';

const Team = () => {
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamNameError, setTeamNameError] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [teamCode, setTeamCode] = useState('');

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
      // Получаем полную информацию о команде с участниками
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
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
      setTeamNameError(true);
      return;
    }
    setTeamNameError(false);
    try {
      await api.post('/teams/create', {
        name: trimmedName
      });
      // Получаем полную информацию о команде с участниками
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      setTeamName('');
      setTeamError(null);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка создания команды');
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-100 mb-2">Команда</h1>
        <p className="text-gray-400">Управляйте своей командой и участниками</p>
      </div>

      {loadingTeam ? (
        <div className="glass rounded-xl p-6">
          <p className="text-white/60">Загрузка...</p>
        </div>
      ) : hasTeam ? (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Информация о команде</h2>
            <div className="space-y-3">
              <div className="glass rounded-lg p-4">
                <div className="text-white/60 text-sm">Код команды</div>
                <div className="text-white text-lg font-mono">{team.code}</div>
                <p className="text-xs text-white/50 mt-2">Поделитесь этим кодом, чтобы пригласить участников</p>
              </div>
              <div className="glass rounded-lg p-4">
                <div className="text-white/60 text-sm">Название</div>
                <div className="text-white">{team.name}</div>
              </div>
              <div className="glass rounded-lg p-4">
                <div className="text-white/60 text-sm">Ваша роль</div>
                <div className="text-white">{team.role === 'captain' ? 'Капитан' : 'Участник'}</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Участники</h2>
              <button
                onClick={async () => {
                  if (!confirm('Вы уверены, что хотите покинуть команду?')) {
                    return;
                  }
                  try {
                    await api.post('/teams/leave');
                    setTeam(null);
                    alert('Вы покинули команду');
                  } catch (error) {
                    alert(error.response?.data?.error || 'Ошибка при выходе из команды');
                  }
                }}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all text-sm font-medium rounded"
              >
                Покинуть команду
              </button>
            </div>
            <div className="space-y-3">
              {team.members?.map((member) => (
                <div key={member.id} className="flex items-center gap-3 glass rounded-lg p-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray flex-shrink-0">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/50 text-lg font-semibold">
                        {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/90 font-medium">
                      {member.first_name || ''} {member.last_name || ''}
                      {(!member.first_name && !member.last_name) && (member.username || 'Участник')}
                    </div>
                    <div className="text-white/60 text-sm">
                      @{member.username || '—'} · {member.role === 'captain' ? 'Капитан' : 'Участник'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Создать или вступить в команду</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Название команды
              </label>
              <input
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setTeamNameError(false);
                }}
                placeholder="Введите название команды"
                className={`w-full px-4 py-2 rounded border bg-terminal-dark/50 text-white focus:outline-none transition-all ${
                  teamNameError
                    ? 'border-terminal-red focus:border-terminal-red'
                    : 'border-terminal-gray focus:border-terminal-green'
                }`}
              />
              {teamNameError && (
                <p className="mt-1 text-sm text-terminal-red">Название команды обязательно</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCreate}
                disabled={!teamName.trim()}
                className="px-6 py-2 rounded border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Создать команду
              </button>
              <button
                onClick={() => setShowJoin((prev) => !prev)}
                className="px-6 py-2 rounded border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all"
              >
                Войти в команду
              </button>
            </div>

            {showJoin && (
              <form onSubmit={handleJoin} className="mt-4 space-y-3">
                <input
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  placeholder="Введите код команды (6 букв)"
                  maxLength={6}
                  className="w-full px-4 py-2 rounded border border-terminal-gray bg-terminal-dark/50 text-white focus:border-terminal-green focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all"
                >
                  Войти
                </button>
              </form>
            )}

            {teamError && (
              <div className="mt-4 glass rounded p-3 border border-terminal-red">
                <p className="text-terminal-red text-sm">{teamError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(Team);
