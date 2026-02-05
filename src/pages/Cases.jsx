import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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
        <h1 className="text-3xl font-semibold text-gray-100 mb-2">Доступные кейсы</h1>
        <p className="text-gray-400">Выберите кейс и начните работу над решением</p>
      </div>

      {casesStore.loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-terminal-green">
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-1"></div>
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-2"></div>
            <span className="ml-2 text-gray-400">Загрузка...</span>
          </div>
        </div>
      ) : casesStore.cases.length === 0 ? (
        <div className="text-center py-12 glass rounded-lg">
          <p className="text-gray-400">Нет доступных кейсов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {casesStore.cases.map((caseItem, index) => (
            <div
              key={caseItem.id}
              className="glass rounded-lg hover:border-terminal-green transition-all duration-300 p-6 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-terminal-green/20 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100 flex-1">
                  {caseItem.title}
                </h2>
                {getDifficultyBadge(caseItem.difficulty)}
              </div>
              
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                {caseItem.description}
              </p>

              {caseItem.requirements && (
                <div className="mb-4 border-l-2 border-terminal-gray pl-3">
                  <p className="text-xs font-medium text-gray-300 mb-1">
                    Требования:
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {caseItem.requirements}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 border-t border-terminal-gray pt-3">
                <span className="text-sm text-gray-400">
                  {caseItem.current_participants} участников
                  {caseItem.max_participants > 0 && (
                    <span className="text-gray-500"> / {caseItem.max_participants} макс.</span>
                  )}
                </span>
              </div>

              <Link
                to={`/cases/${caseItem.id}`}
                className="block w-full text-center py-2.5 px-4 bg-terminal-dark border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all duration-300 rounded font-medium transform hover:scale-105 shadow-md hover:shadow-terminal-green/30"
              >
                Подробнее →
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
