import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import solutionsStore from '../stores/solutionsStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import api from '../utils/api';
import { SolutionIcon } from '../components/Icons';
import { fmtDateTime } from '../utils/dateUtils';

const MySolutions = () => {
  useDocumentTitle('Мои решения');
  const [team, setTeam] = useState(null);

  useEffect(() => {
    solutionsStore.fetchMySolutions();
  }, []);

  useEffect(() => {
    let ok = true;
    api.get('/teams/me').then((res) => {
      if (ok) setTeam(res.data?.team || null);
    }).catch(() => { if (ok) setTeam(null); });
    return () => { ok = false; };
  }, []);

  const getStatusBadge = (status) => {
    const map = {
      approved: 'solutions-status-approved',
      rejected: 'solutions-status-rejected',
      reviewing: 'solutions-status-reviewing',
      pending: 'solutions-status-pending',
    };
    const labels = {
      approved: 'Одобрено',
      rejected: 'Отклонено',
      reviewing: 'На проверке',
      pending: 'Ожидает',
    };
    return (
      <span className={`solutions-status-badge ${map[status] || map.pending}`}>
        {labels[status] || labels.pending}
      </span>
    );
  };

  return (
    <div className="solutions-page">
      <header className="solutions-header">
        <div className="solutions-header-text">
          <h1>МОИ РЕШЕНИЯ</h1>
          <p>// Все ваши отправленные решения. Редактируйте или добавляйте новые — кейс назначается вашей команде организаторами.</p>
        </div>
      </header>

      {solutionsStore.loading ? (
        <div className="terminal-loading">
          <div className="terminal-loading-container">
            <div>
              <span className="terminal-loading-prompt">sys@platform:~$</span>
              <span className="terminal-loading-command">list_solutions --user</span>
            </div>
            <div className="terminal-loading-status">
              &gt; Fetching solutions
              <span className="terminal-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
            <div className="terminal-loading-bar"></div>
          </div>
        </div>
      ) : solutionsStore.solutions.length === 0 ? (
        <div className="solutions-empty">
          <div className="solutions-empty-icon-wrap">
            <SolutionIcon size={64} className="solutions-empty-icon" />
          </div>
          <h3 className="solutions-empty-title">Пока нет отправленных решений</h3>
          <p className="solutions-empty-text">
            {team?.assigned_case_id
              ? 'Отправьте первое решение по назначенному вашей команде кейсу'
              : 'Кейс вашей команде ещё не назначен. Ожидайте распределения от организаторов.'}
          </p>
          {team?.assigned_case_id && (
            <Link
              to={`/solutions/submit/${team.assigned_case_id}`}
              className="solutions-empty-btn solutions-empty-btn-primary"
            >
              <SolutionIcon size={18} className="solutions-empty-btn-icon" />
              {team.assigned_case_title ? `Отправить решение: ${team.assigned_case_title}` : 'Отправить решение'}
            </Link>
          )}
        </div>
      ) : (
        <div className="solutions-list">
          {solutionsStore.solutions.map((solution) => (
            <div key={solution.id} className="solutions-card">
              <div className="solutions-card-header">
                <div className="solutions-card-title-row">
                  <h2 className="solutions-card-title">{solution.title}</h2>
                  {getStatusBadge(solution.status)}
                </div>
                <p className="solutions-card-case">Кейс: {solution.case_title}</p>
                {solution.description && (
                  <p className="solutions-card-desc">{solution.description}</p>
                )}
              </div>

              <div className="solutions-card-meta">
                {solution.github_url && (
                  <div className="solutions-meta-item">
                    <span className="solutions-meta-label">GitHub:</span>
                    <a
                      href={solution.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="solutions-meta-link"
                    >
                      {solution.github_url}
                    </a>
                  </div>
                )}
                {solution.presentation_file_path && (
                  <div className="solutions-meta-item">
                    <span className="solutions-meta-label">Презентация:</span>
                    <a
                      href={solution.presentation_file_path.startsWith('http') ? solution.presentation_file_path : `/uploads/${solution.presentation_file_path.split('/').pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="solutions-meta-link"
                    >
                      Скачать
                    </a>
                  </div>
                )}
                {solution.demo_url && (
                  <div className="solutions-meta-item">
                    <span className="solutions-meta-label">Демо:</span>
                    <a
                      href={solution.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="solutions-meta-link"
                    >
                      {solution.demo_url}
                    </a>
                  </div>
                )}
                {solution.score > 0 && (
                  <div className="solutions-meta-item">
                    <span className="solutions-meta-label">Оценка:</span>
                    <span className="solutions-meta-value">{solution.score}</span>
                  </div>
                )}
              </div>

              {solution.admin_comment && (
                <div className="solutions-admin-comment">
                  <p className="solutions-admin-comment-title">Комментарий администратора:</p>
                  <p className="solutions-admin-comment-text">{solution.admin_comment}</p>
                </div>
              )}

              <div className="solutions-card-footer">
                <span className="solutions-card-date">
                  Отправлено: {fmtDateTime(solution.created_at)}
                </span>
                {solution.status !== 'approved' && solution.status !== 'reviewing' && (
                  <Link to={`/solutions/submit/${solution.case_id}`} className="solutions-card-edit">
                    Редактировать
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {solutionsStore.error && (
        <div className="solutions-error">
          <p>{solutionsStore.error}</p>
        </div>
      )}
    </div>
  );
};

export default observer(MySolutions);
