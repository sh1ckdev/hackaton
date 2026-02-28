import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';

const CONTACT_TYPES = [
  { value: 'telegram',  label: 'Telegram канал / чат' },
  { value: 'telegram_bot', label: 'Telegram бот' },
  { value: 'vk',        label: 'ВКонтакте' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'website',   label: 'Сайт / ссылка' },
  { value: 'email',     label: 'Email' },
  { value: 'other',     label: 'Другое' },
];

const EMPTY_FORM = { type: 'telegram', label: '', url: '', sort_order: 0 };

const AdminContacts = () => {
  useDocumentTitle('Контакты — Админ');
  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts');
      setContacts(res.data.contacts || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, []);

  const saveContact = async (form) => {
    try {
      const payload = {
        type:       form.type,
        label:      form.label,
        url:        form.url,
        sort_order: Number(form.sort_order) || 0,
      };
      if (form.id) {
        const res = await api.put(`/contacts/${form.id}`, payload);
        setContacts(prev => prev.map(c => c.id === form.id ? res.data.contact : c));
      } else {
        const res = await api.post('/contacts', payload);
        setContacts(prev => [...prev, res.data.contact].sort((a, b) => a.sort_order - b.sort_order));
      }
      setEditing(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const deleteContact = async (id) => {
    if (!confirm('Удалить контакт?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления');
    }
  };

  const typeLabel = (type) => CONTACT_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="p-6">
      <div className="admin-settings-content">
        <div className="admin-settings-section-header">
          <h3>Контакты и ссылки</h3>
          <button onClick={() => setEditing(EMPTY_FORM)} className="admin-btn-primary">+ Добавить</button>
        </div>

        <div className="admin-settings-list">
          {loading && (
            <div className="text-white/30 text-sm py-8 text-center">Загрузка...</div>
          )}
          {!loading && contacts.length === 0 && (
            <div className="text-white/30 text-sm py-8 text-center border border-dashed border-white/10 rounded-lg">
              Контактов пока нет. Нажмите «+ Добавить».
            </div>
          )}
          {contacts.map((c) => (
            <div key={c.id} className="admin-settings-item">
              <div className="admin-settings-item-content">
                <div className="admin-settings-item-title">{c.label}</div>
                <div className="admin-settings-item-desc" style={{ fontSize: 13, opacity: 0.6 }}>
                  {typeLabel(c.type)}
                </div>
                <div className="admin-settings-item-meta">
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 13, wordBreak: 'break-all' }}>
                    {c.url}
                  </a>
                  <span style={{ marginLeft: 12, opacity: 0.4, fontSize: 12 }}>Порядок: {c.sort_order}</span>
                </div>
              </div>
              <div className="admin-settings-item-actions">
                <button
                  onClick={() => setEditing({ ...c })}
                  className="admin-btn-secondary"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => deleteContact(c.id)}
                  className="admin-btn-danger"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="admin-modal">
            <div className="admin-modal-content">
              <h3>{editing.id ? 'Редактировать' : 'Добавить'} контакт</h3>
              <form onSubmit={e => { e.preventDefault(); saveContact(editing); }}>
                <div className="admin-form-group">
                  <label>Тип</label>
                  <select
                    value={editing.type}
                    onChange={e => setEditing({ ...editing, type: e.target.value })}
                    className="admin-input"
                  >
                    {CONTACT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Название / подпись</label>
                  <input
                    type="text"
                    value={editing.label}
                    onChange={e => setEditing({ ...editing, label: e.target.value })}
                    className="admin-input"
                    placeholder="Например: Telegram-канал хакатона"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Ссылка (URL)</label>
                  <input
                    type="url"
                    value={editing.url}
                    onChange={e => setEditing({ ...editing, url: e.target.value })}
                    className="admin-input"
                    placeholder="https://t.me/..."
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Порядок сортировки</label>
                  <input
                    type="number"
                    value={editing.sort_order}
                    onChange={e => setEditing({ ...editing, sort_order: e.target.value })}
                    className="admin-input"
                    min="0"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Меньше число — выше в списке</small>
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

export default AdminContacts;
