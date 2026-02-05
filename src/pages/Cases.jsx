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
        <div className="space-y-4">
          {casesStore.cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              to={`/cases/${caseItem.id}`}
              className="block border border-terminal-gray/30 rounded-lg p-6 hover:border-terminal-green/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-white">
                      {caseItem.title}
                    </h2>
                    <span className={`px-2 py-0.5 text-xs rounded border ${
                      caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green' :
                      caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan' :
                      'border-terminal-red text-terminal-red'
                    }`}>
                      {caseItem.difficulty === 'easy' ? 'EASY' :
                       caseItem.difficulty === 'medium' ? 'MEDIUM' : 'HARD'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {caseItem.description || 'Описание отсутствует'}
                  </p>
                </div>
              </div>

              {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
                <div className="mb-3 p-3 bg-terminal-dark/40 rounded border border-terminal-gray/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TimeIcon size={14} className="text-terminal-cyan" />
                    <p className="text-xs text-terminal-cyan">Откроется через:</p>
                  </div>
                  <CountdownTimer targetDate={caseItem.opens_at} />
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {caseItem.current_participants || 0} участников
                  {caseItem.max_participants > 0 && ` / ${caseItem.max_participants} макс.`}
                </span>
                <span className="text-terminal-green">Подробнее →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {casesStore.error && (
        <div className="mt-4 p-4 border border-terminal-red/50 rounded text-terminal-red text-sm">
          {casesStore.error}
        </div>
      )}
    </div>
  );
};

export default observer(Cases);
