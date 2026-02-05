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
    <div className="px-4 py-6 relative z-10">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-terminal-green/20 blur-xl"></div>
            <CaseIcon size={48} className="relative text-terminal-green" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Кейсы</h1>
            <p className="text-gray-300">Выберите кейс и начните работу над решением</p>
          </div>
        </div>
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
              className="glass-strong glass-hover rounded-2xl p-6 transform hover:scale-[1.03] animate-fade-in-up group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 glass-light rounded-lg group-hover:bg-terminal-green/10 transition-colors">
                    <CaseIcon size={24} className="text-terminal-green" />
                  </div>
                  <h2 className="text-lg font-bold text-white flex-1 group-hover:text-terminal-green transition-colors">
                    {caseItem.title}
                  </h2>
                </div>
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

              {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
                <div className="mb-4 p-5 glass-gradient-cyan rounded-xl border-2 border-terminal-cyan/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-cyan/10 rounded-full blur-2xl"></div>
                  <div className="relative flex items-center gap-3 mb-3">
                    <TimeIcon size={20} className="text-terminal-cyan" />
                    <p className="text-sm text-terminal-cyan font-bold">
                      Кейс откроется через:
                    </p>
                  </div>
                  <CountdownTimer targetDate={caseItem.opens_at} />
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
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
                className="group flex items-center justify-center gap-2 w-full py-3 px-4 glass-gradient-green border border-terminal-green/50 text-terminal-green hover:border-terminal-green font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-terminal-green/40"
              >
                <span>Подробнее</span>
                <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
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
