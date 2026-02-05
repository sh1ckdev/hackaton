import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import api from '../utils/api';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get('/teams/leaderboard');
        setLeaderboard(response.data.leaderboard);
      } catch (error) {
        console.error('Ошибка загрузки рейтинга:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getRankColor = (index) => {
    if (index === 0) return 'text-terminal-green';
    if (index === 1) return 'text-terminal-cyan';
    if (index === 2) return 'text-terminal-blue';
    return 'text-white/70';
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2 font-mono">
          <span className="text-terminal-green">&gt;</span> Рейтинг команд
        </h1>
        <p className="text-white/60 font-mono">Топ команд по количеству одобренных решений и баллам</p>
      </div>

      {loading ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-white/60 font-mono">Загрузка рейтинга...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center border border-terminal-gray/30">
          <p className="text-white/60 font-mono">Пока нет команд в рейтинге</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((team, index) => (
            <div
              key={team.id}
              className={`glass rounded-xl p-6 border transition-all hover:border-terminal-green ${
                index < 3 ? 'border-terminal-green/50' : 'border-terminal-gray/30'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                  <div className={`text-3xl font-bold font-mono ${getRankColor(index)}`}>
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white font-mono mb-1">{team.name}</h3>
                    <p className="text-white/60 text-sm font-mono">Код: {team.team_code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 min-w-[300px]">
                  <div className="glass rounded-lg p-3 border border-terminal-gray/20 text-center">
                    <div className="text-terminal-green text-2xl font-mono font-bold mb-1">
                      {team.total_score || 0}
                    </div>
                    <div className="text-white/60 text-xs font-mono">Баллы</div>
                  </div>
                  <div className="glass rounded-lg p-3 border border-terminal-gray/20 text-center">
                    <div className="text-terminal-cyan text-2xl font-mono font-bold mb-1">
                      {team.approved_solutions || 0}
                    </div>
                    <div className="text-white/60 text-xs font-mono">Одобрено</div>
                  </div>
                  <div className="glass rounded-lg p-3 border border-terminal-gray/20 text-center">
                    <div className="text-terminal-blue text-2xl font-mono font-bold mb-1">
                      {team.solutions_count || 0}
                    </div>
                    <div className="text-white/60 text-xs font-mono">Всего</div>
                  </div>
                  <div className="glass rounded-lg p-3 border border-terminal-gray/20 text-center">
                    <div className="text-white text-2xl font-mono font-bold mb-1">
                      {team.members_count || 0}
                    </div>
                    <div className="text-white/60 text-xs font-mono">Участников</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default observer(Leaderboard);
