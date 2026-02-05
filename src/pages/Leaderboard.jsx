import { useEffect, useState } from 'react';
import api from '../utils/api';

const Leaderboard = () => {
  const [data, setData] = useState({ teams: [], users: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/leaderboard');
        setData(response.data);
      } catch (error) {
        console.error('Ошибка загрузки лидерборда:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="glass rounded-xl p-6 text-white/70">Загрузка рейтингов...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-semibold text-white">Лидерборд</h1>
        <p className="text-sm text-white/60">
          Сумма баллов по одобренным решениям. Обновляется автоматически.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-terminal-green mb-4">Топ команд</h2>
          {data.teams.length === 0 ? (
            <p className="text-sm text-white/60">Команд с оценёнными решениями пока нет.</p>
          ) : (
            <div className="space-y-2">
              {data.teams.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between px-3 py-2 rounded border border-terminal-gray/60 hover:border-terminal-green transition-all bg-terminal-dark/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs font-mono text-terminal-green">#{index + 1}</span>
                    <div>
                      <div className="text-sm text-white">{team.name}</div>
                      <div className="text-xs text-white/50">
                        Код: {team.team_code} · Участников: {team.members_count}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-terminal-cyan">
                    {team.total_score} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-terminal-cyan mb-4">Топ участников</h2>
          {data.users.length === 0 ? (
            <p className="text-sm text-white/60">Участников с оценёнными решениями пока нет.</p>
          ) : (
            <div className="space-y-2">
              {data.users.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 rounded border border-terminal-gray/60 hover:border-terminal-cyan transition-all bg-terminal-dark/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs font-mono text-terminal-cyan">#{index + 1}</span>
                    <div>
                      <div className="text-sm text-white">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : user.username || 'Участник'}
                      </div>
                      <div className="text-xs text-white/50">
                        @{user.username || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-terminal-green">
                    {user.total_score} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

