import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import solutionsStore from '../stores/solutionsStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const MySolutions = () => {
  useDocumentTitle('Мои решения');
  
  useEffect(() => {
    solutionsStore.fetchMySolutions();
  }, []);

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'border-terminal-green text-terminal-green',
      rejected: 'border-terminal-red text-terminal-red',
      reviewing: 'border-terminal-cyan text-terminal-cyan',
      pending: 'border-terminal-gray text-terminal-gray',
    };
    const labels = {
      approved: 'APPROVED',
      rejected: 'REJECTED',
      reviewing: 'REVIEWING',
      pending: 'PENDING',
    };
    return (
      <span className={`px-3 py-1 text-xs rounded border ${styles[status] || styles.pending}`}>
        {labels[status] || labels.pending}
      </span>
    );
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-100 mb-2">Мои решения</h1>
        <p className="text-gray-400">Все ваши отправленные решения</p>
      </div>

      {solutionsStore.loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-terminal-green">
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-1"></div>
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-2"></div>
            <span className="ml-2 text-gray-400">Загрузка...</span>
          </div>
        </div>
      ) : solutionsStore.solutions.length === 0 ? (
        <div className="text-center py-12 glass rounded-lg">
          <p className="text-gray-400 mb-4">У вас пока нет отправленных решений</p>
          <Link
            to="/cases"
            className="inline-block px-6 py-3 bg-terminal-dark border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all rounded"
          >
            Выбрать кейс
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {solutionsStore.solutions.map((solution, index) => (
            <div
              key={solution.id}
              className="glass rounded-lg hover:border-terminal-green transition-all duration-300 p-6 transform hover:scale-[1.01] hover:shadow-lg hover:shadow-terminal-green/10 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4 border-b-2 border-terminal-gray pb-3">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-100 mb-2">
                    {solution.title}
                  </h2>
                  <p className="text-sm text-gray-400 mb-2">
                    Кейс: {solution.case_title}
                  </p>
                  {solution.description && (
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {solution.description}
                    </p>
                  )}
                </div>
                {getStatusBadge(solution.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm text-gray-400">
                {solution.github_url && (
                  <div>
                    GitHub:{' '}
                    <a
                      href={solution.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terminal-cyan hover:text-white transition-colors"
                    >
                      {solution.github_url}
                    </a>
                  </div>
                )}
                {solution.presentation_file_path && (
                  <div>
                    Презентация:{' '}
                    <a
                      href={`/uploads/${solution.presentation_file_path.split('/').pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terminal-cyan hover:text-white transition-colors"
                    >
                      Скачать
                    </a>
                  </div>
                )}
                {solution.demo_url && (
                  <div>
                    Демо:{' '}
                    <a
                      href={solution.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terminal-cyan hover:text-white transition-colors"
                    >
                      {solution.demo_url}
                    </a>
                  </div>
                )}
                {solution.score > 0 && (
                  <div>
                    Оценка: <span className="text-gray-100">{solution.score}</span>
                  </div>
                )}
              </div>

              {solution.admin_comment && (
                <div className="mb-4 p-3 glass rounded border-l-2 border-terminal-cyan">
                  <p className="text-sm font-semibold text-gray-200 mb-1">
                    Комментарий администратора:
                  </p>
                  <p className="text-sm text-gray-400">{solution.admin_comment}</p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-terminal-gray pt-3">
                <span className="text-xs text-gray-500">
                  Отправлено: {new Date(solution.created_at).toLocaleString('ru-RU')}
                </span>
                <Link
                  to={`/solutions/submit/${solution.case_id}`}
                  className="text-sm text-terminal-green hover:text-terminal-cyan transition-colors"
                >
                  Редактировать
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {solutionsStore.error && (
        <div className="mt-4 p-4 glass rounded border border-terminal-red">
          <p className="text-terminal-red text-sm">{solutionsStore.error}</p>
        </div>
      )}
    </div>
  );
};

export default observer(MySolutions);
