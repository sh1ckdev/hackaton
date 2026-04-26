import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { fmtTime, fmtDayLabel, isDifferentDay } from '../utils/dateUtils';

const SupportChat = ({ onClose, isPage = false }) => {
  const [messages, setMessages] = useState([]);
  const [ticketId, setTicketId] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = async (silent = false) => {
    try {
      const res = await api.get('/support/ticket');
      setTicketId(res.data.ticket.id);
      setMessages(res.data.messages);
      if (!silent) setLoading(false);
    } catch (e) {
      if (!silent) {
        setError('Не удалось загрузить историю');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMessages();
    
    pollRef.current = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post('/support/message', { text: text.trim() });
      setMessages(prev => [...prev, res.data.message]);
      setText('');
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  
  const TZ = 'Europe/Moscow';
  const toDayKey = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));

  const grouped = messages.reduce((acc, msg) => {
    const day = toDayKey(msg.created_at);
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div className={`support-overlay${isPage ? ' support-overlay-page' : ''}`} onClick={isPage ? undefined : onClose}>
      <div className="support-chat" onClick={e => e.stopPropagation()}>
        <div className="support-chat-header">
          {}
          <button className="support-chat-back" onClick={onClose} aria-label="Назад">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div className="support-chat-header-info">
            <div className="support-chat-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <div>
              <div className="support-chat-name">Поддержка</div>
              <div className="support-chat-status">
                {ticketId ? `Тикет #${ticketId}` : 'Загрузка...'}
              </div>
            </div>
          </div>
          <button className="support-chat-close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <div className="support-chat-body">
          {loading ? (
            <div className="support-chat-loading">
              <span className="login-dot"></span>
              <span className="login-dot delay-1"></span>
              <span className="login-dot delay-2"></span>
            </div>
          ) : messages.length === 0 ? (
            <div className="support-chat-empty">
              <div className="support-chat-empty-icon">💬</div>
              <div>Опишите вашу проблему — мы ответим как можно скорее</div>
            </div>
          ) : (
            Object.entries(grouped).map(([day, dayMsgs]) => (
              <div key={day}>
                <div className="support-chat-day-divider">
                  <span>{fmtDayLabel(dayMsgs[0].created_at)}</span>
                </div>
                {dayMsgs.map(msg => (
                  <div
                    key={msg.id}
                    className={`support-chat-message ${msg.sender === 'user' ? 'support-msg-user' : 'support-msg-admin'}`}
                  >
                    <div className="support-msg-bubble">
                      <div className="support-msg-text">{msg.text}</div>
                      <div className="support-msg-time">{fmtTime(msg.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="support-chat-error">{error}</div>}

        <div className="support-chat-footer">
          <textarea
            className="support-chat-input"
            placeholder="Напишите сообщение..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            maxLength={2000}
            disabled={sending}
            inputMode="text"
            enterKeyHint="send"
          />
          <button
            className="support-chat-send"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            aria-label="Отправить"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportChat;
