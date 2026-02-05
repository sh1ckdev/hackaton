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
    <div className="px-4 py-6 max-w-4xl mx-auto relative z-10">
      <Link
        to="/cases"
        className="group inline-flex items-center gap-2 text-terminal-green hover:text-terminal-cyan mb-6 glass-light px-4 py-2 rounded-lg hover:bg-glass transition-all"
      >
        <ArrowLeftIcon size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span>Назад к кейсам</span>
      </Link>

      <div className="glass-strong rounded-2xl p-8 mb-6 animate-fade-in-up relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-terminal-green/10 rounded-full blur-3xl"></div>
        <div className="relative">
        <div className="flex items-start justify-between mb-6 border-b border-terminal-gray/40 pb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-3 glass-light rounded-xl">
              <CaseIcon size={32} className="text-terminal-green" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {caseItem.title}
            </h1>
          </div>
          <span className={`px-4 py-2 text-xs font-bold rounded-xl border-2 ${
            caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green bg-terminal-green/10' :
            caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan bg-terminal-cyan/10' :
            'border-terminal-red text-terminal-red bg-terminal-red/10'
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
          <div className="mb-6 p-8 glass-gradient-cyan rounded-2xl border-2 border-terminal-cyan/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-terminal-cyan/20 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6 justify-center">
                <TimeIcon size={28} className="text-terminal-cyan" />
                <p className="text-xl text-terminal-cyan font-bold">
                  Кейс откроется через:
                </p>
              </div>
              <div className="mb-6">
                <CountdownTimer targetDate={caseItem.opens_at} />
              </div>
              <p className="text-sm text-gray-300 text-center mb-2">
                Дата открытия: {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
              </p>
              <p className="text-xs text-gray-400 text-center">
                Вы получите уведомление в Telegram, когда кейс будет открыт
              </p>
            </div>
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
            className="group flex items-center gap-2 px-6 py-3 glass-gradient-green border border-terminal-green/50 text-terminal-green hover:border-terminal-green font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-terminal-green/40"
          >
            <UploadIcon size={20} />
            <span>Отправить решение</span>
            <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default observer(CaseDetail);
