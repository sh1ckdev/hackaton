import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';

const CaseDetail = () => {
  const { id } = useParams();

  useEffect(() => {
    casesStore.fetchCase(id);
    solutionsStore.fetchMySolutions();
  }, [id]);

  const caseItem = casesStore.selectedCase;
  const mySolution = solutionsStore.solutions.find(s => s.case_id === parseInt(id));

  if (casesStore.loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Кейс не найден</p>
        <Link to="/cases" className="text-terminal-green hover:text-terminal-cyan mt-4 inline-block">
          ← Назад к кейсам
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <Link
        to="/cases"
        className="text-terminal-green hover:text-terminal-cyan mb-4 inline-block"
      >
        ← Назад к кейсам
      </Link>

      <div className="glass rounded-lg p-8 mb-6">
        <div className="flex items-start justify-between mb-6 border-b border-terminal-gray pb-4">
          <h1 className="text-3xl font-semibold text-gray-100">
            {caseItem.title}
          </h1>
          <span className={`px-3 py-1 text-xs rounded border ${
            caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green' :
            caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan' :
            'border-terminal-red text-terminal-red'
          }`}>
            {caseItem.difficulty === 'easy' ? 'Легко' :
             caseItem.difficulty === 'medium' ? 'Средне' : 'Сложно'}
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Описание</h2>
          <p className="text-gray-400 whitespace-pre-wrap">{caseItem.description}</p>
        </div>

        {caseItem.requirements && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Требования</h2>
            <p className="text-gray-400 whitespace-pre-wrap">{caseItem.requirements}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-terminal-gray">
          <div className="text-sm text-gray-400">
            Участников: {caseItem.current_participants}
            {caseItem.max_participants > 0 && (
              <span className="text-gray-500"> / {caseItem.max_participants} максимум</span>
            )}
          </div>
        </div>
      </div>

      {mySolution ? (
        <div className="glass rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4 border-b border-terminal-gray pb-2">
            Мое решение
          </h2>
          <div className="space-y-3 mb-4">
            <p className="text-gray-300">
              <span className="text-gray-500">Название:</span> {mySolution.title}
            </p>
            {mySolution.description && (
              <p className="text-gray-300">
                <span className="text-gray-500">Описание:</span> {mySolution.description}
              </p>
            )}
            <p className="text-gray-300">
              <span className="text-gray-500">Статус:</span>{' '}
              <span className={`px-2 py-1 text-xs rounded border ${
                mySolution.status === 'approved' ? 'border-terminal-green text-terminal-green' :
                mySolution.status === 'rejected' ? 'border-terminal-red text-terminal-red' :
                mySolution.status === 'reviewing' ? 'border-terminal-cyan text-terminal-cyan' :
                'border-terminal-gray text-gray-400'
              }`}>
                {mySolution.status === 'approved' ? 'Одобрено' :
                 mySolution.status === 'rejected' ? 'Отклонено' :
                 mySolution.status === 'reviewing' ? 'На проверке' : 'Ожидает'}
              </span>
            </p>
            {mySolution.score > 0 && (
              <p className="text-gray-300">
                <span className="text-gray-500">Оценка:</span> {mySolution.score}
              </p>
            )}
            {mySolution.admin_comment && (
              <div className="border-l-2 border-terminal-gray pl-3 mt-3">
                <span className="text-gray-500 text-sm">Комментарий администратора:</span>
                <p className="text-gray-300 mt-1">{mySolution.admin_comment}</p>
              </div>
            )}
          </div>
          <Link
            to={`/solutions/submit/${caseItem.id}`}
            className="inline-block px-4 py-2 bg-terminal-dark border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all rounded"
          >
            Редактировать решение
          </Link>
        </div>
      ) : (
        <div className="glass rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            Вы еще не отправили решение
          </h2>
          <Link
            to={`/solutions/submit/${caseItem.id}`}
            className="inline-block px-6 py-3 bg-terminal-dark border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all rounded"
          >
            Отправить решение
          </Link>
        </div>
      )}
    </div>
  );
};

export default observer(CaseDetail);
