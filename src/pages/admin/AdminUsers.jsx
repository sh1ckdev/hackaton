import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import authStore from '../../stores/authStore';
import api from '../../utils/api';
import { PaperPlaneIcon } from '../../components/Icons';
import { fmtDateTime } from '../../utils/dateUtils';

const MAIN_ADMIN_TELEGRAM_ID = 1046635419;

const AdminUsers = () => {
  useDocumentTitle('Пользователи — Админ');
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState(null);

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchUsers = async (category) => {
    try {
      const params = new URLSearchParams({ include_staff: 'true' });
      if (category) params.set('participant_category', category);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.users);
    } catch {}
  };

  useEffect(() => {
    fetchUsers(filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => fetchUsers(filterRef.current), 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => { setSelected(null); setMessage(''); setMsgResult(null); };

  const changeRole = async (user, role) => {
    try {
      const url = user.vk_id ? `/admin/users/by-id/${user.id}/role` : `/admin/users/${user.telegram_id}/role`;
      await api.put(url, { role });
      fetchUsers(filterRef.current);
      if (selected?.id === user.id) setSelected(u => u ? { ...u, role } : u);
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Удалить ${user.first_name} ${user.last_name}?`)) return;
    try {
      const url = user.vk_id ? `/admin/users/by-id/${user.id}` : `/admin/users/${user.telegram_id}`;
      await api.delete(url);
      fetchUsers(filterRef.current);
      if (selected?.id === user.id) closeModal();
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <label className="text-white/70 text-sm">Категория:</label>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
          <option value="">Все</option>
          <option value="student">Студенты</option>
          <option value="school">Школьники</option>
        </select>
        <span className="text-white/40 text-sm ml-auto">{users.length} чел.</span>
      </div>

      <div className="space-y-3">
        {users.map(user => {
          const isMainAdmin = user.telegram_id && Number(user.telegram_id) === MAIN_ADMIN_TELEGRAM_ID;
          const isOnline = user.last_activity_at && (Date.now() - new Date(user.last_activity_at).getTime()) < 120000;
          return (
            <div key={user.id} className={`border transition-all p-4 bg-terminal-dark cursor-pointer rounded ${isMainAdmin ? 'border-terminal-blue/50 hover:border-terminal-blue' : 'border-terminal-gray hover:border-terminal-blue'}`}
              onClick={() => setSelected(user)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-terminal-blue">
                      {user.first_name} {user.last_name}{' '}
                      <span className="text-terminal-cyan text-sm font-normal">
                        {user.vk_id ? `vk.com/id${user.vk_id}` : user.username ? `@${user.username}` : ''}
                      </span>
                    </p>
                    {isMainAdmin && <span className="px-2 py-0.5 text-xs rounded border border-terminal-blue/50 text-terminal-blue bg-terminal-blue/10">Главный админ</span>}
                    {user.participant_category === 'student' && <span className="px-2 py-0.5 text-xs rounded border border-terminal-cyan/50 text-terminal-cyan bg-terminal-cyan/10">Студент</span>}
                    {user.participant_category === 'school' && <span className="px-2 py-0.5 text-xs rounded border border-terminal-purple/50 text-terminal-purple bg-terminal-purple/10">Школьник</span>}
                  </div>
                  <p className="text-sm text-white/70">
                    Решений: {user.solutions_count} · Роль: {user.role === 'admin' ? 'Администратор' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
                    {isOnline && <span className="text-terminal-blue ml-2 inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-terminal-blue inline-block"/> Онлайн</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно пользователя */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={closeModal}>
          <div className="glass w-full sm:rounded-xl sm:max-w-2xl rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-terminal-gray/60 pb-2">
              <h2 className="text-xl font-semibold text-white">Информация о пользователе</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              {/* Аватар */}
              <div className="flex items-center gap-4 pb-4 border-b border-terminal-gray/30">
                {selected.photo_url ? (
                  <img src={selected.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-terminal-blue/50" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-terminal-gray/40 flex items-center justify-center text-xl font-bold text-terminal-blue">
                    {(selected.first_name?.[0] || selected.username?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white text-lg">{selected.first_name} {selected.last_name}</p>
                  <p className="text-terminal-cyan text-sm">
                    {selected.vk_id ? <a href={`https://vk.com/id${selected.vk_id}`} target="_blank" rel="noreferrer" className="hover:underline">vk.com/id{selected.vk_id}</a>
                      : selected.username ? <a href={`https://t.me/${selected.username}`} target="_blank" rel="noreferrer" className="hover:underline">@{selected.username}</a> : '—'}
                  </p>
                </div>
              </div>

              {/* Поля */}
              <div className="space-y-2 text-sm">
                {[
                  ['Email', selected.email],
                  ['Телефон', selected.phone],
                  ['Telegram ID', selected.telegram_id],
                  ['Решений', selected.solutions_count || 0],
                  ['Зарегистрирован', fmtDateTime(selected.created_at)],
                ].map(([k, v]) => v ? (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-white/60">{k}:</span>
                    <span className="text-white">{v}</span>
                  </div>
                ) : null)}

                <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                  <span className="text-white/60">Категория:</span>
                  <select value={selected.participant_category || ''} onChange={async e => {
                    const cat = e.target.value || null;
                    try {
                      const res = await api.put(`/admin/users/by-id/${selected.id}/participant-category`, { participant_category: cat });
                      fetchUsers();
                      setSelected(u => u ? { ...u, participant_category: res.data.user.participant_category } : u);
                    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); }
                  }} className="max-w-[200px] px-3 py-1.5 bg-terminal-dark/60 border border-terminal-gray text-white rounded text-sm">
                    <option value="">Не выбрано</option>
                    <option value="student">Студент</option>
                    <option value="school">Школьник</option>
                  </select>
                </div>
              </div>

              {/* Кнопки ролей */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-terminal-gray/30">
                {selected.role !== 'admin' && (
                  <button onClick={() => changeRole(selected, selected.role === 'moderator' ? 'user' : 'moderator')}
                    className="px-3 py-1.5 text-sm border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded transition-colors">
                    {selected.role === 'moderator' ? 'Убрать модератора' : 'Назначить модератором'}
                  </button>
                )}
                {selected.role === 'admin'
                  ? !(selected.telegram_id && Number(selected.telegram_id) === MAIN_ADMIN_TELEGRAM_ID) && (
                    <button onClick={async () => { if (!confirm('Снять права администратора?')) return; await changeRole(selected, 'user'); closeModal(); }}
                      className="px-3 py-1.5 text-sm border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors">Снять админа</button>
                  )
                  : <button onClick={() => changeRole(selected, 'admin')}
                    className="px-3 py-1.5 text-sm border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded transition-colors">Сделать админом</button>
                }
                {authStore.isAdmin && authStore.user?.id !== selected.id && !(selected.telegram_id && Number(selected.telegram_id) === MAIN_ADMIN_TELEGRAM_ID) && (
                  <button onClick={() => deleteUser(selected)}
                    className="px-3 py-1.5 text-sm border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors">Удалить</button>
                )}
                <button onClick={closeModal} className="px-4 py-1.5 text-sm border border-terminal-gray text-white/70 hover:border-terminal-blue rounded transition-colors ml-auto">Закрыть</button>
              </div>

              {/* Сообщение через бота */}
              {selected.telegram_id && (
                <div className="pt-4 border-t border-terminal-gray/30">
                  <p className="text-white/70 text-sm mb-2 font-medium">Написать от имени бота:</p>
                  <textarea value={message} onChange={e => { setMessage(e.target.value); setMsgResult(null); }}
                    placeholder="Текст сообщения..." rows={3}
                    className="w-full px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white placeholder-white/30 focus:border-terminal-blue focus:outline-none rounded text-sm resize-none" />
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={async () => {
                      if (!message.trim()) return;
                      setMsgSending(true); setMsgResult(null);
                      try {
                        await api.post(`/admin/users/by-id/${selected.id}/message`, { message: message.trim() });
                        setMsgResult({ ok: true }); setMessage('');
                      } catch (e) { setMsgResult({ ok: false, error: e.response?.data?.error || 'Ошибка' }); }
                      finally { setMsgSending(false); }
                    }} disabled={msgSending || !message.trim()}
                      className="px-4 py-1.5 text-sm border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded transition-colors disabled:opacity-40 flex items-center gap-2">
                      <PaperPlaneIcon className="w-4 h-4" />
                      {msgSending ? 'Отправка...' : 'Отправить'}
                    </button>
                    {msgResult?.ok && <span className="text-sm text-terminal-blue">✓ Отправлено</span>}
                    {msgResult?.error && <span className="text-sm text-terminal-red">{msgResult.error}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(AdminUsers);
