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
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Кейсы</h1>
        <p className="text-gray-400 text-sm">Выберите кейс для участия</p>
      </div>

      {casesStore.loading ? (
        <div className="text-center py-20">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      ) : casesStore.cases.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400">Нет доступных кейсов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {casesStore.cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              to={`/cases/${caseItem.id}`}
              className="group relative border border-terminal-gray/30 rounded-xl p-6 hover:border-terminal-green/50 transition-all hover:shadow-lg hover:shadow-terminal-green/10 bg-terminal-dark/30 backdrop-blur-sm flex flex-col"
            >
              {/* Бейдж сложности в правом верхнем углу */}
              <div className="absolute top-4 right-4">
                {getDifficultyBadge(caseItem.difficulty)}
              </div>

              {/* Иконка кейса */}
              <div className="mb-4">
                <div className="w-12 h-12 rounded-lg bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center group-hover:bg-terminal-green/20 transition-colors">
                  <CaseIcon size={24} className="text-terminal-green" />
                </div>
              </div>

              {/* Заголовок */}
              <h2 className="text-xl font-semibold text-white mb-3 pr-16 group-hover:text-terminal-green transition-colors">
                {caseItem.title}
              </h2>

              {/* Описание */}
              <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">
                {caseItem.description || 'Описание отсутствует'}
              </p>

              {/* Таймер открытия */}
              {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
                <div className="mb-4 p-3 bg-terminal-dark/60 rounded-lg border border-terminal-cyan/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TimeIcon size={14} className="text-terminal-cyan" />
                    <p className="text-xs text-terminal-cyan font-medium">Откроется через:</p>
                  </div>
                  <CountdownTimer targetDate={caseItem.opens_at} />
                </div>
              )}

              {/* Футер с информацией */}
              <div className="pt-4 border-t border-terminal-gray/20 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span className="block">
                    {caseItem.current_participants || 0} участников
                  </span>
                  {caseItem.max_participants > 0 && (
                    <span className="text-gray-600">
                      / {caseItem.max_participants} макс.
                    </span>
                  )}
                </div>
                <ArrowRightIcon size={16} className="text-terminal-green opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {casesStore.error && (
        <div className="mt-4 p-4 border border-terminal-red/50 rounded-lg text-terminal-red text-sm bg-terminal-red/10">
          {casesStore.error}
        </div>
      )}
    </div>
  );
};

export default observer(Cases);
