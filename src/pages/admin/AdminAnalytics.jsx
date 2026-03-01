import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import api from '../../utils/api';
import adminStore from '../../stores/adminStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const STATUS_LABELS = { pending: 'Ожидает', reviewing: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено' };
const COLORS = ['#60a5fa', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const exportCSV = (data, filename, columns) => {
  const esc = v => { if (v == null) return '""'; return `"${String(v).replace(/"/g, '""')}"`; };
  const sep = ';';
  const csv = '\ufeff' + [columns.map(c => esc(c.label)).join(sep), ...data.map(row => columns.map(c => esc(row[c.key])).join(sep))].join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: filename + '.csv' });
  a.click();
};

const AdminAnalytics = () => {
  useDocumentTitle('Аналитика — Админ');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const fetchAll = async () => {
    try {
      const [aRes, uRes, tRes] = await Promise.all([api.get('/admin/analytics'), api.get('/admin/users'), api.get('/teams/all')]);
      setAnalytics(aRes.data);
      setUsers((uRes.data.users || []).filter(u => !['admin', 'moderator'].includes(u.role)));
      setTeams(tRes.data.teams);
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  const stats = adminStore.stats;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <button onClick={() => exportCSV(users, 'users', [{ key: 'id', label: 'ID' }, { key: 'first_name', label: 'Имя' }, { key: 'last_name', label: 'Фамилия' }, { key: 'username', label: 'Username' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Телефон' }, { key: 'role', label: 'Роль' }, { key: 'solutions_count', label: 'Решений' }, { key: 'created_at', label: 'Дата' }])}
          className="px-3 py-2 text-sm border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded">
          Пользователи (CSV)
        </button>
        <button onClick={fetchAll} className="px-3 py-2 text-sm border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded">
          Обновить
        </button>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[['Пользователей', stats?.users], ['Решений', stats?.solutions], ['Кейсов', stats?.cases], ['Команд', teams.length]].map(([label, val]) => (
          <div key={label} className="p-4 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
            <p className="text-white/60 text-sm">{label}</p>
            <p className="text-2xl font-bold text-terminal-blue">{val ?? '—'}</p>
          </div>
        ))}
      </div>

      {analytics ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-4 border border-terminal-gray/30">
              <h3 className="text-lg font-semibold text-white mb-4">Решения по статусу</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.solutionsByStatus.map(s => ({ ...s, name: STATUS_LABELS[s.name] || s.name }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {analytics.solutionsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass rounded-xl p-4 border border-terminal-gray/30">
              <h3 className="text-lg font-semibold text-white mb-4">Решения по кейсам</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.solutionsByCase} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-4 border border-terminal-gray/30">
              <h3 className="text-lg font-semibold text-white mb-4">Регистрации по дням</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.usersByDate} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass rounded-xl p-4 border border-terminal-gray/30">
              <h3 className="text-lg font-semibold text-white mb-4">Решения по дням</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.solutionsByDate} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-white/40">Загрузка аналитики...</div>
      )}
    </div>
  );
};

export default AdminAnalytics;
