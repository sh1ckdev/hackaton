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
  const [bans, setBans] = useState([]);
  const [userId, setUserId] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [eventType, setEventType] = useState('');
  const [autoRefreshSec, setAutoRefreshSec] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [banMinutes, setBanMinutes] = useState(60);
  const [banReason, setBanReason] = useState('manual_admin_ban');

  const loadTopIps = async (m = minutes) => {
    const params = { minutes: m, limit: 100 };
    if (statusFilter) params.status = Number(statusFilter);
    if (onlyErrors) params.only_errors = true;
    const res = await api.get('/admin/security/top-ips', { params });
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
    const params = { hours: h, limit: 200 };
    if (eventType) params.event_type = eventType;
    const res = await api.get('/admin/security/events', { params });
    setEvents(res.data?.events || []);
  };

  const loadBans = async () => {
    const res = await api.get('/admin/security/bans');
    setBans(res.data?.bans || []);
  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadTopIps(minutes), loadEvents(hours), loadBans()]);
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

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const sec = Math.max(5, Number(autoRefreshSec) || 15);
    const id = setInterval(() => {
      refreshAll();
    }, sec * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, autoRefreshSec, minutes, hours, statusFilter, onlyErrors, eventType]);

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

  const banSelectedIp = async (ip) => {
    if (!ip || ip === 'unknown') return;
    setError('');
    try {
      await api.post('/admin/security/ban-ip', {
        ip,
        minutes: Math.max(1, Number(banMinutes) || 60),
        reason: (banReason || 'manual_admin_ban').trim() || 'manual_admin_ban',
      });
      await loadBans();
      await loadEvents(hours);
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка блокировки IP');
    }
  };

  const unbanIp = async (ip) => {
    setError('');
    try {
      await api.post('/admin/security/unban-ip', { ip });
      await loadBans();
      await loadEvents(hours);
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка разблокировки IP');
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
        <label className="text-white/70 text-sm ml-2">Автообновление:</label>
        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
        <input
          type="number"
          min={5}
          max={300}
          value={autoRefreshSec}
          onChange={(e) => setAutoRefreshSec(Math.max(5, Math.min(300, Number(e.target.value) || 15)))}
          className="w-20 px-2 py-1 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
        />
        <span className="text-white/60 text-sm">сек</span>
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
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded text-sm"
          >
            <option value="">Все статусы</option>
            <option value="200">200</option>
            <option value="401">401</option>
            <option value="403">403</option>
            <option value="404">404</option>
            <option value="429">429</option>
            <option value="500">500</option>
          </select>
          <label className="text-white/70 text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
            Только ошибки (4xx/5xx)
          </label>
          <button
            type="button"
            onClick={() => loadTopIps(minutes).catch((e) => setError(e.response?.data?.error || 'Ошибка фильтрации top IP'))}
            className="px-3 py-2 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded text-sm"
          >
            Применить фильтр
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-terminal-gray/30">
                <th className="text-left py-2 pr-2">IP</th>
                <th className="text-left py-2 pr-2">Запросы</th>
                <th className="text-left py-2 pr-2">Ошибки 4xx/5xx</th>
                <th className="text-left py-2 pr-2">Auth req</th>
                <th className="text-left py-2">Последняя активность</th>
                <th className="text-left py-2">Действия</th>
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
                  <td className="py-2">
                    {row.ip !== 'unknown' && (
                      <button
                        type="button"
                        onClick={() => banSelectedIp(row.ip)}
                        className="px-2 py-1 text-xs border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded"
                      >
                        Бан
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {topIps.length === 0 && (
                <tr>
                  <td className="py-3 text-white/40" colSpan={6}>Данные пока отсутствуют</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-xl p-4 border border-terminal-gray/30">
        <h3 className="text-lg font-semibold text-white mb-3">Управление баном IP</h3>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <input
            type="text"
            value={selectedIp}
            onChange={(e) => setSelectedIp(e.target.value.trim())}
            placeholder="IP адрес"
            className="px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
          />
          <input
            type="number"
            min={1}
            max={43200}
            value={banMinutes}
            onChange={(e) => setBanMinutes(Math.max(1, Math.min(43200, Number(e.target.value) || 60)))}
            className="w-28 px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
          />
          <span className="text-white/60 text-sm">мин</span>
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Причина"
            className="min-w-[220px] px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded"
          />
          <button
            type="button"
            onClick={() => banSelectedIp(selectedIp)}
            className="px-4 py-2 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded"
          >
            Заблокировать IP
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {bans.map((b) => (
            <div key={b.ip} className="border border-terminal-gray/30 rounded p-2 text-sm flex flex-wrap gap-2 items-center justify-between">
              <div>
                <div className="text-white">{b.ip}</div>
                <div className="text-white/60">до {fmtDateTime(b.expires_at)} · {b.reason || '—'}</div>
              </div>
              <button
                type="button"
                onClick={() => unbanIp(b.ip)}
                className="px-3 py-1 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded"
              >
                Разбан
              </button>
            </div>
          ))}
          {bans.length === 0 && <div className="text-white/40 text-sm">Активных банов нет</div>}
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
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-3 py-2 bg-terminal-dark/60 border border-terminal-gray text-white rounded text-sm"
          >
            <option value="">Все типы событий</option>
            <option value="possible_ddos">possible_ddos</option>
            <option value="ip_auto_ban">ip_auto_ban</option>
            <option value="ip_manual_ban">ip_manual_ban</option>
            <option value="ip_manual_unban">ip_manual_unban</option>
          </select>
          <button
            type="button"
            onClick={() => loadEvents(hours).catch((e) => setError(e.response?.data?.error || 'Ошибка фильтрации событий'))}
            className="px-3 py-2 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded text-sm"
          >
            Применить фильтр
          </button>
        </div>
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

