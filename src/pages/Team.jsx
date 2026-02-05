import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Team = () => {
  useDocumentTitle('Команда');
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
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Команда</h1>
        <p className="text-gray-400 text-sm">Управляйте своей командой и участниками</p>
      </div>

      {loadingTeam ? (
        <div className="text-center py-20">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      ) : hasTeam ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Информация о команде */}
          <div className="lg:col-span-1">
            <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm sticky top-8">
              <h2 className="text-lg font-semibold text-white mb-6">Информация о команде</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Код команды</label>
                  <div className="p-4 bg-terminal-dark/40 border border-terminal-green/30 rounded-lg">
                    <div className="text-2xl font-bold text-terminal-green font-mono text-center mb-2">
                      {team.code}
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Поделитесь этим кодом, чтобы пригласить участников
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Название</label>
                  <div className="text-white font-medium text-lg">{team.name}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Ваша роль</label>
                  <span className={`inline-block px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                    team.role === 'captain' 
                      ? 'border-terminal-green text-terminal-green bg-terminal-green/10' 
                      : 'border-terminal-cyan text-terminal-cyan bg-terminal-cyan/10'
                  }`}>
                    {team.role === 'captain' ? 'Капитан' : 'Участник'}
                  </span>
                </div>
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
                  className="w-full px-4 py-2.5 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all rounded-lg text-sm font-medium"
                >
                  Покинуть команду
                </button>
              </div>
            </div>
          </div>

          {/* Участники */}
          <div className="lg:col-span-2">
            <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-6">Участники</h2>
              <div className="space-y-3">
                {team.members?.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-4 p-4 border border-terminal-gray/20 rounded-lg bg-terminal-dark/20 hover:border-terminal-green/30 transition-colors"
                  >
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-terminal-dark border-2 border-terminal-gray/30 shrink-0 flex items-center justify-center">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/70 text-xl font-bold bg-gradient-to-br from-terminal-green/20 to-terminal-cyan/20">
                          {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-semibold">
                          {member.first_name || ''} {member.last_name || ''}
                          {(!member.first_name && !member.last_name) && (member.username || 'Участник')}
                        </div>
                        {member.role === 'captain' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded border border-terminal-green text-terminal-green bg-terminal-green/10">
                            Капитан
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm">
                        @{member.username || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="border border-terminal-gray/30 rounded-xl p-8 bg-terminal-dark/30 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-white mb-2">Создать или вступить в команду</h2>
            <p className="text-gray-400 text-sm mb-6">Объединитесь с другими участниками для совместной работы</p>
            
            <div className="space-y-6">
              {/* Создание команды */}
              <div className="border border-terminal-gray/20 rounded-lg p-5 bg-terminal-dark/20">
                <h3 className="text-lg font-medium text-white mb-4">Создать новую команду</h3>
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
                      className={`w-full px-4 py-3 rounded-lg border bg-terminal-dark/40 text-white focus:outline-none transition-all ${
                        teamNameError
                          ? 'border-terminal-red focus:border-terminal-red'
                          : 'border-terminal-gray/30 focus:border-terminal-green'
                      }`}
                    />
                    {teamNameError && (
                      <p className="mt-1 text-sm text-terminal-red">Название команды обязательно</p>
                    )}
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={!teamName.trim()}
                    className="w-full px-4 py-3 rounded-lg border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Создать команду
                  </button>
                </div>
              </div>

              {/* Вступление в команду */}
              <div className="border border-terminal-gray/20 rounded-lg p-5 bg-terminal-dark/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Вступить в существующую команду</h3>
                  <button
                    onClick={() => setShowJoin((prev) => !prev)}
                    className="px-4 py-2 rounded-lg border border-terminal-gray/30 text-white/80 hover:text-white hover:border-terminal-cyan transition-all text-sm"
                  >
                    {showJoin ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                {showJoin && (
                  <form onSubmit={handleJoin} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Код команды
                      </label>
                      <input
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                        placeholder="Введите код команды (6 букв)"
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-lg border border-terminal-gray/30 bg-terminal-dark/40 text-white focus:border-terminal-cyan focus:outline-none uppercase font-mono text-center text-xl tracking-widest"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!teamCode.trim()}
                      className="w-full px-4 py-3 rounded-lg border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Вступить в команду
                    </button>
                  </form>
                )}
              </div>

              {teamError && (
                <div className="p-4 border border-terminal-red/50 rounded-lg text-terminal-red text-sm bg-terminal-red/10">
                  {teamError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(Team);
