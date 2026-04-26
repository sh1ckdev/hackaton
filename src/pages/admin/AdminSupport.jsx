import { useEffect, useRef, useState, useCallback } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';
import { PaperPlaneIcon } from '../../components/Icons';
import { fmtChatTime, fmtDayLabel, isDifferentDay } from '../../utils/dateUtils';

const POLL_INTERVAL = 5000;

const Avatar = ({ user, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const letter = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase();
  if (user?.photo_url) return <img src={user.photo_url} alt="" className={`${sz} rounded-full object-cover border border-terminal-gray/40 shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-terminal-blue/20 border border-terminal-blue/30 flex items-center justify-center font-semibold text-terminal-blue shrink-0`}>
      {letter}
    </div>
  );
};

const AdminSupport = () => {
  useDocumentTitle('Поддержка — Админ');

  const [chats, setChats] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const pollRef = useRef(null);

  
  const fetchChats = useCallback(async () => {
    try {
      const res = await api.get('/admin/support/chats', {
        params: { status: statusFilter, search },
      });
      setChats(res.data.chats);
    } catch {}
  }, [statusFilter, search]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  
  useEffect(() => {
    const id = setInterval(fetchChats, 10000);
    return () => clearInterval(id);
  }, [fetchChats]);

  
  const fetchMessages = useCallback(async (ticketId, silent = false) => {
    if (!ticketId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/admin/support/chats/${ticketId}/messages`);
      setMessages(res.data.messages);
      setTicketInfo(res.data.ticket);
    } catch {}
    finally { if (!silent) setLoadingMessages(false); }
  }, []);

  
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeChat) return;
    fetchMessages(activeChat.ticket_id);
    pollRef.current = setInterval(() => fetchMessages(activeChat.ticket_id, true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [activeChat, fetchMessages]);

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  
  const handleSend = async () => {
    if (!reply.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/admin/support/chats/${activeChat.ticket_id}/reply`, { text: reply.trim() });
      setMessages(prev => [...prev, res.data.message]);
      setReply('');
      fetchChats();
    } catch (e) { alert(e.response?.data?.error || 'Ошибка отправки'); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  
  const toggleStatus = async () => {
    if (!activeChat) return;
    const newStatus = ticketInfo?.status === 'open' ? 'closed' : 'open';
    try {
      await api.put(`/admin/support/chats/${activeChat.ticket_id}/status`, { status: newStatus });
      setTicketInfo(t => t ? { ...t, status: newStatus } : t);
      fetchChats();
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  const handleDelete = async () => {
    if (!activeChat || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/support/chats/${activeChat.ticket_id}`);
      setShowDeleteConfirm(false);
      setActiveChat(null);
      setMessages([]);
      setTicketInfo(null);
      fetchChats();
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const openChat = (chat) => {
    setActiveChat(chat);
    setMessages([]);
    setReply('');
    setShowDeleteConfirm(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const userName = (chat) => [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || `User #${chat.user_id}`;

  return (
    <div className="admin-support-shell">
      {}
      <div className="admin-support-list">
        {}
        <div className="admin-support-list-header">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск пользователя..."
            className="admin-support-search"
          />
          <div className="admin-support-filter-tabs">
            {[['open', 'Открытые'], ['closed', 'Закрытые'], ['all', 'Все']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`admin-support-filter-tab${statusFilter === val ? ' active' : ''}`}
              >
                {label}
                {val === 'open' && chats.filter(c => Number(c.unread_count) > 0).length > 0 && statusFilter !== 'open' && (
                  <span className="admin-nav-badge ml-1">{chats.filter(c => Number(c.unread_count) > 0).length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="admin-support-chat-list">
          {chats.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">Чатов нет</div>
          )}
          {chats.map(chat => {
            const isActive = activeChat?.ticket_id === chat.ticket_id;
            const unread = Number(chat.unread_count) > 0;
            return (
              <button
                key={chat.ticket_id}
                onClick={() => openChat(chat)}
                className={`admin-support-chat-item${isActive ? ' active' : ''}${unread ? ' unread' : ''}`}
              >
                <Avatar user={chat} size="md" />
                <div className="admin-support-chat-item-body">
                  <div className="admin-support-chat-item-name">
                    {userName(chat)}
                    {chat.username && <span className="text-terminal-cyan/70 text-xs font-normal ml-1">@{chat.username}</span>}
                  </div>
                  <div className="admin-support-chat-item-preview">
                    {chat.last_sender === 'admin' && <span className="text-terminal-blue/70">Вы: </span>}
                    {chat.last_message || <span className="text-white/30 italic">нет сообщений</span>}
                  </div>
                </div>
                <div className="admin-support-chat-item-meta">
                  <span className="admin-support-chat-item-time">{fmtChatTime(chat.last_message_at)}</span>
                  {unread && <span className="admin-support-unread-dot" />}
                  {chat.status === 'closed' && <span className="text-white/30 text-xs">закрыт</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {}
      <div className="admin-support-chat">
        {!activeChat ? (
          <div className="admin-support-chat-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20 mb-4">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p className="text-white/30 text-sm">Выберите чат из списка слева</p>
          </div>
        ) : (
          <>
            {}
            <div className="admin-support-chat-header">
              <Avatar user={activeChat} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{userName(activeChat)}</div>
                <div className="text-xs text-white/50 flex items-center gap-2">
                  {activeChat.username && <a href={`https://t.me/${activeChat.username}`} target="_blank" rel="noreferrer" className="text-terminal-cyan hover:underline">@{activeChat.username}</a>}
                  <span>· Тикет #{activeChat.ticket_id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs border ${ticketInfo?.status === 'closed' ? 'border-white/20 text-white/30' : 'border-terminal-blue/50 text-terminal-blue'}`}>
                    {ticketInfo?.status === 'closed' ? 'закрыт' : 'открыт'}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleStatus}
                className={`px-3 py-1.5 text-xs rounded border transition-colors shrink-0 ${ticketInfo?.status === 'closed' ? 'border-terminal-blue text-terminal-blue hover:bg-terminal-blue/10' : 'border-white/30 text-white/50 hover:border-white/50'}`}
              >
                {ticketInfo?.status === 'closed' ? 'Переоткрыть' : 'Закрыть тикет'}
              </button>
              {ticketInfo?.status === 'closed' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-xs rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-colors shrink-0"
                  title="Удалить тикет"
                >
                  Удалить
                </button>
              )}
            </div>

            {}
            <div className="admin-support-messages">
              {loadingMessages ? (
                <div className="text-center py-8 text-white/30 text-sm">Загрузка...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm">Нет сообщений</div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isAdmin = msg.sender === 'admin';
                    const prevMsg = messages[i - 1];
                    const showDate = !prevMsg || isDifferentDay(prevMsg.created_at, msg.created_at);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="admin-support-date-divider">
                            {fmtDayLabel(msg.created_at)}
                          </div>
                        )}
                        <div className={`admin-support-message${isAdmin ? ' admin' : ' user'}`}>
                          {!isAdmin && <Avatar user={activeChat} size="sm" />}
                          <div className={`admin-support-bubble${isAdmin ? ' admin' : ' user'}`}>
                            <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.text}</p>
                            <span className="admin-support-bubble-time">{fmtChatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {}
            <div className="admin-support-input-area">
              {ticketInfo?.status === 'closed' ? (
                <div className="text-center text-white/30 text-sm py-2">
                  Тикет закрыт.{' '}
                  <button onClick={toggleStatus} className="text-terminal-blue hover:underline">Переоткрыть</button>
                  {' '}чтобы ответить.
                </div>
              ) : (
                <div className="admin-support-input-row">
                  <textarea
                    ref={textareaRef}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Напишите ответ... (Enter — отправить, Shift+Enter — новая строка)"
                    rows={2}
                    className="admin-support-textarea"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !reply.trim()}
                    className="admin-support-send-btn"
                  >
                    {sending
                      ? <span className="animate-spin text-base">⏳</span>
                      : <PaperPlaneIcon size={20} />
                    }
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50"
          style={{ animation: 'fade-in 0.15s ease' }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-[#0f1929] border border-white/10 rounded-2xl p-8 max-w-sm w-[90%] text-center shadow-2xl"
            style={{ animation: 'fade-in-up 0.18s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-13 h-13 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Удалить тикет #{activeChat?.ticket_id}?</h3>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              Все сообщения этого тикета будут удалены безвозвратно.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 hover:border-red-500/60 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:border-white/25 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
