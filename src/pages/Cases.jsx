import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';
import { CaseIcon, TimeIcon, ArrowRightIcon } from '../components/Icons';

const Cases = () => {
  useDocumentTitle('Кейсы');
  
  useEffect(() => {
    casesStore.fetchCases('active');
  }, []);

  const getDifficultyBadge = (difficulty) => {
    const styles = {
      easy: 'border-terminal-green text-terminal-green',
      medium: 'border-terminal-cyan text-terminal-cyan',
      hard: 'border-terminal-red text-terminal-red',
    };
    const labels = {
      easy: 'EASY',
      medium: 'MEDIUM',
      hard: 'HARD',
    };
    return (
      <span className={`px-3 py-1 text-xs rounded border ${styles[difficulty] || styles.medium}`}>
        {labels[difficulty] || labels.medium}
      </span>
    );
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Кейсы</h1>
        <p className="text-gray-400">Выберите кейс и начните работу над решением</p>
      </div>

      {casesStore.loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      ) : casesStore.cases.length === 0 ? (
        <div className="text-center py-12 glass rounded-lg">
          <p className="text-gray-400">Нет доступных кейсов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {casesStore.cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="glass rounded-lg p-6 hover:border-terminal-green/50 transition-colors"
            >
              {/* Заголовок с иконкой и бейджем */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <CaseIcon size={24} className="text-terminal-green flex-shrink-0" />
                  <h2 className="text-lg font-bold text-white">
                    {caseItem.title}
                  </h2>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {getDifficultyBadge(caseItem.difficulty)}
                </div>
              </div>
              
              {/* Описание кейса */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-400 mb-1">Описание кейса</p>
                <p className="text-sm text-gray-300 line-clamp-3">
                  {caseItem.description || 'Описание отсутствует'}
                </p>
              </div>

              {/* Требования */}
              {caseItem.requirements && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 mb-1">Требования:</p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {caseItem.requirements}
                  </p>
                </div>
              )}

              {/* Таймер */}
              {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
                <div className="mb-4 p-4 bg-terminal-dark/60 rounded-lg border border-terminal-gray/40">
                  <div className="flex items-center gap-2 mb-3">
                    <TimeIcon size={16} className="text-terminal-cyan flex-shrink-0" />
                    <p className="text-xs text-terminal-cyan font-medium">
                      Кейс откроется через:
                    </p>
                  </div>
                  <div className="mb-2">
                    <CountdownTimer targetDate={caseItem.opens_at} />
                  </div>
                  <p className="text-[10px] text-gray-500 text-center">
                    {new Date(caseItem.opens_at).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {/* Участники */}
              <div className="mb-4 pb-3 border-b border-terminal-gray/40">
                <span className="text-xs text-gray-400">
                  {caseItem.current_participants || 0} участников
                  {caseItem.max_participants > 0 && (
                    <span className="text-gray-500"> / {caseItem.max_participants} макс.</span>
                  )}
                </span>
              </div>

              {/* Кнопка */}
              <Link
                to={`/cases/${caseItem.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-terminal-green to-terminal-green/80 text-terminal-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <span>Подробнее</span>
                <ArrowRightIcon size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {casesStore.error && (
        <div className="mt-4 p-4 glass rounded border border-terminal-red">
          <p className="text-terminal-red text-sm">
            {casesStore.error}
          </p>
        </div>
      )}
    </div>
  );
};

export default observer(Cases);
