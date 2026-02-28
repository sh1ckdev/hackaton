import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';
import { fmtDateTime } from '../../utils/dateUtils';

// PostgreSQL TIMESTAMP без timezone-маркера → Date (UTC)
const toDate = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const s = String(ts);
  if (/[Z+\-]\d*$/.test(s.trim())) return new Date(s);
  return new Date(s.replace(' ', 'T') + 'Z');
};

// UTC (из API) → строка для datetime-local в МСК
const utcToMsk = (utcStr) => {
  if (!utcStr) return '';
  const d = toDate(utcStr);
  if (!d || isNaN(d)) return '';
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = t => p.find(x => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};

// Строка datetime-local (МСК) → ISO UTC для API
const mskToUtc = (v) => {
  if (!v || !String(v).trim()) return null;
  return new Date(String(v) + ':00+03:00').toISOString();
};

// Готовит объект для формы: даты уже в МСК-строках для datetime-local
const toEditForm = (item) => ({
  id:             item.id,
  type:           item.type || 'other',
  title:          item.title || '',
  description:    item.description || '',
  date:           utcToMsk(item.date),
  date_to:        utcToMsk(item.date_to),
  show_countdown: !!item.show_countdown,
});

const EMPTY_FORM = { title: '', description: '', date: '', date_to: '', show_countdown: false, type: 'other' };

const AdminHackathon = () => {
  useDocumentTitle('Настройки — Админ');
  const [timeline, setTimeline] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchTimeline = async () => {
    try { const res = await api.get('/admin/settings/timeline').catch(() => ({ data: { timeline: [] } })); setTimeline(res.data.timeline || []); } catch {}
  };

  useEffect(() => { fetchTimeline(); }, []);

  const saveItem = async (form) => {
    try {
      // Если включён таймер на главной — дата начала берётся автоматически (текущий момент)
      const payload = {
        type:           form.type || 'other',
        title:          form.title,
        description:    form.description,
        date:           form.show_countdown ? null : mskToUtc(form.date),
        date_to:        form.date_to ? mskToUtc(form.date_to) : null,
        show_countdown: !!form.show_countdown,
      };
      if (form.id) {
        const res = await api.put(`/admin/settings/timeline/${form.id}`, payload);
        setTimeline(prev => prev.map(t => t.id === form.id ? res.data.timeline_item : t));
      } else {
        const res = await api.post('/admin/settings/timeline', payload);
        setTimeline(prev =>
          [...prev, res.data.timeline_item].sort((a, b) => new Date(a.date_to || a.date) - new Date(b.date_to || b.date))
        );
      }
      setEditing(null);
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!confirm('Удалить этот пункт таймлайна?')) return;
    try { await api.delete(`/admin/settings/timeline/${id}`); setTimeline(prev => prev.filter(t => t.id !== id)); }
    catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  return (
    <div className="p-6">
      <div className="admin-settings-content">
        <div className="admin-settings-section-header">
          <h3>Таймлайн событий</h3>
          <button onClick={() => setEditing(EMPTY_FORM)} className="admin-btn-primary">+ Добавить событие</button>
        </div>

        <div className="admin-settings-list">
          {timeline.length === 0 && (
            <div className="text-white/30 text-sm py-8 text-center border border-dashed border-white/10 rounded-lg">
              Событий пока нет. Нажмите «+ Добавить событие».
            </div>
          )}
          {timeline.map((item, idx) => (
            <div key={item.id || idx} className="admin-settings-item">
              <div className="admin-settings-item-content">
                <div className="admin-settings-item-title">{item.title}</div>
                <div className="admin-settings-item-desc">{item.description}</div>
                <div className="admin-settings-item-meta">
                  {item.date_to
                    ? <span>От {item.date ? fmtDateTime(item.date) : '—'} до {fmtDateTime(item.date_to)}</span>
                    : <span>Дата: {item.date ? fmtDateTime(item.date) : 'Не указана'}</span>}
                  {item.show_countdown && <span className="admin-badge" style={{ marginLeft: 8 }}>Таймер на главной</span>}
                </div>
              </div>
              <div className="admin-settings-item-actions">
                <button onClick={() => setEditing(toEditForm(item))} className="admin-btn-secondary">Редактировать</button>
                <button onClick={() => deleteItem(item.id)} className="admin-btn-danger">Удалить</button>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="admin-modal">
            <div className="admin-modal-content">
              <h3>{editing.id ? 'Редактировать' : 'Создать'} событие</h3>
              <form onSubmit={e => { e.preventDefault(); saveItem(editing); }}>
                <div className="admin-form-group">
                  <label>Название</label>
                  <input type="text" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="admin-input" required />
                </div>
                <div className="admin-form-group">
                  <label>Описание</label>
                  <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="admin-input" rows={3} required />
                </div>
                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editing.show_countdown} onChange={e => setEditing({ ...editing, show_countdown: e.target.checked })} />
                    Таймер на главной
                  </label>
                  <small style={{ color: 'var(--text-muted)' }}>Таймер считает до даты окончания</small>
                </div>
                {!editing.show_countdown && (
                  <div className="admin-form-group">
                    <label>Дата начала (от)</label>
                    <input type="datetime-local" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} className="admin-input" />
                    <small style={{ color: 'var(--text-muted)' }}>Московское время</small>
                  </div>
                )}
                <div className="admin-form-group">
                  <label>{editing.show_countdown ? 'Дата окончания (дедлайн таймера)' : 'Дата окончания (до)'}</label>
                  <input type="datetime-local" value={editing.date_to} onChange={e => setEditing({ ...editing, date_to: e.target.value })} className="admin-input" />
                  <small style={{ color: 'var(--text-muted)' }}>
                    {editing.show_countdown ? 'Московское время. Таймер на главной считает до этой даты' : 'Московское время. Если указано — покажет период'}
                  </small>
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn-primary">Сохранить</button>
                  <button type="button" onClick={() => setEditing(null)} className="admin-btn-secondary">Отмена</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHackathon;
