import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const caseItem = casesStore.selectedCase;
  useDocumentTitle(caseItem ? caseItem.title : 'Кейс');

  useEffect(() => {
    casesStore.fetchCase(id);
    solutionsStore.fetchMySolutions();
  }, [id]);

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

      <div className="glass rounded-lg p-8 mb-6 animate-fade-in-up">
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

        {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
          <div className="mb-6 p-4 glass rounded border border-terminal-cyan">
            <p className="text-terminal-cyan font-medium">
              ⏰ Кейс откроется: {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Вы получите уведомление в Telegram, когда кейс будет открыт
            </p>
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
        <div className="glass rounded-lg p-6 mb-6 animate-fade-in-up">
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
            {mySolution.github_url && (
              <p className="text-gray-300">
                <span className="text-gray-500">GitHub:</span>{' '}
                <a
                  href={mySolution.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terminal-cyan hover:text-terminal-green transition-colors"
                >
                  {mySolution.github_url}
                </a>
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
          <div className="flex gap-3">
            <Link
              to={`/solutions/submit/${caseItem.id}`}
              className="inline-block px-4 py-2 bg-terminal-dark border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all duration-300 rounded font-medium transform hover:scale-105 shadow-md hover:shadow-terminal-green/30"
            >
              Редактировать решение →
            </Link>
            <button
              onClick={async () => {
                if (!confirm('Вы уверены, что хотите сняться с соревнования? Ваше решение будет удалено.')) {
                  return;
                }
                setDeleting(true);
                try {
                  await api.delete(`/solutions/${mySolution.id}`);
                  solutionsStore.fetchMySolutions();
                  casesStore.fetchCase(id);
                  alert('Вы снялись с соревнования');
                } catch (error) {
                  alert(error.response?.data?.error || 'Ошибка при удалении решения');
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="px-4 py-2 bg-terminal-dark border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all duration-300 rounded font-medium transform hover:scale-105 shadow-md hover:shadow-terminal-red/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {deleting ? 'Удаление...' : 'Сняться с соревнования'}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg p-6 text-center">
          {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() ? (
            <>
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                Кейс еще не открыт
              </h2>
              <p className="text-gray-400 mb-4">
                Кейс будет открыт {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                Вы еще не отправили решение
              </h2>
              <Link
                to={`/solutions/submit/${caseItem.id}`}
                className="inline-block px-6 py-3 bg-terminal-dark border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all duration-300 rounded font-medium transform hover:scale-105 shadow-lg hover:shadow-terminal-green/40"
              >
                Отправить решение →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default observer(CaseDetail);
