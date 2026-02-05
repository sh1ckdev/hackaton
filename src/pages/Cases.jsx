import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';

const Cases = () => {
  useDocumentTitle('Кейсы');
  
  useEffect(() => {
    casesStore.fetchCases('active');
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-medium text-white mb-8">Кейсы</h1>

      {casesStore.loading ? (
        <div className="text-center py-12">
          <div className="text-white/40">Загрузка...</div>
        </div>
      ) : casesStore.cases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40">Нет доступных кейсов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {casesStore.cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              to={`/cases/${caseItem.id}`}
              className="block border-b border-terminal-gray/20 pb-6 hover:border-terminal-green/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-medium text-white mb-2">
                    {caseItem.title}
                  </h2>
                  <p className="text-sm text-white/60 line-clamp-2 mb-3">
                    {caseItem.description || 'Описание отсутствует'}
                  </p>
                  
                  {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
                    <div className="mb-3">
                      <div className="text-xs text-white/40 mb-2">Откроется через:</div>
                      <CountdownTimer targetDate={caseItem.opens_at} />
                    </div>
                  )}
                  
                  <div className="text-xs text-white/40">
                    {caseItem.current_participants || 0} участников
                    {caseItem.max_participants > 0 && ` / ${caseItem.max_participants} макс.`}
                  </div>
                </div>
                <div className="text-xs text-white/40">
                  {caseItem.difficulty === 'easy' ? 'легко' :
                   caseItem.difficulty === 'medium' ? 'средне' : 'сложно'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {casesStore.error && (
        <div className="mt-4 text-terminal-red text-sm">
          {casesStore.error}
        </div>
      )}
    </div>
  );
};

export default observer(Cases);
