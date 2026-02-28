import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';

const utcToMoscowForInput = (utcStr) => {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const get = t => p.find(x => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};
const moscowInputToUtc = (v) => {
  if (!v || !String(v).trim()) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return new Date(s + '+03:00').toISOString();
  return s;
};

const EMPTY_FORM = { name: '', type: 'general', enabled: true, target_audience: { all: true }, message_template: '', schedule_time: '', conditions: {}, case_id: null };

const AdminBroadcastSettings = () => {
  useDocumentTitle('Авто-рассылки — Админ');
  const [settings, setSettings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchSettings = async () => {
    try { const res = await api.get('/admin/broadcast-settings'); setSettings(res.data.settings); } catch {}
  };

  useEffect(() => { fetchSettings(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, type: s.type, enabled: s.enabled, target_audience: s.target_audience || { all: true }, message_template: s.message_template, schedule_time: s.schedule_time ? utcToMoscowForInput(s.schedule_time) : '', conditions: s.conditions || {}, case_id: s.case_id || null });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, schedule_time: moscowInputToUtc(form.schedule_time) };
      if (editing) await api.put(`/admin/broadcast-settings/${editing.id}`, payload);
      else await api.post('/admin/broadcast-settings', payload);
      setShowForm(false); setEditing(null); setForm(EMPTY_FORM);
      fetchSettings();
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту настройку рассылки?')) return;
    try { await api.delete(`/admin/broadcast-settings/${id}`); fetchSettings(); } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-terminal-blue text-terminal-bg hover:bg-terminal-cyan transition-all font-medium rounded">+ Создать настройку</button>
      </div>

      <div className="space-y-4">
        {settings.map(s => (
          <div key={s.id} className="border border-terminal-gray hover:border-terminal-blue transition-all p-4 bg-terminal-dark rounded">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded border ${s.enabled ? 'bg-terminal-blue/20 text-terminal-blue border-terminal-blue' : 'bg-terminal-gray/20 text-terminal-gray border-terminal-gray'}`}>{s.enabled ? 'Включено' : 'Выключено'}</span>
                  <span className="px-2 py-1 text-xs rounded bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan">{s.type === 'scheduled' ? 'По расписанию' : 'Общая'}</span>
                  {s.type === 'scheduled' && s.last_sent_at && s.schedule_time && new Date(s.last_sent_at) >= new Date(s.schedule_time) && (
                    <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500">✓ Отправлено</span>
                  )}
                </div>
                <p className="text-sm text-white/60 mb-2 line-clamp-2">{s.message_template}</p>
                <p className="text-xs text-white/40 mb-1">
                  Аудитория: {s.target_audience?.all ? 'Все пользователи' : `Роли: ${(s.target_audience?.roles || []).join(', ') || '—'}`}
                </p>
                {s.schedule_time && (
                  <p className="text-xs text-white/50">
                    Запланировано: {new Date(s.schedule_time).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК
                  </p>
                )}
                {s.last_sent_at && (
                  <p className="text-xs text-green-400/70">
                    Отправлено: {new Date(s.last_sent_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => openEdit(s)} className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded">Редактировать</button>
                <button onClick={() => handleDelete(s.id)} className="px-3 py-1 text-sm bg-terminal-dark/40 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded">Удалить</button>
              </div>
            </div>
          </div>
        ))}
        {settings.length === 0 && <div className="text-center py-16 text-white/40">Нет настроек рассылок</div>}
      </div>

      {/* Форма */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">{editing ? 'Редактировать настройку' : 'Создать настройку'}</h2>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Название *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" placeholder="Например: Уведомление об открытии кейса" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Тип *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
                    <option value="general">Общая рассылка</option>
                    <option value="scheduled">По расписанию</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Статус</label>
                  <select value={form.enabled ? 'true' : 'false'} onChange={e => setForm({ ...form, enabled: e.target.value === 'true' })}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
                    <option value="true">Включено</option>
                    <option value="false">Выключено</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Шаблон сообщения *</label>
                <textarea value={form.message_template} onChange={e => setForm({ ...form, message_template: e.target.value })} required rows={6}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" placeholder="Текст сообщения..." />
                <p className="text-xs text-white/60 mt-1">Поддерживается HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Аудитория</label>
                <label className="flex items-center gap-2 text-white/80">
                  <input type="checkbox" checked={form.target_audience?.all === true} onChange={e => setForm({ ...form, target_audience: e.target.checked ? { all: true } : { all: false, roles: [] } })} className="w-4 h-4" />
                  Все пользователи
                </label>
                {!form.target_audience?.all && (
                  <div className="ml-6 mt-2 space-y-1 text-sm">
                    {['user', 'moderator', 'admin'].map(role => (
                      <label key={role} className="flex items-center gap-2 text-white/70">
                        <input type="checkbox" checked={(form.target_audience?.roles || []).includes(role)}
                          onChange={e => {
                            const roles = form.target_audience?.roles || [];
                            setForm({ ...form, target_audience: { ...form.target_audience, roles: e.target.checked ? [...roles, role] : roles.filter(r => r !== role) } });
                          }} className="w-4 h-4" />
                        {role === 'user' ? 'Пользователь' : role === 'moderator' ? 'Модератор' : 'Администратор'}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {form.type === 'scheduled' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Время отправки * <span className="text-white/40 font-normal">(МСК)</span></label>
                  <input type="datetime-local" value={form.schedule_time} onChange={e => setForm({ ...form, schedule_time: e.target.value })} required={form.type === 'scheduled'}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" />
                </div>
              )}
              <div className="flex gap-4 border-t border-terminal-gray/30 pt-4">
                <button type="submit" className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded">
                  {editing ? 'Сохранить' : 'Создать'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-blue transition-all font-medium rounded">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBroadcastSettings;
