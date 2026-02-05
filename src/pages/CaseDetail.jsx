import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import authStore from '../stores/authStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';
import { CaseIcon, TimeIcon, ArrowLeftIcon, UploadIcon, GitHubIcon, ArrowRightIcon, SolutionIcon } from '../components/Icons';

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

  // Проверяем, открыт ли кейс для обычных пользователей
  const isCaseOpen = !caseItem?.opens_at || new Date(caseItem.opens_at) <= new Date();
  const canViewDetails = authStore.isModerator || isCaseOpen;

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

  // Если кейс не открыт и пользователь не модератор - показываем сообщение
  if (!canViewDetails) {
    return (
      <div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-cyan mb-6 transition-colors group"
        >
          <ArrowLeftIcon size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Назад к кейсам</span>
        </Link>
        <div className="text-center py-20 border border-terminal-cyan/30 rounded-xl bg-terminal-cyan/5 backdrop-blur-sm">
          <TimeIcon size={48} className="text-terminal-cyan mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-semibold text-white mb-2">Кейс еще не открыт</h2>
          <p className="text-gray-400 mb-4">
            Информация о кейсе будет доступна после его открытия
          </p>
          {caseItem.opens_at && (
            <div className="mt-6 inline-block border border-terminal-cyan/30 rounded-xl p-5 bg-terminal-cyan/5">
              <div className="flex items-center gap-2 mb-3 justify-center">
                <TimeIcon size={18} className="text-terminal-cyan" />
                <p className="text-sm font-medium text-terminal-cyan">Кейс откроется через:</p>
              </div>
              <CountdownTimer targetDate={caseItem.opens_at} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Кнопка назад */}
      <Link
        to="/cases"
        className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-cyan mb-6 transition-colors group"
      >
        <ArrowLeftIcon size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>Назад к кейсам</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Основной контент - 2 колонки */}
        <div className="lg:col-span-2 space-y-6">
          {/* Заголовок и сложность */}
          <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-white pr-4">
                {caseItem.title}
              </h1>
              <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shrink-0 ${
                caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green bg-terminal-green/10' :
                caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan bg-terminal-cyan/10' :
                'border-terminal-red text-terminal-red bg-terminal-red/10'
              }`}>
                {caseItem.difficulty === 'easy' ? 'EASY' :
                 caseItem.difficulty === 'medium' ? 'MEDIUM' : 'HARD'}
              </span>
            </div>
          </div>


          {/* Описание */}
          <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CaseIcon size={20} className="text-terminal-green" />
              Описание
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{caseItem.description}</p>
            </div>
          </div>

          {/* Требования */}
          {caseItem.requirements && (
            <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4">Требования</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{caseItem.requirements}</p>
              </div>
            </div>
          )}

          {/* Файлы и ссылки (если есть) */}
          {(caseItem.attachments || caseItem.links) && (
            <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4">Дополнительные материалы</h2>
              <div className="space-y-3">
                {caseItem.links && caseItem.links.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Ссылки:</h3>
                    <div className="space-y-2">
                      {caseItem.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-terminal-cyan hover:text-terminal-green transition-colors break-all"
                        >
                          {link.label || link.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {caseItem.attachments && caseItem.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Файлы:</h3>
                    <div className="space-y-2">
                      {caseItem.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-terminal-cyan hover:text-terminal-green transition-colors"
                        >
                          <UploadIcon size={16} />
                          <span>{file.name || file.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Мое решение или кнопка отправки */}
          {mySolution ? (
            <div className="border border-terminal-green/30 rounded-xl p-6 bg-terminal-green/5 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                <SolutionIcon size={20} className="text-terminal-green" />
                Мое решение
              </h2>
              <div className="space-y-3 mb-5">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Название</span>
                  <p className="text-gray-300 mt-1">{mySolution.title}</p>
                </div>
                {mySolution.description && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Описание</span>
                    <p className="text-gray-300 mt-1">{mySolution.description}</p>
                  </div>
                )}
                {mySolution.github_url && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">GitHub</span>
                    <p className="mt-1">
                      <a
                        href={mySolution.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-cyan hover:text-terminal-green transition-colors break-all"
                      >
                        {mySolution.github_url}
                      </a>
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Статус</span>
                  <div className="mt-1">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg border ${
                      mySolution.status === 'approved' ? 'border-terminal-green text-terminal-green bg-terminal-green/10' :
                      mySolution.status === 'rejected' ? 'border-terminal-red text-terminal-red bg-terminal-red/10' :
                      mySolution.status === 'reviewing' ? 'border-terminal-cyan text-terminal-cyan bg-terminal-cyan/10' :
                      'border-terminal-gray text-gray-400 bg-terminal-gray/10'
                    }`}>
                      {mySolution.status === 'approved' ? 'Одобрено' :
                       mySolution.status === 'rejected' ? 'Отклонено' :
                       mySolution.status === 'reviewing' ? 'На проверке' : 'Ожидает'}
                    </span>
                  </div>
                </div>
                    {mySolution.score > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Оценка</span>
                    <p className="mt-1 text-lg font-semibold text-terminal-green">{mySolution.score}</p>
                  </div>
                )}
                {mySolution.admin_comment && (
                  <div className="pt-4 mt-4 border-t border-terminal-gray/20">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Комментарий администратора</span>
                    <p className="text-gray-300 text-sm mt-2 p-3 bg-terminal-dark/40 rounded border border-terminal-gray/20">
                      {mySolution.admin_comment}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-terminal-gray/20">
                <Link
                  to={`/solutions/submit/${caseItem.id}`}
                  className="flex-1 px-4 py-2.5 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-colors rounded-lg text-sm font-medium text-center"
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
                  className="flex-1 px-4 py-2.5 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-colors rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-terminal-gray/30 rounded-xl p-8 text-center bg-terminal-dark/30 backdrop-blur-sm">
              {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() ? (
                <div>
                  <TimeIcon size={32} className="text-terminal-cyan mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400">
                    Кейс будет открыт {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              ) : (
                <div>
                  <SolutionIcon size={32} className="text-terminal-green mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400 mb-4">У вас еще нет решения для этого кейса</p>
                  <Link
                    to={`/solutions/submit/${caseItem.id}`}
                    className="inline-block px-6 py-3 bg-terminal-green text-terminal-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Отправить решение
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Боковая панель - 1 колонка */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            {/* Информация о кейсе */}
            <div className="border border-terminal-gray/30 rounded-xl p-5 bg-terminal-dark/30 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Информация</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Участников</span>
                  <p className="text-white font-semibold">
                    {caseItem.current_participants || 0}
                    {caseItem.max_participants > 0 && (
                      <span className="text-gray-500 font-normal"> / {caseItem.max_participants}</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Сложность</span>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${
                    caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green' :
                    caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan' :
                    'border-terminal-red text-terminal-red'
                  }`}>
                    {caseItem.difficulty === 'easy' ? 'EASY' :
                     caseItem.difficulty === 'medium' ? 'MEDIUM' : 'HARD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Быстрые действия */}
            {!mySolution && (!caseItem.opens_at || new Date(caseItem.opens_at) <= new Date()) && (
              <div className="border border-terminal-green/30 rounded-xl p-5 bg-terminal-green/5 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-terminal-green mb-3">Готовы начать?</h3>
                <Link
                  to={`/solutions/submit/${caseItem.id}`}
                  className="block w-full px-4 py-3 bg-terminal-green text-terminal-bg font-semibold rounded-lg hover:opacity-90 transition-opacity text-center text-sm"
                >
                  Отправить решение
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(CaseDetail);
