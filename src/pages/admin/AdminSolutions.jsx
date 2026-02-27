import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import solutionsStore from '../../stores/solutionsStore';
import casesStore from '../../stores/casesStore';
import api from '../../utils/api';

const STATUS_LABELS = { pending: 'Ожидает', reviewing: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено' };
const STATUS_STYLES = {
  approved: 'border-terminal-blue text-terminal-blue',
  rejected: 'border-terminal-red text-terminal-red',
  reviewing: 'border-terminal-cyan text-terminal-cyan',
  pending: 'border-terminal-gray text-terminal-gray',
};

const AdminSolutions = () => {
  useDocumentTitle('Решения — Админ');
  const [filters, setFilters] = useState({ status: '', case_id: '' });
  const [moderating, setModerating] = useState(null);
  const [moderationData, setModerationData] = useState({ status: 'approved', admin_comment: '', score: 0 });

  useEffect(() => {
    solutionsStore.fetchAllSolutions();
    casesStore.fetchCases();
  }, []);

  const handleFilterChange = (e) => {
    const next = { ...filters, [e.target.name]: e.target.value };
    setFilters(next);
    solutionsStore.fetchAllSolutions(next);
  };

  const handleModerate = async () => {
    if (!moderating) return;
    try {
      await solutionsStore.moderateSolution(moderating.id, moderationData);
      setModerating(null);
      setModerationData({ status: 'approved', admin_comment: '', score: 0 });
      solutionsStore.fetchAllSolutions(filters);
    } catch {}
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-4 flex-wrap">
        <select name="status" value={filters.status} onChange={handleFilterChange}
          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
          <option value="">Все статусы</option>
          <option value="pending">Ожидает</option>
          <option value="reviewing">На проверке</option>
          <option value="approved">Одобрено</option>
          <option value="rejected">Отклонено</option>
        </select>
        <select name="case_id" value={filters.case_id} onChange={handleFilterChange}
          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
          <option value="">Все кейсы</option>
          {casesStore.cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {solutionsStore.allSolutions.length === 0 && (
        <div className="text-center py-16 text-white/30">Решений нет</div>
      )}

      <div className="space-y-4">
        {solutionsStore.allSolutions.map((s, i) => (
          <div key={s.id} className="border border-terminal-gray hover:border-terminal-blue transition-all p-4 bg-terminal-dark rounded"
            style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="flex items-start justify-between mb-2 border-b border-terminal-gray/60 pb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/70">
                  {s.first_name} {s.last_name}{' '}
                  {s.username ? <a href={`https://t.me/${s.username}`} target="_blank" rel="noreferrer" className="text-terminal-cyan hover:underline">@{s.username}</a> : '—'}
                  {' · '}Кейс: {s.case_title}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs border ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}>
                {STATUS_LABELS[s.status] || STATUS_LABELS.pending}
              </span>
            </div>
            {s.description && <p className="text-sm text-white/70 mb-2">{s.description}</p>}
            <div className="flex gap-4 text-sm text-white/70 mb-2">
              {s.github_url && <a href={s.github_url} target="_blank" rel="noreferrer" className="text-terminal-cyan hover:text-white">GitHub</a>}
              {s.demo_url && <a href={s.demo_url} target="_blank" rel="noreferrer" className="text-terminal-cyan hover:text-white">Демо</a>}
              {s.presentation_file_path && <a href={s.presentation_file_path.startsWith('http') ? s.presentation_file_path : `/uploads/${s.presentation_file_path.split('/').pop()}`} target="_blank" rel="noreferrer" className="text-terminal-cyan hover:text-white">Презентация</a>}
            </div>
            {s.admin_comment && <p className="text-sm text-white/70 mb-2 border-l-2 border-terminal-gray/60 pl-3">Комментарий: {s.admin_comment}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setModerating(s); setModerationData({ status: s.status || 'approved', admin_comment: s.admin_comment || '', score: s.score || 0 }); }}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all text-sm rounded">
                Модерировать →
              </button>
              <button onClick={async () => { if (!confirm(`Удалить «${s.title}»?`)) return; try { await solutionsStore.deleteSolution(s.id); solutionsStore.fetchAllSolutions(filters); } catch (e) { alert(e.response?.data?.error || 'Ошибка'); } }}
                className="px-4 py-2 bg-terminal-dark/40 border border-red-500/60 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all text-sm rounded">
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно модерации */}
      {moderating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">Модерация решения</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Статус</label>
                <select value={moderationData.status} onChange={e => setModerationData({ ...moderationData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
                  <option value="approved">Одобрено</option>
                  <option value="rejected">Отклонено</option>
                  <option value="reviewing">На проверке</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Комментарий</label>
                <textarea value={moderationData.admin_comment} onChange={e => setModerationData({ ...moderationData, admin_comment: e.target.value })}
                  rows={4} className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" />
              </div>
              <div className="flex gap-4 border-t border-terminal-gray pt-4">
                <button onClick={handleModerate} className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded">Сохранить</button>
                <button onClick={() => setModerating(null)} className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-blue transition-all font-medium rounded">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(AdminSolutions);
