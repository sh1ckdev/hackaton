import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import casesStore from '../../stores/casesStore';
import authStore from '../../stores/authStore';

const AdminCases = () => {
  useDocumentTitle('Кейсы — Админ');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', requirements: '', participant_category: '', links: [], attachments: [] });
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => { casesStore.fetchCases(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', requirements: '', participant_category: '', links: [], attachments: [] });
    setNewLink({ label: '', url: '' });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ title: c.title, description: c.description, requirements: c.requirements || '', participant_category: c.participant_category || '', links: Array.isArray(c.links) ? c.links : [], attachments: Array.isArray(c.attachments) ? c.attachments : [] });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasNew = form.attachments.some(a => a.file);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('requirements', form.requirements || '');
      fd.append('participant_category', form.participant_category || '');
      fd.append('links', JSON.stringify(form.links));
      let pi = 0;
      form.attachments.forEach(att => {
        if (att.file) fd.append('attachments', att.file);
        else if (att.url) { fd.append(`attachment_url_${pi}`, att.url); fd.append(`attachment_name_${pi}`, att.name || ''); pi++; }
      });
      const onProgress = hasNew ? (ev) => { if (ev.total) setUploadProgress(Math.round(ev.loaded / ev.total * 100)); } : null;
      if (hasNew) setUploadProgress(0);
      if (editing) { fd.append('attachments_updated', '1'); await casesStore.updateCase(editing.id, fd, true, onProgress); }
      else { await casesStore.createCase(fd, true, onProgress); }
      setUploadProgress(0); setShowForm(false); setEditing(null);
      casesStore.fetchCases();
    } catch (err) { setUploadProgress(0); alert(err.response?.data?.error || 'Ошибка'); }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <span className="text-white/40 text-sm">{casesStore.cases.length} кейсов</span>
        <button onClick={openCreate} className="px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded">
          + Создать кейс
        </button>
      </div>

      <div className="space-y-4">
        {casesStore.cases.map(c => (
          <div key={c.id} className="border border-terminal-gray hover:border-terminal-blue transition-all p-4 bg-terminal-dark rounded">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">{c.title}</h3>
                <p className="text-sm text-white/70 line-clamp-2">{c.description}</p>
                {c.participant_category && (
                  <span className={`mt-2 inline-block text-xs ${c.participant_category === 'school' ? 'text-terminal-cyan' : 'text-terminal-blue'}`}>
                    {c.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                  </span>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => openEdit(c)} className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all rounded">Редактировать</button>
                {authStore.isAdmin && (
                  <button onClick={async () => { if (!confirm(`Удалить кейс "${c.title}"?`)) return; try { await casesStore.deleteCase(c.id); casesStore.fetchCases(); } catch (e) { alert(e.response?.data?.error || 'Ошибка'); } }}
                    className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all rounded">Удалить</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {casesStore.cases.length === 0 && <div className="text-center py-16 text-white/30">Кейсов нет</div>}
      </div>

      {}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">{editing ? 'Редактировать кейс' : 'Создать кейс'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Название *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Описание *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={4}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Требования</label>
                <textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} rows={3}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Категория</label>
                <select value={form.participant_category} onChange={e => setForm({ ...form, participant_category: e.target.value })}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
                  <option value="">Не указана</option>
                  <option value="school">Школьники</option>
                  <option value="student">Студенты</option>
                </select>
              </div>

              {}
              <div className="border-t border-terminal-gray/30 pt-4">
                <label className="block text-sm font-medium text-white/80 mb-3">Ссылки</label>
                {form.links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-terminal-dark/20 rounded border border-terminal-gray/20 mb-2">
                    <div className="flex-1"><div className="text-white text-sm font-medium">{link.label || 'Без названия'}</div><div className="text-gray-400 text-xs">{link.url}</div></div>
                    <button type="button" onClick={() => setForm({ ...form, links: form.links.filter((_, j) => j !== i) })}
                      className="px-3 py-1 text-xs border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded">Удалить</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input type="text" value={newLink.label} onChange={e => setNewLink({ ...newLink, label: e.target.value })} placeholder="Название"
                    className="flex-1 px-3 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded text-sm" />
                  <input type="url" value={newLink.url} onChange={e => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded text-sm" />
                  <button type="button" onClick={() => { if (newLink.url.trim()) { setForm({ ...form, links: [...form.links, { label: newLink.label, url: newLink.url }] }); setNewLink({ label: '', url: '' }); } }}
                    className="px-4 py-2 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded text-sm">Добавить</button>
                </div>
              </div>

              {}
              <div className="border-t border-terminal-gray/30 pt-4">
                <label className="block text-sm font-medium text-white/80 mb-3">Файлы</label>
                {form.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-terminal-dark/20 rounded border border-terminal-gray/20 mb-2">
                    <div className="flex-1 min-w-0"><div className="text-white text-sm truncate">{att.name || 'Файл'}</div></div>
                    <button type="button" onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, j) => j !== i) })}
                      className="px-3 py-1 text-xs border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded">Удалить</button>
                  </div>
                ))}
                <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.txt,.md,.jpg,.jpeg,.png,.gif"
                  onChange={e => { const files = Array.from(e.target.files || []); setForm({ ...form, attachments: [...form.attachments, ...files.map(f => ({ name: f.name, file: f }))] }); }}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white rounded file:mr-4 file:py-1 file:px-3 file:border-0 file:text-sm file:bg-terminal-gray/40 file:text-white cursor-pointer" />
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/60"><span>Загрузка...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full h-2 bg-terminal-dark/60 rounded-full overflow-hidden">
                    <div className="h-full bg-terminal-blue rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-4 border-t border-terminal-gray pt-4">
                <button type="submit" disabled={uploadProgress > 0 && uploadProgress < 100}
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded disabled:opacity-50">
                  {uploadProgress > 0 && uploadProgress < 100 ? `Загрузка ${uploadProgress}%...` : editing ? 'Сохранить' : 'Создать'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-blue transition-all font-medium rounded">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(AdminCases);
