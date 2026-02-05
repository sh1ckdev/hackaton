import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';
import { CaseIcon, TimeIcon, ArrowLeftIcon, UploadIcon, GitHubIcon, ArrowRightIcon } from '../components/Icons';

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
    <div>
      <Link
        to="/cases"
        className="inline-block text-terminal-green hover:text-terminal-cyan mb-6 transition-colors"
      >
        ← Назад
      </Link>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">
            {caseItem.title}
          </h1>
          <span className={`px-3 py-1 text-xs rounded border ${
            caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green' :
            caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan' :
            'border-terminal-red text-terminal-red'
          }`}>
            {caseItem.difficulty === 'easy' ? 'EASY' :
             caseItem.difficulty === 'medium' ? 'MEDIUM' : 'HARD'}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          {caseItem.current_participants || 0} участников
          {caseItem.max_participants > 0 && ` / ${caseItem.max_participants} максимум`}
        </p>
      </div>

      {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
        <div className="mb-8 p-4 border border-terminal-gray/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <TimeIcon size={16} className="text-terminal-cyan" />
            <p className="text-sm text-terminal-cyan">Кейс откроется через:</p>
          </div>
          <CountdownTimer targetDate={caseItem.opens_at} />
          <p className="text-xs text-gray-500 mt-3 text-center">
            {new Date(caseItem.opens_at).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Описание</h2>
        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{caseItem.description}</p>
      </div>

      {caseItem.requirements && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Требования</h2>
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{caseItem.requirements}</p>
        </div>
      )}

      {mySolution ? (
        <div className="border border-terminal-gray/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Мое решение</h2>
          <div className="space-y-2 mb-4">
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
              <span className={`px-2 py-0.5 text-xs rounded border ${
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
              <div className="mt-3 pt-3 border-t border-terminal-gray/20">
                <p className="text-xs text-gray-500 mb-1">Комментарий администратора:</p>
                <p className="text-gray-300 text-sm">{mySolution.admin_comment}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              to={`/solutions/submit/${caseItem.id}`}
              className="px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-colors rounded text-sm"
            >
              Редактировать
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
              className="px-4 py-2 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-colors rounded text-sm disabled:opacity-50"
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-terminal-gray/30 rounded-lg p-6 text-center">
          {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() ? (
            <p className="text-gray-400">
              Кейс будет открыт {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
            </p>
          ) : (
            <Link
              to={`/solutions/submit/${caseItem.id}`}
              className="inline-block px-6 py-3 bg-terminal-green text-terminal-bg font-semibold rounded hover:opacity-90 transition-opacity"
            >
              Отправить решение
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default observer(CaseDetail);
