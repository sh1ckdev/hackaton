import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';

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
    <div className="max-w-3xl">
      <Link
        to="/cases"
        className="inline-block text-white/60 hover:text-white mb-8 transition-colors"
      >
        ← назад
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-medium text-white mb-4">
          {caseItem.title}
        </h1>
        <div className="text-sm text-white/40 mb-6">
          {caseItem.difficulty === 'easy' ? 'легко' :
           caseItem.difficulty === 'medium' ? 'средне' : 'сложно'} • {caseItem.current_participants || 0} участников
        </div>

        {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() && (
          <div className="mb-6 pb-6 border-b border-terminal-gray/20">
            <div className="text-xs text-white/40 mb-3">Откроется через:</div>
            <CountdownTimer targetDate={caseItem.opens_at} />
            <div className="text-xs text-white/40 mt-3">
              {new Date(caseItem.opens_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="text-sm text-white/40 mb-2">Описание</div>
          <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{caseItem.description}</p>
        </div>

        {caseItem.requirements && (
          <div className="mb-6">
            <div className="text-sm text-white/40 mb-2">Требования</div>
            <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{caseItem.requirements}</p>
          </div>
        )}
      </div>

      {mySolution ? (
        <div className="mb-8 pb-8 border-b border-terminal-gray/20">
          <div className="text-sm text-white/40 mb-4">Мое решение</div>
          <div className="space-y-3 mb-6">
            <div>
              <div className="text-xs text-white/40 mb-1">Название</div>
              <div className="text-white/80">{mySolution.title}</div>
            </div>
            {mySolution.description && (
              <div>
                <div className="text-xs text-white/40 mb-1">Описание</div>
                <div className="text-white/80">{mySolution.description}</div>
              </div>
            )}
            {mySolution.github_url && (
              <div>
                <div className="text-xs text-white/40 mb-1">GitHub</div>
                <a
                  href={mySolution.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terminal-green hover:text-terminal-cyan transition-colors"
                >
                  {mySolution.github_url}
                </a>
              </div>
            )}
            <div>
              <div className="text-xs text-white/40 mb-1">Статус</div>
              <div className="text-white/80">
                {mySolution.status === 'approved' ? 'Одобрено' :
                 mySolution.status === 'rejected' ? 'Отклонено' :
                 mySolution.status === 'reviewing' ? 'На проверке' : 'Ожидает'}
              </div>
            </div>
            {mySolution.score > 0 && (
              <div>
                <div className="text-xs text-white/40 mb-1">Оценка</div>
                <div className="text-white/80">{mySolution.score}</div>
              </div>
            )}
            {mySolution.admin_comment && (
              <div>
                <div className="text-xs text-white/40 mb-1">Комментарий</div>
                <div className="text-white/80">{mySolution.admin_comment}</div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              to={`/solutions/submit/${caseItem.id}`}
              className="px-4 py-2 border border-terminal-gray/40 text-white/80 hover:text-white hover:border-white/40 transition-colors"
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
              className="px-4 py-2 border border-terminal-gray/40 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() ? (
            <div className="text-white/60">
              Кейс откроется {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
            </div>
          ) : (
            <Link
              to={`/solutions/submit/${caseItem.id}`}
              className="inline-block px-6 py-3 bg-terminal-green text-terminal-bg font-medium hover:opacity-90 transition-opacity"
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
