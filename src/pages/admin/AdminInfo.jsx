import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';

const AdminInfo = () => {
  useDocumentTitle('Страница Инфо — Админ');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/info').then(r => setContent(r.data.content || '')).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await api.put('/info', { content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Страница «Информация»</h2>
      <p className="text-white/50 text-sm mb-5">Содержимое отображается на странице /info. Поддерживается Markdown.</p>
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={20}
        placeholder="# Правила хакатона&#10;&#10;Напишите текст в формате Markdown..."
        className="w-full px-4 py-3 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded font-mono text-sm resize-y"
        style={{ minHeight: 320 }} />
      <div className="flex items-center gap-4 mt-4">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 bg-terminal-blue text-white rounded font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        {saved && <span className="text-green-400 text-sm font-medium">✓ Сохранено</span>}
      </div>
    </div>
  );
};

export default AdminInfo;
