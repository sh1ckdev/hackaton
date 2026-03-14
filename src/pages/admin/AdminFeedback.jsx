import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';

const CATEGORY_LABELS = {
  competitions: 'Соревнования',
  site: 'Сайт',
  general: 'Общее',
};

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminFeedback = () => {
  useDocumentTitle('Обратная связь — Админ');
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  const deleteFeedback = async (id) => {
    if (!confirm('Удалить этот отзыв?')) return;
    try {
      await api.delete(`/admin/feedback/${id}`);
      setFeedback((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления');
    }
  };

  const fetchFeedback = async () => {
    try {
      const params = categoryFilter ? { category: categoryFilter } : {};
      const res = await api.get('/admin/feedback', { params });
      setFeedback(res.data.feedback || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeedback(); }, [categoryFilter]);

  return (
    <div className="p-6">
      <div className="admin-settings-content">
        <div className="admin-settings-section-header">
          <h3>Отзывы участников</h3>
          <div className="admin-support-filter-tabs" style={{ margin: 0 }}>
            {[['', 'Все'], ['competitions', 'Соревнования'], ['site', 'Сайт'], ['general', 'Общее']].map(([val, label]) => (
              <button
                key={val || 'all'}
                onClick={() => setCategoryFilter(val)}
                className={`admin-support-filter-tab${categoryFilter === val ? ' active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-settings-list">
          {loading && (
            <div className="text-white/30 text-sm py-8 text-center">Загрузка...</div>
          )}
          {!loading && feedback.length === 0 && (
            <div className="text-white/30 text-sm py-8 text-center border border-dashed border-white/10 rounded-lg">
              Отзывов пока нет.
            </div>
          )}
          {feedback.map((f) => (
            <div key={f.id} className="admin-settings-item">
              <div className="admin-settings-item-content" style={{ flex: 1, minWidth: 0 }}>
                <div className="admin-settings-item-title" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {f.text}
                </div>
                <div className="admin-settings-item-desc" style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
                  <span className="px-1.5 py-0.5 rounded text-xs border border-white/20 text-white/60">
                    {CATEGORY_LABELS[f.category] || f.category}
                  </span>
                  {f.rating != null && (
                    <span style={{ marginLeft: 8 }}>
                      Оценка: {f.rating}/5
                    </span>
                  )}
                </div>
                <div className="admin-settings-item-meta" style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
                  {f.first_name || f.last_name || f.username ? (
                    <>
                      {[f.first_name, f.last_name].filter(Boolean).join(' ')}
                      {f.username && ` @${f.username}`}
                      {f.telegram_id && ` (tg: ${f.telegram_id})`}
                    </>
                  ) : (
                    'Гость'
                  )}
                  {' · '}
                  {fmtDate(f.created_at)}
                </div>
              </div>
              <div className="admin-settings-item-actions">
                <button
                  onClick={() => deleteFeedback(f.id)}
                  className="admin-btn-danger"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminFeedback;
