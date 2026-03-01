import { useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';
import { fmtDateTime } from '../../utils/dateUtils';

const toNum = (v) => Number(v) || 0;

const AdminSecurity = () => {
  useDocumentTitle('Security — Админ');

  const [minutes, setMinutes] = useState(15);
  const [hours, setHours] = useState(24);
  const [topIps, setTopIps] = useState([]);
  const [selectedIp, setSelectedIp] = useState('');
  const [ipProfile, setIpProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTopIps = async (m = minutes) => {
    const res = await api.get('/admin/security/top-ips', { params: { minutes: m, limit: 100 } });
    const items = res.data?.items || [];
    setTopIps(items);
    if (!selectedIp && items[0]?.ip && items[0].ip !== 'unknown') {
      setSelectedIp(items[0].ip);
    }
  };

  const loadIpProfile = async (ip, h = hours) => {
    if (!ip || ip === 'unknown') {
      setIpProfile(null);
      return;
    }
    const res = await api.get('/admin/security/ip-profile', { params: { ip, hours: h } });
    setIpProfile(res.data || null);
  };

  const loadEvents = async (h = hours) => {
    const res = await api.get('/admin/security/events', { params: { hours: h, limit: 200 } });
    setEvents(res.data?.events || []);
  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadTopIps(minutes), loadEvents(hours)]);
    } catch (e) {
      setError(e.response?.data?.error || 'Не удалось загрузить security-данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadIpProfile(selectedIp, hours).catch((e) => setError(e.response?.data?.error || 'Ошибка загрузки профиля IP'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIp, hours]);

  const topStats = useMemo(() => {
    const totalReq = topIps.reduce((acc, i) => acc + toNum(i.requests), 0);
    const totalErr = topIps.reduce((acc, i) => acc + toNum(i.errors_4xx_5xx), 0);
    return { totalReq, totalErr };
  }, [topIps]);

  const loadUserProfile = async () => {
    const id = parseInt(userId, 10);
    if (Number.isNaN(id) || id <= 0) {
      setError('Введите корректный userId');
      return;
    }
    setError('');
    try {
      const res = await api.get(`/admin/security/user-profile/${id}`, { params: { hours } });
      setUserProfile(res.data || null);
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка загрузки профиля пользователя');
      setUserProfile(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-white/70 text-sm">Окно IP (мин):</label>
        <input
          type="number"
          min={1}
          max={1440}
          value={minutes}
          onChange={(e) => setMinutes(Math.max(1, Math.min(1440, Number(e.target.value) || 15)))}
          className="w-24 px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
        />
        <label className="text-white/70 text-sm">Окно профилей/событий (ч):</label>
        <input
          type="number"
          min={1}
          max={720}
          value={hours}
          onChange={(e) => setHours(Math.max(1, Math.min(720, Number(e.target.value) || 24)))}
          className="w-24 px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
        />
        <button
          onClick={refreshAll}
          disabled={loading}
          className="px-4 py-2 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded disabled:opacity-50"
        >
          {loading ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 rounded border border-terminal-red text-terminal-red bg-terminal-red/10 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
          <p className="text-white/60 text-sm">IP в выборке</p>
          <p className="text-2xl font-bold text-terminal-blue">{topIps.length}</p>
        </div>
        <div className="p-4 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
          <p className="text-white/60 text-sm">Запросов в окне</p>
          <p className="text-2xl font-bold text-terminal-blue">{topStats.totalReq}</p>
        </div>
        <div className="p-4 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
          <p className="text-white/60 text-sm">Ошибок 4xx/5xx</p>
          <p className="text-2xl font-bold text-terminal-red">{topStats.totalErr}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4 border border-terminal-gray/30">
        <h3 className="text-lg font-semibold text-white mb-3">Топ IP</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-terminal-gray/30">
                <th className="text-left py-2 pr-2">IP</th>
                <th className="text-left py-2 pr-2">Запросы</th>
                <th className="text-left py-2 pr-2">Ошибки 4xx/5xx</th>
                <th className="text-left py-2 pr-2">Auth req</th>
                <th className="text-left py-2">Последняя активность</th>
              </tr>
            </thead>
            <tbody>
              {topIps.map((row) => (
                <tr
                  key={row.ip}
                  className={`border-b border-terminal-gray/20 ${selectedIp === row.ip ? 'bg-terminal-blue/10' : ''}`}
                >
                  <td className="py-2 pr-2">
                    {row.ip !== 'unknown' ? (
                      <button
                        onClick={() => setSelectedIp(row.ip)}
                        className="text-terminal-blue hover:underline"
                        type="button"
                      >
                        {row.ip}
                      </button>
                    ) : (
                      <span className="text-white/40">unknown</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-white">{toNum(row.requests)}</td>
                  <td className="py-2 pr-2 text-terminal-red">{toNum(row.errors_4xx_5xx)}</td>
                  <td className="py-2 pr-2 text-white">{toNum(row.authed_requests)}</td>
                  <td className="py-2 text-white/80">{fmtDateTime(row.last_seen)}</td>
                </tr>
              ))}
              {topIps.length === 0 && (
                <tr>
                  <td className="py-3 text-white/40" colSpan={5}>Данные пока отсутствуют</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-4 border border-terminal-gray/30">
          <h3 className="text-lg font-semibold text-white mb-3">Профиль IP {selectedIp ? `(${selectedIp})` : ''}</h3>
          {!ipProfile ? (
            <div className="text-white/40 text-sm">Выберите IP из таблицы</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-terminal-dark/40 border border-terminal-gray/20 rounded p-3">
                  <div className="text-white/60">Запросы</div>
                  <div className="text-terminal-blue text-xl font-semibold">{toNum(ipProfile.summary?.requests)}</div>
                </div>
                <div className="bg-terminal-dark/40 border border-terminal-gray/20 rounded p-3">
                  <div className="text-white/60">Ошибки 4xx/5xx</div>
                  <div className="text-terminal-red text-xl font-semibold">{toNum(ipProfile.summary?.errors_4xx_5xx)}</div>
                </div>
              </div>

              <div>
                <div className="text-white/70 text-sm mb-2">Аккаунты с этого IP</div>
                <div className="space-y-2">
                  {(ipProfile.accounts || []).map((a) => (
                    <div key={a.user_id} className="border border-terminal-gray/30 rounded p-2 text-sm">
                      <div className="text-white">
                        userId: {a.user_id} · роль: {a.role || '—'} · username: {a.username || '—'}
                      </div>
                      <div className="text-white/60">
                        Запросов: {toNum(a.requests)} · lastSeen: {fmtDateTime(a.last_seen)}
                      </div>
                    </div>
                  ))}
                  {(ipProfile.accounts || []).length === 0 && <div className="text-white/40 text-sm">Аккаунты не найдены</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-4 border border-terminal-gray/30">
          <h3 className="text-lg font-semibold text-white mb-3">Поиск по userId</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              min={1}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Например, 42"
              className="w-40 px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
            />
            <button
              onClick={loadUserProfile}
              className="px-4 py-2 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded"
              type="button"
            >
              Найти
            </button>
          </div>
          {!userProfile ? (
            <div className="text-white/40 text-sm">Введите userId и нажмите «Найти»</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="border border-terminal-gray/30 rounded p-3">
                <div className="text-white">
                  ID: {userProfile.user?.id} · роль: {userProfile.user?.role || '—'}
                </div>
                <div className="text-white/70">
                  {userProfile.user?.first_name || ''} {userProfile.user?.last_name || ''} · {userProfile.user?.username || '—'}
                </div>
              </div>
              <div>
                <div className="text-white/70 mb-1">IP этого пользователя</div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {(userProfile.ips || []).map((ipRow) => (
                    <button
                      key={ipRow.ip}
                      type="button"
                      onClick={() => setSelectedIp(ipRow.ip)}
                      className="w-full text-left border border-terminal-gray/30 rounded p-2 hover:border-terminal-blue"
                    >
                      <div className="text-terminal-blue">{ipRow.ip}</div>
                      <div className="text-white/60">req: {toNum(ipRow.requests)} · errors: {toNum(ipRow.errors_4xx_5xx)}</div>
                    </button>
                  ))}
                  {(userProfile.ips || []).length === 0 && <div className="text-white/40">IP не найдено</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-4 border border-terminal-gray/30">
        <h3 className="text-lg font-semibold text-white mb-3">Security events</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {events.map((ev) => (
            <div key={ev.id} className="border border-terminal-gray/30 rounded p-2 text-sm">
              <div className="text-white">
                {ev.event_type} · IP: {ev.ip || '—'} · userId: {ev.user_id || '—'}
              </div>
              <div className="text-white/60">
                {fmtDateTime(ev.created_at)} · {ev.method || '—'} {ev.path || '—'}
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="text-white/40 text-sm">Событий пока нет</div>}
        </div>
      </div>
    </div>
  );
};

export default AdminSecurity;

