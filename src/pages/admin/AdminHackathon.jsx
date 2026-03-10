import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';
import { fmtDateTime } from '../../utils/dateUtils';

// Строка datetime-local (МСК) → ISO UTC для API
const mskToUtc = (v) => {
  if (!v || !String(v).trim()) return null;
  return new Date(String(v) + ':00+03:00').toISOString();
};

// UTC (из API) → строка для datetime-local в МСК
const utcToMsk = (utcStr) => {
  if (!utcStr) return '';
  const s = String(utcStr);
  const d = /[Z+\-]\d*$/.test(s.trim()) ? new Date(s) : new Date(s.replace(' ', 'T') + 'Z');
  if (!d || isNaN(d)) return '';
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = t => p.find(x => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};

const toEditForm = (item) => ({
  id:             item.id,
  type:           item.type || 'other',
  title:          item.title || '',
  description:    item.description || '',
  date_to:        utcToMsk(item.date_to),
  show_countdown: !!item.show_countdown,
  is_closing:     !!item.is_closing,
});

const EMPTY_FORM = { title: '', description: '', date_to: '', show_countdown: false, is_closing: false, type: 'other' };

const AdminHackathon = () => {
  useDocumentTitle('Настройки — Админ');
  const [timeline, setTimeline] = useState([]);
  const [editing, setEditing] = useState(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  const fetchRegistrationClosed = async () => {
    try {
      const res = await api.get('/admin/settings/registration-closed');
      setRegistrationClosed(!!res.data?.registration_closed);
    } catch { setRegistrationClosed(false); }
  };

  const toggleRegistrationClosed = async () => {
    setRegistrationLoading(true);
    try {
      const next = !registrationClosed;
      await api.put('/admin/settings/registration-closed', { registration_closed: next });
      setRegistrationClosed(next);
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setRegistrationLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await api.get('/admin/settings/timeline').catch(() => ({ data: { timeline: [] } }));
      setTimeline(res.data.timeline || []);
    } catch {}
  };

  useEffect(() => { fetchTimeline(); fetchRegistrationClosed(); }, []);

  const saveItem = async (form) => {
    try {
      const payload = {
        type:           form.type || 'other',
        title:          form.title,
        description:    form.description,
        date:           null,
        date_to:        form.date_to ? mskToUtc(form.date_to) : null,
        show_countdown: !!form.show_countdown,
        is_closing:     !!form.is_closing,
      };
      if (form.id) {
        await api.put(`/admin/settings/timeline/${form.id}`, payload);
      } else {
        await api.post('/admin/settings/timeline', payload);
      }
      await fetchTimeline();
      setEditing(null);
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!confirm('Удалить этот пункт таймлайна?')) return;
    try {
      await api.delete(`/admin/settings/timeline/${id}`);
      await fetchTimeline();
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  const moveTimelineItem = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timeline.length) return;

    const next = [...timeline];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setTimeline(next);

    try {
      const orderedIds = next.map((item) => item.id).filter(Boolean);
      const res = await api.put('/admin/settings/timeline/reorder', { ordered_ids: orderedIds });
      if (res.data?.timeline) {
        setTimeline(res.data.timeline);
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка изменения порядка');
      await fetchTimeline();
    }
  };

  return (
    <div className="p-6">
      <div className="admin-settings-content">
        <div className="admin-settings-section-header" style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 16 }}>Закрытие регистрации</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              При включении входить смогут только те, кто уже регистрировался ранее
            </p>
          </div>
          <button
            onClick={toggleRegistrationClosed}
            disabled={registrationLoading}
            className={registrationClosed ? 'admin-btn-primary' : 'admin-btn-danger'}
            style={{ minWidth: 180 }}
          >
            {registrationLoading ? '...' : (registrationClosed ? 'Открыть регистрацию' : 'Закрыть регистрацию')}
          </button>
        </div>

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
                    ? <span>До: {fmtDateTime(item.date_to)}</span>
                    : <span style={{ opacity: 0.4 }}>Дата не указана</span>}
                  {item.show_countdown && <span className="admin-badge" style={{ marginLeft: 8 }}>Таймер на главной</span>}
                  {item.is_closing && <span className="admin-badge" style={{ marginLeft: 8 }}>Закрытие</span>}
                </div>
              </div>
              <div className="admin-settings-item-actions">
                <button
                  onClick={() => moveTimelineItem(idx, 'up')}
                  className="admin-btn-secondary"
                  disabled={idx === 0}
                  title="Поднять выше"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveTimelineItem(idx, 'down')}
                  className="admin-btn-secondary"
                  disabled={idx === timeline.length - 1}
                  title="Опустить ниже"
                >
                  ↓
                </button>
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
                  <input
                    type="text"
                    value={editing.title}
                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                    className="admin-input"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Описание</label>
                  <textarea
                    value={editing.description}
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                    className="admin-input"
                    rows={3}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>{editing.show_countdown || editing.is_closing ? 'Дедлайн таймера' : 'Дата'}</label>
                  <input
                    type="datetime-local"
                    value={editing.date_to}
                    onChange={e => setEditing({ ...editing, date_to: e.target.value })}
                    className="admin-input"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Московское время</small>
                </div>
                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!editing.show_countdown}
                      onChange={e => setEditing({ ...editing, show_countdown: e.target.checked })}
                    />
                    Таймер на главной
                  </label>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Таймер отсчитывает от текущего момента до указанной даты
                  </small>
                </div>
                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!editing.is_closing}
                      onChange={e => setEditing({ ...editing, is_closing: e.target.checked })}
                    />
                    Закрытие соревнований
                  </label>
                  <small style={{ color: 'var(--text-muted)' }}>
                    После старта таймер «Соревнования идут» считает до этого события (минимум 48 часов).
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
