import { useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';
import { PaperPlaneIcon } from '../../components/Icons';

const AdminBroadcast = () => {
  useDocumentTitle('Рассылка — Админ');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!message.trim()) { alert('Введите сообщение'); return; }
    setSending(true); setResult(null);
    try {
      const res = await api.post('/admin/broadcast', { message });
      setResult(res.data); setMessage('');
      alert(`Отправлено ${res.data.sent} пользователям. Ошибок: ${res.data.failed}`);
    } catch (e) { alert(e.response?.data?.error || 'Ошибка рассылки'); }
    finally { setSending(false); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Сообщение для рассылки</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} placeholder="Введите сообщение, которое будет отправлено всем участникам..."
            className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded resize-y" />
          <p className="text-xs text-white/60 mt-2">Сообщение будет отправлено всем пользователям, не снявшимся с соревнований</p>
        </div>
        <button onClick={handleSend} disabled={sending || !message.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded disabled:opacity-50">
          {sending ? <><span className="animate-spin">⏳</span> Отправка...</> : <><PaperPlaneIcon size={18} /> Отправить всем участникам</>}
        </button>
        {result && (
          <div className="glass rounded-lg p-4 border border-terminal-blue">
            <p className="text-white/90 mb-1">Результат рассылки:</p>
            <p className="text-sm text-white/70">Отправлено: {result.sent} · Ошибок: {result.failed} · Всего: {result.total}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBroadcast;
