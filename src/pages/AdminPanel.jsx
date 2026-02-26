import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

// Конвертация UTC (из API) в московское время для datetime-local
const utcToMoscowForInput = (utcStr) => {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const get = (t) => p.find(x => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};
// Значение из datetime-local (московское время) → ISO UTC для API
const moscowInputToUtc = (v) => {
  if (!v || !String(v).trim()) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return new Date(s + '+03:00').toISOString();
  return s; // уже ISO из API
};
import solutionsStore from '../stores/solutionsStore';
import casesStore from '../stores/casesStore';
import authStore from '../stores/authStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PaperPlaneIcon } from '../components/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const AdminPanel = () => {
  useDocumentTitle('Панель администратора');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamSolution, setSelectedTeamSolution] = useState(null);
  const [selectedTeamSolutionLoading, setSelectedTeamSolutionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('solutions');
  const [filters, setFilters] = useState({ status: '', case_id: '' });
  const [usersFilter, setUsersFilter] = useState({ participant_category: '' });
  const [teamsFilter, setTeamsFilter] = useState({ participant_category: '' });
  const [moderatingSolution, setModeratingSolution] = useState(null);
  const [moderationData, setModerationData] = useState({
    status: 'approved',
    admin_comment: '',
    score: 0,
  });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcastSettings, setBroadcastSettings] = useState([]);
  const [editingSetting, setEditingSetting] = useState(null);
  const [showSettingForm, setShowSettingForm] = useState(false);
  const [settingFormData, setSettingFormData] = useState({
    name: '',
    type: 'general',
    enabled: true,
    target_audience: { all: true },
    message_template: '',
    schedule_time: '',
    conditions: {},
    case_id: null,
  });
  const [availableCases, setAvailableCases] = useState([]);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [caseFormData, setCaseFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    participant_category: '',
    links: [],
    attachments: [],
  });
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [randomizingTeams, setRandomizingTeams] = useState(false);
  const MAIN_ADMIN_TELEGRAM_ID = 1046635419;
  
  // Настройки хакатона
  const [hackathonSettings, setHackathonSettings] = useState({
    timeline: []
  });
  const [editingTimelineItem, setEditingTimelineItem] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchTeams();
    solutionsStore.fetchAllSolutions();
    casesStore.fetchCases();
    if (activeTab === 'broadcast-settings') {
      fetchBroadcastSettings();
      fetchAvailableCases();
    }
    if (activeTab === 'settings') {
      fetchHackathonSettings();
    }
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'teams') {
      fetchTeams();
    }
  }, [activeTab, teamsFilter.participant_category]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, usersFilter.participant_category]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    const interval = setInterval(fetchUsers, 15000);
    return () => clearInterval(interval);
  }, [activeTab, usersFilter.participant_category]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
    }
  };

  const fetchUsers = async () => {
    try {
      const params = usersFilter.participant_category ? `?participant_category=${usersFilter.participant_category}` : '';
      const response = await api.get(`/admin/users${params}`);
      setUsers(response.data.users);
    } catch (error) {
    }
  };

  const fetchTeams = async () => {
    try {
      const params = new URLSearchParams();
      if (teamsFilter.participant_category) params.set('participant_category', teamsFilter.participant_category);
      const response = await api.get(`/teams/all${params.toString() ? '?' + params.toString() : ''}`);
      setTeams(response.data.teams);
    } catch (error) {
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics');
      setAnalytics(response.data);
    } catch (error) {
      setAnalytics(null);
    }
  };

  const statusLabels = { pending: 'Ожидает', reviewing: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено' };
  const CHART_COLORS = ['#60a5fa', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportToCSV = (data, filename, columns) => {
    // Оборачиваем каждое значение в кавычки — Excel/LibreOffice читает правильно
    const escape = (v) => {
      if (v === null || v === undefined) return '""';
      const str = String(v).replace(/"/g, '""');
      return `"${str}"`;
    };
    // Разделитель ; — стандарт для Excel в русской локали
    const sep = ';';
    const headers = columns.map(c => escape(c.label || c.key)).join(sep);
    const rows = data.map(row =>
      columns.map(c => escape(row[c.key])).join(sep)
    );
    // BOM + заголовок + строки
    const csv = '\ufeff' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportUsers = () => {
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'first_name', label: 'Имя' },
      { key: 'last_name', label: 'Фамилия' },
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Телефон' },
      { key: 'role', label: 'Роль' },
      { key: 'solutions_count', label: 'Решений' },
      { key: 'created_at', label: 'Дата регистрации' }
    ];
    exportToCSV(users, 'users', cols);
  };

  const handleExportSolutions = () => {
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Название' },
      { key: 'status', label: 'Статус' },
      { key: 'first_name', label: 'Имя' },
      { key: 'last_name', label: 'Фамилия' },
      { key: 'username', label: 'Username' },
      { key: 'case_title', label: 'Кейс' },
      { key: 'created_at', label: 'Дата' }
    ];
    exportToCSV(solutionsStore.allSolutions, 'solutions', cols);
  };

  const handleExportTeams = () => {
    const flat = [];
    teams.forEach(t => {
      t.members?.forEach(m => {
        flat.push({
          team_id: t.id,
          team_name: t.name,
          member_name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
          member_username: m.username,
          role: m.role
        });
      });
    });
    exportToCSV(flat, 'teams', [
      { key: 'team_id', label: 'ID команды' },
      { key: 'team_name', label: 'Команда' },
      { key: 'member_name', label: 'Участник' },
      { key: 'member_username', label: 'Username' },
      { key: 'role', label: 'Роль' }
    ]);
  };

  const handleRandomizeTeams = async () => {
    if (!confirm('Распределить команды по кейсам случайным образом?')) return;
    setRandomizingTeams(true);
    try {
      const response = await api.post('/admin/cases/assign-random');
      await fetchTeams();
      alert(`Кейсы назначены. Команд распределено: ${response.data.assigned}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка распределения команд');
    } finally {
      setRandomizingTeams(false);
    }
  };

  const openTeamModal = async (team) => {
    setSelectedTeam(team);
    setSelectedTeamSolution(null);
    setSelectedTeamSolutionLoading(true);
    try {
      const res = await api.get(`/admin/teams/${team.id}/solution`);
      setSelectedTeamSolution(res.data.solution || null);
    } catch {
      setSelectedTeamSolution(null);
    } finally {
      setSelectedTeamSolutionLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert('Введите сообщение для рассылки');
      return;
    }

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const response = await api.post('/admin/broadcast', { message: broadcastMessage });
      setBroadcastResult(response.data);
      setBroadcastMessage('');
      alert(`Сообщение отправлено ${response.data.sent} пользователям. Ошибок: ${response.data.failed}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при рассылке сообщений');
    } finally {
      setBroadcasting(false);
    }
  };

  const fetchBroadcastSettings = async () => {
    try {
      const response = await api.get('/admin/broadcast-settings');
      setBroadcastSettings(response.data.settings);
    } catch (error) {
      console.error('Ошибка загрузки настроек рассылок', error);
    }
  };

  const fetchAvailableCases = async () => {
    try {
      const response = await api.get('/admin/cases/list');
      setAvailableCases(response.data.cases);
    } catch (error) {
      console.error('Ошибка загрузки кейсов', error);
    }
  };

  const fetchHackathonSettings = async () => {
    try {
      const timelineRes = await api.get('/admin/settings/timeline').catch(() => ({ data: { timeline: [] } }));
      setHackathonSettings({
        timeline: timelineRes.data.timeline || []
      });
    } catch (error) {
      console.error('Ошибка загрузки настроек', error);
    }
  };

  const saveTimeline = async (item) => {
    try {
      const payload = {
        type: item.type || 'other',
        title: item.title,
        description: item.description,
        date: moscowInputToUtc(item.date) || item.date,
        date_to: item.date_to ? moscowInputToUtc(item.date_to) : null,
        show_countdown: !!item.show_countdown
      };
      if (item.id) {
        const res = await api.put(`/admin/settings/timeline/${item.id}`, payload);
        setHackathonSettings(prev => ({
          ...prev,
          timeline: prev.timeline.map(t => t.id === item.id ? res.data.timeline_item : t)
        }));
      } else {
        const res = await api.post('/admin/settings/timeline', payload);
        setHackathonSettings(prev => ({
          ...prev,
          timeline: [...prev.timeline, res.data.timeline_item].sort(
            (a, b) => new Date(a.date_to || a.date) - new Date(b.date_to || b.date)
          )
        }));
      }
      setEditingTimelineItem(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения таймлайна');
    }
  };

  const deleteTimelineItem = async (id) => {
    if (!confirm('Удалить этот пункт таймлайна?')) return;
    try {
      await api.delete(`/admin/settings/timeline/${id}`);
      setHackathonSettings(prev => ({
        ...prev,
        timeline: prev.timeline.filter(t => t.id !== id)
      }));
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleSaveSetting = async () => {
    try {
      if (editingSetting) {
        await api.put(`/admin/broadcast-settings/${editingSetting.id}`, settingFormData);
      } else {
        await api.post('/admin/broadcast-settings', settingFormData);
      }
      setShowSettingForm(false);
      setEditingSetting(null);
      setSettingFormData({
        name: '',
        type: 'general',
        enabled: true,
        target_audience: { all: true },
        message_template: '',
        schedule_time: '',
        conditions: {},
        case_id: null,
      });
      fetchBroadcastSettings();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения настройки');
    }
  };

  const handleDeleteSetting = async (id) => {
    if (!confirm('Удалить эту настройку рассылки?')) return;
    try {
      await api.delete(`/admin/broadcast-settings/${id}`);
      fetchBroadcastSettings();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка удаления настройки');
    }
  };

  const handleDeleteUser = async (user) => {
    const label = user.vk_id ? `vk.com/id${user.vk_id}` : `@${user.username || '—'}`;
    if (!confirm(`Удалить пользователя ${user.first_name || ''} ${user.last_name || ''} (${label})?`)) {
      return;
    }
    try {
      const url = user.vk_id ? `/admin/users/by-id/${user.id}` : `/admin/users/${user.telegram_id}`;
      await api.delete(url);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка удаления пользователя');
    }
  };

  const handleDeleteCase = async (caseItem) => {
    if (!confirm(`Удалить кейс "${caseItem.title}"? Это удалит связанные запланированные рассылки.`)) {
      return;
    }
    try {
      await casesStore.deleteCase(caseItem.id);
      casesStore.fetchCases();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка удаления кейса');
    }
  };

  const handleEditSetting = (setting) => {
    setEditingSetting(setting);
    setSettingFormData({
      name: setting.name,
      type: setting.type,
      enabled: setting.enabled,
      target_audience: setting.target_audience || { all: true },
      message_template: setting.message_template,
      schedule_time: setting.schedule_time ? utcToMoscowForInput(setting.schedule_time) : '',
      conditions: setting.conditions || {},
      case_id: setting.case_id || null,
    });
    setShowSettingForm(true);
  };

  const handleModerate = async () => {
    if (!moderatingSolution) return;
    try {
      await solutionsStore.moderateSolution(moderatingSolution.id, moderationData);
      setModeratingSolution(null);
      setModerationData({ status: 'approved', admin_comment: '', score: 0 });
      solutionsStore.fetchAllSolutions(filters);
    } catch (error) {
    }
  };

  const handleFilterChange = (e) => {
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
    solutionsStore.fetchAllSolutions(newFilters);
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'border-terminal-blue text-terminal-blue',
      rejected: 'border-terminal-red text-terminal-red',
      reviewing: 'border-terminal-cyan text-terminal-cyan',
      pending: 'border-terminal-gray text-terminal-gray',
    };
    const labels = {
      approved: 'Одобрено',
      rejected: 'Отклонено',
      reviewing: 'На проверке',
      pending: 'Ожидает',
    };
    return (
      <span className={`px-2 py-1 text-xs border ${styles[status] || styles.pending}`}>
        {labels[status] || labels.pending}
      </span>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>ПАНЕЛЬ АДМИНИСТРАТОРА</h1>
        <p>Интерфейс настройки и модерации</p>
      </div>

      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.users}</div>
            <div className="admin-stat-label">УЧАСТНИКОВ</div>
            <div className="admin-stat-sub">
              (студентов: {stats.participants_students ?? 0} · школьников: {stats.participants_school ?? 0})
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.cases}</div>
            <div className="admin-stat-label">КЕЙСОВ</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.solutions}</div>
            <div className="admin-stat-label">РЕШЕНИЙ</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.solutionsByStatus?.pending || 0}</div>
            <div className="admin-stat-label">ОЖИДАЮТ</div>
          </div>
        </div>
      )}

      <div className="admin-content">
        <div className="admin-nav">
          <nav className="admin-nav-tabs">
            <button
              onClick={() => setActiveTab('solutions')}
              className={`admin-nav-tab ${activeTab === 'solutions' ? 'active' : ''}`}
            >
              Решения
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            >
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`admin-nav-tab ${activeTab === 'teams' ? 'active' : ''}`}
            >
              Команды
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`admin-nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            >
              Аналитика
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`admin-nav-tab ${activeTab === 'cases' ? 'active' : ''}`}
            >
              Кейсы
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`admin-nav-tab ${activeTab === 'broadcast' ? 'active' : ''}`}
            >
              Рассылка
            </button>
            <button
              onClick={() => setActiveTab('broadcast-settings')}
              className={`admin-nav-tab ${activeTab === 'broadcast-settings' ? 'active' : ''}`}
            >
              Настройки рассылок
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setSettingsSubTab('timeline');
              }}
              className={`admin-nav-tab ${activeTab === 'settings' || activeTab.startsWith('settings-') ? 'active' : ''}`}
            >
              Настройки хакатона
            </button>
          </nav>
        </div>

        {activeTab === 'solutions' && (
          <div className="p-6">
            <div className="mb-4 flex gap-4">
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
              >
                <option value="">Все статусы</option>
                <option value="pending">Ожидает</option>
                <option value="reviewing">На проверке</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
              </select>
              <select
                name="case_id"
                value={filters.case_id}
                onChange={handleFilterChange}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
              >
                <option value="">Все кейсы</option>
                {casesStore.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {solutionsStore.allSolutions.map((solution, index) => (
                <div
                  key={solution.id}
                  className="border border-terminal-gray hover:border-terminal-blue transition-all duration-300 p-4 bg-terminal-dark transform hover:scale-[1.01] hover:shadow-lg hover:shadow-terminal-blue/10 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                    <div className="flex items-start justify-between mb-2 border-b border-terminal-gray/60 pb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">
                        {solution.title}
                      </h3>
                      <p className="text-sm text-white/70">
                        Пользователь: {solution.first_name} {solution.last_name} ({solution.username ? (
                        <a href={`https://t.me/${solution.username}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">@{solution.username}</a>
                      ) : '—'}) | Кейс: {solution.case_title}
                      </p>
                    </div>
                    {getStatusBadge(solution.status)}
                  </div>
                  {solution.description && (
                    <p className="text-sm text-white/70 mb-2">{solution.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-white/70 mb-2">
                    {solution.github_url && (
                      <a
                        href={solution.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-cyan hover:text-white transition-colors"
                      >
                        GitHub
                      </a>
                    )}
                    {solution.presentation_file_path && (
                      <a
                        href={solution.presentation_file_path.startsWith('http') ? solution.presentation_file_path : `/uploads/${solution.presentation_file_path.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-cyan hover:text-white transition-colors"
                      >
                        Презентация
                      </a>
                    )}
                    {solution.demo_url && (
                      <a
                        href={solution.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-cyan hover:text-white transition-colors"
                      >
                        Демо
                      </a>
                    )}
                  </div>
                  {solution.admin_comment && (
                    <p className="text-sm text-white/70 mb-2 border-l-2 border-terminal-gray/60 pl-3">
                      Комментарий: {solution.admin_comment}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModeratingSolution(solution)}
                      className="px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all duration-300 text-sm font-medium rounded transform hover:scale-105 shadow-md hover:shadow-terminal-blue/30"
                    >
                      Модерировать →
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Удалить решение «${solution.title}»?`)) return;
                        try {
                          await solutionsStore.deleteSolution(solution.id);
                          solutionsStore.fetchAllSolutions(filters);
                        } catch (e) {
                          alert(e.response?.data?.error || 'Ошибка удаления');
                        }
                      }}
                      className="px-4 py-2 bg-terminal-dark/40 border border-red-500/60 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all duration-300 text-sm font-medium rounded"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-6">
            <div className="mb-4 flex flex-wrap gap-4 items-center">
              <label className="text-white/70 text-sm">Категория:</label>
              <select
                value={usersFilter.participant_category}
                onChange={(e) => setUsersFilter({ participant_category: e.target.value })}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
              >
                <option value="">Все</option>
                <option value="student">Студенты</option>
                <option value="school">Школьники</option>
              </select>
            </div>
            <div className="space-y-4">
              {users.map((user) => {
                const isMainAdmin = user.telegram_id && Number(user.telegram_id) === MAIN_ADMIN_TELEGRAM_ID;
                const isUserOnline = user.last_activity_at && (Date.now() - new Date(user.last_activity_at).getTime()) < 120 * 1000;
                
                return (
                  <div
                    key={user.id}
                    className={`border transition-all p-4 flex items-center justify-between bg-terminal-dark cursor-pointer ${
                      isMainAdmin 
                        ? 'border-terminal-blue/50 hover:border-terminal-blue' 
                        : 'border-terminal-gray hover:border-terminal-blue'
                    }`}
                  >
                    <div className="flex-1" onClick={() => setSelectedUser(user)}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-terminal-blue">
                          {user.first_name} {user.last_name} ({user.vk_id ? (
                            <a href={`https://vk.com/id${user.vk_id}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline" onClick={(e) => e.stopPropagation()}>vk.com/id{user.vk_id}</a>
                          ) : user.username ? (
                            <a href={`https://t.me/${user.username}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline" onClick={(e) => e.stopPropagation()}>@{user.username}</a>
                          ) : '—'})
                        </p>
                        {isMainAdmin && (
                          <span className="px-2 py-0.5 text-xs rounded border border-terminal-blue/50 text-terminal-blue bg-terminal-blue/10">
                            Главный админ
                          </span>
                        )}
                        {user.participant_category === 'student' && (
                          <span className="px-2 py-0.5 text-xs rounded border border-terminal-cyan/50 text-terminal-cyan bg-terminal-cyan/10">
                            Студент
                          </span>
                        )}
                        {user.participant_category === 'school' && (
                          <span className="px-2 py-0.5 text-xs rounded border border-terminal-purple/50 text-terminal-purple bg-terminal-purple/10">
                            Школьник
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/70">
                        Решений: {user.solutions_count} | Роль: {
                          user.role === 'admin' ? 'Администратор' :
                          user.role === 'moderator' ? 'Модератор' : 'Пользователь'
                        }
                        {isUserOnline && (
                          <>
                            {' | '}
                            <span className="text-terminal-blue inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-terminal-blue"></span>
                              Онлайн
                            </span>
                          </>
                        )}
                      </p>
                      {(() => {
                        const skills = user.skills && Array.isArray(user.skills) ? user.skills : [];
                        const langs = skills.filter(s => s.type === 'language').map(s => `${s.name}${s.extension ? '.' + s.extension : ''}`).join(', ');
                        const fws = skills.filter(s => s.type === 'framework').map(s => s.name).join(', ');
                        const parts = [];
                        if (langs) parts.push(`Языки: ${langs}`);
                        if (fws) parts.push(`Фреймворки: ${fws}`);
                        const skillsStr = parts.join(' | ');
                        return skillsStr ? <p className="text-sm text-white/60 mt-1">{skillsStr}</p> : null;
                      })()}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {user.role !== 'admin' && (
                        <button
                          onClick={async () => {
                            try {
                              const newRole = user.role === 'moderator' ? 'user' : 'moderator';
                              const url = user.vk_id ? `/admin/users/by-id/${user.id}/role` : `/admin/users/${user.telegram_id}/role`;
                              const response = await api.put(url, { role: newRole });
                              if (response.data && response.data.user) {
                                fetchUsers();
                              } else {
                                throw new Error('Неожиданный ответ от сервера');
                              }
                            } catch (error) {
                              const errorMessage = error.response?.data?.error || error.message || 'Ошибка изменения роли';
                              alert(errorMessage);
                            }
                          }}
                          className={`px-4 py-2 bg-terminal-dark/40 border text-sm font-medium rounded transition-all ${
                            user.role === 'moderator'
                              ? 'border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg'
                              : 'border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg'
                          }`}
                        >
                          {user.role === 'moderator' ? 'Убрать модератора' : 'Назначить модератором'}
                        </button>
                      )}
                      {user.role === 'admin' ? (
                        !isMainAdmin ? (
                          <button
                            onClick={async () => {
                              if (!confirm('Вы уверены, что хотите снять права администратора у этого пользователя?')) {
                                return;
                              }
                            try {
                              const url = user.vk_id ? `/admin/users/by-id/${user.id}/role` : `/admin/users/${user.telegram_id}/role`;
                              await api.put(url, { role: 'user' });
                                fetchUsers();
                              } catch (error) {
                                alert(error.response?.data?.error || 'Ошибка изменения роли');
                              }
                            }}
                            className="px-4 py-2 bg-terminal-dark/40 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all text-sm font-medium rounded"
                          >
                            Снять админа
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray/30 text-terminal-gray/50 cursor-not-allowed text-sm font-medium rounded"
                            title="Нельзя снять роль у главного администратора"
                          >
                            Снять админа
                          </button>
                        )
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              const url = user.vk_id ? `/admin/users/by-id/${user.id}/role` : `/admin/users/${user.telegram_id}/role`;
                              await api.put(url, { role: 'admin' });
                              fetchUsers();
                            } catch (error) {
                              alert(error.response?.data?.error || 'Ошибка изменения роли');
                            }
                          }}
                          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all text-sm font-medium rounded"
                        >
                          Сделать админом
                        </button>
                      )}
                      {authStore.isAdmin && !isMainAdmin && authStore.user?.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all text-sm font-medium rounded"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
            <div className="glass rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">
                Информация о пользователе
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-terminal-gray/30">
                  {selectedUser.photo_url ? (
                    <img src={selectedUser.photo_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-terminal-blue/50" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-terminal-gray/40 flex items-center justify-center text-2xl font-bold text-terminal-blue">
                      {(selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-lg flex items-center gap-2">
                      {selectedUser.first_name} {selectedUser.last_name}
                      {selectedUser.last_activity_at && (Date.now() - new Date(selectedUser.last_activity_at).getTime()) < 120 * 1000 && (
                        <span className="text-terminal-blue text-sm font-normal inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-terminal-blue"></span>
                          Онлайн
                        </span>
                      )}
                    </p>
                    <p className="text-terminal-cyan">
                      {selectedUser.vk_id ? (
                        <a href={`https://vk.com/id${selectedUser.vk_id}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">vk.com/id{selectedUser.vk_id}</a>
                      ) : selectedUser.username ? (
                        <a href={`https://t.me/${selectedUser.username}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">@{selectedUser.username}</a>
                      ) : '—'}
                    </p>
                    <p className="text-sm text-white/60 mt-1">ID: {selectedUser.vk_id ? `vk.com/id${selectedUser.vk_id}` : selectedUser.telegram_id}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Имя:</span>
                    <span className="text-white">{selectedUser.first_name || '—'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Фамилия:</span>
                    <span className="text-white">{selectedUser.last_name || '—'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Username:</span>
                    <span className="text-white">{selectedUser.vk_id ? (
                      <a href={`https://vk.com/id${selectedUser.vk_id}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">vk.com/id{selectedUser.vk_id}</a>
                    ) : selectedUser.username ? (
                      <a href={`https://t.me/${selectedUser.username}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">@{selectedUser.username}</a>
                    ) : '—'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Telegram ID:</span>
                    <span className="text-white">{selectedUser.telegram_id || '—'}</span>
                  </div>
                  {selectedUser.vk_id && (
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="text-white/60">VK ID:</span>
                      <a href={`https://vk.com/id${selectedUser.vk_id}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">vk.com/id{selectedUser.vk_id}</a>
                    </div>
                  )}
                  {selectedUser.email && (
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="text-white/60">Email:</span>
                      <span className="text-white">{selectedUser.email}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Телефон:</span>
                    <span className="text-white">{selectedUser.phone || '—'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Роль:</span>
                    <span className="text-white">{
                      selectedUser.role === 'admin' ? 'Администратор' :
                      selectedUser.role === 'moderator' ? 'Модератор' : 'Пользователь'
                    }</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Категория:</span>
                    <select
                      value={selectedUser.participant_category || ''}
                      onChange={async (e) => {
                        const v = e.target.value;
                        const cat = v === 'student' || v === 'school' ? v : null;
                        try {
                          const res = await api.put(`/admin/users/by-id/${selectedUser.id}/participant-category`, { participant_category: cat });
                          fetchUsers();
                          setSelectedUser(u => u && u.id === selectedUser.id ? { ...u, participant_category: res.data.user.participant_category } : u);
                        } catch (err) {
                          alert(err.response?.data?.error || 'Ошибка изменения');
                        }
                      }}
                      className="w-full max-w-[200px] px-3 py-1.5 bg-terminal-dark/60 border border-terminal-gray text-white rounded text-sm"
                    >
                      <option value="">Не выбрано</option>
                      <option value="student">Студент</option>
                      <option value="school">Школьник</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Решений:</span>
                    <span className="text-white">{selectedUser.solutions_count || 0}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <span className="text-white/60">Зарегистрирован:</span>
                    <span className="text-white">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('ru-RU') : '—'}</span>
                  </div>
                </div>
                {selectedUser.bio && (
                  <div>
                    <p className="text-white/60 text-sm mb-1">Описание:</p>
                    <p className="text-white text-sm bg-terminal-dark/40 p-3 rounded">{selectedUser.bio}</p>
                  </div>
                )}
                {selectedUser.skills && Array.isArray(selectedUser.skills) && selectedUser.skills.length > 0 && (
                  <div>
                    <p className="text-white/60 text-sm mb-1">Навыки:</p>
                    {(() => {
                      const langs = selectedUser.skills.filter(s => s.type === 'language');
                      const fws = selectedUser.skills.filter(s => s.type === 'framework');
                      return (
                        <div className="space-y-2">
                          {langs.length > 0 && (
                            <div>
                              <p className="text-white/50 text-xs mb-1">Языки:</p>
                              <div className="flex flex-wrap gap-2">
                                {langs.map((s, i) => (
                                  <span key={i} className="px-2 py-1 bg-terminal-blue/20 text-terminal-blue text-xs rounded">
                                    {s.name}{s.extension ? `.${s.extension}` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {fws.length > 0 && (
                            <div>
                              <p className="text-white/50 text-xs mb-1">Фреймворки:</p>
                              <div className="flex flex-wrap gap-2">
                                {fws.map((s, i) => (
                                  <span key={i} className="px-2 py-1 bg-terminal-cyan/20 text-terminal-cyan text-xs rounded">
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-terminal-gray/30">
                  {selectedUser.role !== 'admin' && (
                    <button
                      onClick={async () => {
                        try {
                          const newRole = selectedUser.role === 'moderator' ? 'user' : 'moderator';
                          const roleUrl = selectedUser.vk_id ? `/admin/users/by-id/${selectedUser.id}/role` : `/admin/users/${selectedUser.telegram_id}/role`;
                          await api.put(roleUrl, { role: newRole });
                          fetchUsers();
                          setSelectedUser(u => u && u.id === selectedUser.id ? { ...u, role: newRole } : u);
                        } catch (e) {
                          alert(e.response?.data?.error || 'Ошибка');
                        }
                      }}
                      className="px-3 py-1.5 text-sm border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded transition-colors"
                    >
                      {selectedUser.role === 'moderator' ? 'Убрать модератора' : 'Назначить модератором'}
                    </button>
                  )}
                  {selectedUser.role === 'admin' ? (
                    !(selectedUser.telegram_id && Number(selectedUser.telegram_id) === MAIN_ADMIN_TELEGRAM_ID) && (
                      <button
                        onClick={async () => {
                          if (!confirm('Снять права администратора?')) return;
                          try {
                            const roleUrl2 = selectedUser.vk_id ? `/admin/users/by-id/${selectedUser.id}/role` : `/admin/users/${selectedUser.telegram_id}/role`;
                            await api.put(roleUrl2, { role: 'user' });
                            fetchUsers();
                            setSelectedUser(null);
                          } catch (e) {
                            alert(e.response?.data?.error || 'Ошибка');
                          }
                        }}
                        className="px-3 py-1.5 text-sm border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors"
                      >
                        Снять админа
                      </button>
                    )
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const roleUrl3 = selectedUser.vk_id ? `/admin/users/by-id/${selectedUser.id}/role` : `/admin/users/${selectedUser.telegram_id}/role`;
                          await api.put(roleUrl3, { role: 'admin' });
                          fetchUsers();
                          setSelectedUser(u => u && u.id === selectedUser.id ? { ...u, role: 'admin' } : u);
                        } catch (e) {
                          alert(e.response?.data?.error || 'Ошибка');
                        }
                      }}
                      className="px-3 py-1.5 text-sm border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded transition-colors"
                    >
                      Сделать админом
                    </button>
                  )}
                  {authStore.isAdmin && authStore.user?.id !== selectedUser.id && !(selectedUser.telegram_id && Number(selectedUser.telegram_id) === MAIN_ADMIN_TELEGRAM_ID) && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Удалить пользователя ${selectedUser.first_name || ''} ${selectedUser.last_name || ''} (@${selectedUser.username || '—'})?`)) return;
                        try {
                          const deleteUrl = selectedUser.vk_id ? `/admin/users/by-id/${selectedUser.id}` : `/admin/users/${selectedUser.telegram_id}`;
                          await api.delete(deleteUrl);
                          fetchUsers();
                          setSelectedUser(null);
                        } catch (e) {
                          alert(e.response?.data?.error || 'Ошибка удаления');
                        }
                      }}
                      className="px-3 py-1.5 text-sm border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors"
                    >
                      Удалить
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-1.5 text-sm border border-terminal-gray text-white/70 hover:border-terminal-blue rounded transition-colors ml-auto"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Аналитика</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExportUsers}
                  className="px-3 py-2 text-sm border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded transition-colors"
                >
                  Выгрузить пользователей (CSV)
                </button>
                <button
                  onClick={handleExportSolutions}
                  className="px-3 py-2 text-sm border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded transition-colors"
                >
                  Выгрузить решения (CSV)
                </button>
                <button
                  onClick={handleExportTeams}
                  className="px-3 py-2 text-sm border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg rounded transition-colors"
                >
                  Выгрузить команды (CSV)
                </button>
                <button
                  onClick={fetchAnalytics}
                  className="px-3 py-2 text-sm border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded transition-colors"
                >
                  Обновить
                </button>
              </div>
            </div>

            {analytics ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass rounded-xl p-4 border border-terminal-gray/30">
                    <h3 className="text-lg font-semibold text-white mb-4">Решения по статусу</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.solutionsByStatus.map((s, i) => ({ ...s, name: statusLabels[s.name] || s.name }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {analytics.solutionsByStatus.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
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
                    <h3 className="text-lg font-semibold text-white mb-4">Регистрации пользователей по дням</h3>
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
                <div className="glass rounded-xl p-4 border border-terminal-gray/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Сводка</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
                      <p className="text-white/60 text-sm">Пользователей</p>
                      <p className="text-2xl font-bold text-terminal-blue">{stats?.users ?? '—'}</p>
                    </div>
                    <div className="p-3 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
                      <p className="text-white/60 text-sm">Решений</p>
                      <p className="text-2xl font-bold text-terminal-cyan">{stats?.solutions ?? '—'}</p>
                    </div>
                    <div className="p-3 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
                      <p className="text-white/60 text-sm">Кейсов</p>
                      <p className="text-2xl font-bold text-terminal-purple">{stats?.cases ?? '—'}</p>
                    </div>
                    <div className="p-3 bg-terminal-dark/50 rounded-lg border border-terminal-gray/20">
                      <p className="text-white/60 text-sm">Команд</p>
                      <p className="text-2xl font-bold text-terminal-blue">{teams.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/70">
                <p>Загрузка аналитики...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">Команды</h2>
                <select
                  value={teamsFilter.participant_category}
                  onChange={(e) => setTeamsFilter({ participant_category: e.target.value })}
                  className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                >
                  <option value="">Все команды</option>
                  <option value="school">Школьники</option>
                  <option value="student">Студенты</option>
                </select>
              </div>
              <button
                onClick={handleRandomizeTeams}
                disabled={randomizingTeams}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {randomizingTeams ? 'Распределение...' : 'Рандомизировать кейсы'}
              </button>
            </div>

            {/* Таблица команд */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-gray/40 text-white/50 text-left">
                    <th className="pb-3 pr-4 font-medium">Команда</th>
                    <th className="pb-3 pr-4 font-medium">Категория</th>
                    <th className="pb-3 pr-4 font-medium">Код</th>
                    <th className="pb-3 pr-4 font-medium">Участников</th>
                    <th className="pb-3 pr-4 font-medium">Кейс</th>
                    <th className="pb-3 font-medium">Создана</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-gray/20">
                  {teams.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-white/50">Команды не найдены</td></tr>
                  ) : teams.map((team) => (
                    <tr
                      key={team.id}
                      className="hover:bg-terminal-blue/5 cursor-pointer transition-colors"
                      onClick={() => openTeamModal(team)}
                    >
                      <td className="py-3 pr-4">
                        <span className="font-medium text-terminal-blue hover:text-terminal-cyan transition-colors">
                          {team.name}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {team.participant_category ? (
                          <span className={`px-2 py-0.5 text-xs rounded border ${
                            team.participant_category === 'school'
                              ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                              : 'border-terminal-blue/50 text-terminal-cyan bg-terminal-blue/10'
                          }`}>
                            {team.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                          </span>
                        ) : <span className="text-white/30">—</span>}
                      </td>
                      <td className="py-3 pr-4 font-mono text-white/70">{team.team_code || team.code}</td>
                      <td className="py-3 pr-4 text-white/70">{team.members_count}</td>
                      <td className="py-3 pr-4 text-white/70">{team.assigned_case_title || <span className="text-white/30">не назначен</span>}</td>
                      <td className="py-3 text-white/50">{new Date(team.created_at).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Модальное окно команды */}
        {selectedTeam && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTeam(null)}>
            <div className="glass rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Шапка */}
              <div className="flex items-center justify-between p-6 border-b border-terminal-gray/40">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-semibold text-white">{selectedTeam.name}</h2>
                    {selectedTeam.participant_category && (
                      <span className={`px-2 py-0.5 text-xs rounded border ${
                        selectedTeam.participant_category === 'school'
                          ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                          : 'border-terminal-blue/50 text-terminal-cyan bg-terminal-blue/10'
                      }`}>
                        {selectedTeam.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50">
                    Код: <span className="font-mono text-white/70">{selectedTeam.team_code || selectedTeam.code}</span>
                    {' · '}Создана: {new Date(selectedTeam.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <button onClick={() => setSelectedTeam(null)} className="text-white/40 hover:text-white/80 transition-colors text-2xl leading-none">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Кейс */}
                <div>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Назначенный кейс</h3>
                  <p className="text-white/90">{selectedTeam.assigned_case_title || <span className="text-white/30 italic">Кейс не назначен</span>}</p>
                </div>

                {/* Участники */}
                <div>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                    Участники ({selectedTeam.members?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {selectedTeam.members && selectedTeam.members.length > 0 ? selectedTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 bg-terminal-dark/40 border border-terminal-gray/30 rounded-lg p-3">
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray/50 shrink-0">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt="аватар" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/50 text-sm font-semibold">
                              {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 font-medium text-sm">
                            {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.username || 'Участник'}
                            {member.role === 'captain' && (
                              <span className="ml-2 text-xs text-amber-400 border border-amber-500/40 rounded px-1.5 py-0.5">Капитан</span>
                            )}
                          </div>
                          <div className="text-white/40 text-xs">
                            {member.username ? (
                              <a href={`https://t.me/${member.username}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">@{member.username}</a>
                            ) : '—'}
                            {member.participant_category && ` · ${member.participant_category === 'school' ? 'Школьник' : 'Студент'}`}
                          </div>
                        </div>
                      </div>
                    )) : <p className="text-white/40 text-sm">Нет участников</p>}
                  </div>
                </div>

                {/* Решение */}
                <div>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Решение</h3>
                  {selectedTeamSolutionLoading ? (
                    <p className="text-white/40 text-sm">Загрузка...</p>
                  ) : selectedTeamSolution ? (
                    <div className="bg-terminal-dark/40 border border-terminal-gray/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs rounded border ${
                          selectedTeamSolution.status === 'approved' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                          selectedTeamSolution.status === 'rejected' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                          selectedTeamSolution.status === 'reviewing' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
                          'border-terminal-gray text-white/50 bg-transparent'
                        }`}>
                          {statusLabels[selectedTeamSolution.status] || selectedTeamSolution.status}
                        </span>
                        <span className="text-xs text-white/30 ml-auto">
                          {new Date(selectedTeamSolution.submitted_at || selectedTeamSolution.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      {selectedTeamSolution.admin_comment && (
                        <p className="text-sm text-white/60 border-l-2 border-terminal-blue/40 pl-3">{selectedTeamSolution.admin_comment}</p>
                      )}
                      {selectedTeamSolution.presentation_file_path && (
                        <a
                          href={selectedTeamSolution.presentation_file_path.startsWith('http')
                            ? selectedTeamSolution.presentation_file_path
                            : `/uploads/${selectedTeamSolution.presentation_file_path.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-terminal-cyan hover:underline"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
                          Скачать презентацию
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-white/30 text-sm italic">Решение ещё не подано</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cases' && (
          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Управление кейсами</h2>
              <button
                onClick={() => {
                  setEditingCase(null);
                  setCaseFormData({
                    title: '',
                    description: '',
                    requirements: '',
                    participant_category: '',
                    links: [],
                    attachments: [],
                  });
                  setNewLink({ label: '', url: '' });
                  setAttachmentFiles([]);
                  setShowCaseForm(true);
                }}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded"
              >
                + Создать кейс
              </button>
            </div>

            <div className="space-y-4">
              {casesStore.cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="border border-terminal-gray hover:border-terminal-blue transition-all p-4 bg-terminal-dark"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{caseItem.title}</h3>
                      <p className="text-sm text-white/70 line-clamp-2">{caseItem.description}</p>
                      <div className="mt-2 flex gap-4 text-xs text-white/60">
                        {caseItem.participant_category && (
                          <span className={caseItem.participant_category === 'school' ? 'text-terminal-cyan' : 'text-terminal-blue'}>
                            {caseItem.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCase(caseItem);
                          setCaseFormData({
                            title: caseItem.title,
                            description: caseItem.description,
                            requirements: caseItem.requirements || '',
                            participant_category: caseItem.participant_category || '',
                            links: Array.isArray(caseItem.links) ? caseItem.links : [],
                            attachments: Array.isArray(caseItem.attachments) ? caseItem.attachments : [],
                          });
                          setShowCaseForm(true);
                        }}
                        className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all rounded"
                      >
                        Редактировать
                      </button>
                      {authStore.isAdmin && (
                        <button
                          onClick={() => handleDeleteCase(caseItem)}
                          className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-all rounded"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Сообщение для рассылки
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Введите сообщение, которое будет отправлено всем участникам соревнований..."
                  rows={8}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                />
                <p className="text-xs text-white/60 mt-2">
                  Сообщение будет отправлено всем пользователям, которые не снялись с соревнований
                </p>
              </div>
              <button
                onClick={handleBroadcast}
                disabled={broadcasting || !broadcastMessage.trim()}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {broadcasting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <PaperPlaneIcon size={18} />
                    <span>Отправить всем участникам</span>
                  </>
                )}
              </button>
              {broadcastResult && (
                <div className="glass rounded-lg p-4 border border-terminal-blue">
                  <p className="text-white/90 mb-2">Результат рассылки:</p>
                  <p className="text-sm text-white/70">
                    Отправлено: {broadcastResult.sent} | Ошибок: {broadcastResult.failed} | Всего: {broadcastResult.total}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'broadcast-settings' && (
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Настройки рассылок</h2>
              <button
                onClick={() => {
                  setEditingSetting(null);
                  setSettingFormData({
                    name: '',
                    type: 'general',
                    enabled: true,
                    target_audience: { all: true },
                    message_template: '',
                    schedule_time: '',
                    conditions: {},
                    case_id: null,
                  });
                  setShowSettingForm(true);
                }}
                className="px-4 py-2 bg-terminal-blue text-terminal-bg hover:bg-terminal-cyan transition-all font-medium rounded"
              >
                + Создать настройку
              </button>
            </div>

            <div className="space-y-4">
              {broadcastSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="border border-terminal-gray hover:border-terminal-blue transition-all p-4 bg-terminal-dark rounded"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{setting.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          setting.enabled 
                            ? 'bg-terminal-blue/20 text-terminal-blue border border-terminal-blue' 
                            : 'bg-terminal-gray/20 text-terminal-gray border border-terminal-gray'
                        }`}>
                          {setting.enabled ? 'Включено' : 'Выключено'}
                        </span>
                        <span className="px-2 py-1 text-xs rounded bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan">
                          {setting.type === 'scheduled' ? 'По расписанию' : 'Общая'}
                        </span>
                      </div>
                      {setting.case_title && (
                        <p className="text-sm text-white/70 mb-2">
                          Кейс: {setting.case_title}
                        </p>
                      )}
                      <p className="text-sm text-white/60 mb-2">
                        Шаблон: {setting.message_template.substring(0, 100)}
                        {setting.message_template.length > 100 ? '...' : ''}
                      </p>
                      {setting.target_audience && (
                        <p className="text-xs text-white/50">
                          Аудитория: {setting.target_audience.all 
                            ? 'Все пользователи' 
                            : JSON.stringify(setting.target_audience)}
                        </p>
                      )}
                      {setting.last_sent_at && (
                        <p className="text-xs text-white/50 mt-1">
                          Последняя отправка: {new Date(setting.last_sent_at).toLocaleString('ru-RU')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSetting(setting)}
                        className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all rounded"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteSetting(setting.id)}
                        className="px-3 py-1 text-sm bg-terminal-dark/40 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {broadcastSettings.length === 0 && (
                <div className="text-center py-12 text-white/60">
                  Нет настроек рассылок. Создайте первую настройку.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">
              {editingCase ? 'Редактировать кейс' : 'Создать кейс'}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData();
                  formData.append('title', caseFormData.title);
                  formData.append('description', caseFormData.description);
                  formData.append('requirements', caseFormData.requirements || '');
                  formData.append('participant_category', caseFormData.participant_category || '');
                  formData.append('links', JSON.stringify(caseFormData.links));
                  


                  let preservedIndex = 0;
                  caseFormData.attachments.forEach((att) => {
                    if (att.file) {

                      formData.append('attachments', att.file);
                    } else if (att.url) {

                      formData.append(`attachment_url_${preservedIndex}`, att.url);
                      formData.append(`attachment_name_${preservedIndex}`, att.name || '');
                      preservedIndex++;
                    }
                  });

                  if (editingCase) {
                    await casesStore.updateCase(editingCase.id, formData, true);
                  } else {
                    await casesStore.createCase(formData, true);
                  }
                  setShowCaseForm(false);
                  setEditingCase(null);
                  setNewLink({ label: '', url: '' });
                  setAttachmentFiles([]);
                  casesStore.fetchCases();
                } catch (error) {
                  alert(error.response?.data?.error || 'Ошибка сохранения кейса');
                }
              }}
              className="space-y-4"
              encType="multipart/form-data"
            >
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Название <span className="text-terminal-red">*</span>
                </label>
                <input
                  type="text"
                  value={caseFormData.title}
                  onChange={(e) => setCaseFormData({ ...caseFormData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Описание <span className="text-terminal-red">*</span>
                </label>
                <textarea
                  value={caseFormData.description}
                  onChange={(e) => setCaseFormData({ ...caseFormData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Требования
                </label>
                <textarea
                  value={caseFormData.requirements}
                  onChange={(e) => setCaseFormData({ ...caseFormData, requirements: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Категория участников
                </label>
                <select
                  value={caseFormData.participant_category}
                  onChange={(e) => setCaseFormData({ ...caseFormData, participant_category: e.target.value })}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                >
                  <option value="">Не указана</option>
                  <option value="school">Школьники</option>
                  <option value="student">Студенты</option>
                </select>
                <p className="text-xs text-white/60 mt-1">
                  Кейс будет назначаться только командам соответствующей категории
                </p>
              </div>

              {}
              <div className="border-t border-terminal-gray/30 pt-4">
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Ссылки (дополнительные материалы)
                </label>
                <div className="space-y-3 mb-3">
                  {(caseFormData.links || []).map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-terminal-dark/20 rounded border border-terminal-gray/20">
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">{link.label || 'Без названия'}</div>
                        <div className="text-gray-400 text-xs break-all">{link.url}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newLinks = caseFormData.links.filter((_, i) => i !== idx);
                          setCaseFormData({ ...caseFormData, links: newLinks });
                        }}
                        className="px-3 py-1 text-xs border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLink.label}
                    onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                    placeholder="Название ссылки"
                    className="flex-1 px-3 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded text-sm"
                  />
                  <input
                    type="url"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newLink.url.trim()) {
                        setCaseFormData({
                          ...caseFormData,
                          links: [...caseFormData.links, { label: newLink.label, url: newLink.url }]
                        });
                        setNewLink({ label: '', url: '' });
                      }
                    }}
                    className="px-4 py-2 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg rounded text-sm transition-colors"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {}
              <div className="border-t border-terminal-gray/30 pt-4">
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Файлы (дополнительные материалы)
                </label>
                <div className="space-y-3 mb-3">
                  {(caseFormData.attachments || []).map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-terminal-dark/20 rounded border border-terminal-gray/20">
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">{att.name || 'Файл'}</div>
                        {att.url && (
                          <div className="text-gray-400 text-xs break-all">{att.url}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newAttachments = caseFormData.attachments.filter((_, i) => i !== idx);
                          setCaseFormData({ ...caseFormData, attachments: newAttachments });
                        }}
                        className="px-3 py-1 text-xs border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAttachmentFiles([...attachmentFiles, ...files]);
                    const newAttachments = files.map(file => ({
                      name: file.name,
                      file: file
                    }));
                    setCaseFormData({
                      ...caseFormData,
                      attachments: [...caseFormData.attachments, ...newAttachments]
                    });
                  }}
                  multiple
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white rounded file:mr-4 file:py-1 file:px-3 file:border-0 file:text-sm file:bg-terminal-gray/40 file:text-white file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-white/60 mt-2">
                  Максимальный размер файла: 100MB. Поддерживаемые форматы: PDF, DOC, DOCX, ZIP, RAR
                </p>
              </div>

              <div className="flex gap-4 border-t border-terminal-gray pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded"
                >
                  {editingCase ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCaseForm(false);
                    setEditingCase(null);
                  }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-blue transition-all font-medium rounded"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {moderatingSolution && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">
              Модерация решения
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Статус
                </label>
                <select
                  value={moderationData.status}
                  onChange={(e) =>
                    setModerationData({ ...moderationData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                >
                  <option value="approved">Одобрено</option>
                  <option value="rejected">Отклонено</option>
                  <option value="reviewing">На проверке</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Комментарий
                </label>
                <textarea
                  value={moderationData.admin_comment}
                  onChange={(e) =>
                    setModerationData({ ...moderationData, admin_comment: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                />
              </div>
              <div className="flex gap-4 border-t border-terminal-gray pt-4">
                <button
                  onClick={handleModerate}
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setModeratingSolution(null);
                    setModerationData({ status: 'approved', admin_comment: '', score: 0 });
                  }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-blue transition-all font-medium rounded"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-terminal-gray/60 pb-2">
              {editingSetting ? 'Редактировать настройку рассылки' : 'Создать настройку рассылки'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSetting();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Название <span className="text-terminal-red">*</span>
                </label>
                <input
                  type="text"
                  value={settingFormData.name}
                  onChange={(e) => setSettingFormData({ ...settingFormData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                  placeholder="Например: Уведомление об открытии кейса"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Тип рассылки <span className="text-terminal-red">*</span>
                  </label>
                  <select
                    value={settingFormData.type}
                    onChange={(e) => setSettingFormData({ ...settingFormData, type: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                  >
                    <option value="general">Общая рассылка</option>
                    <option value="scheduled">По расписанию</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Статус
                  </label>
                  <select
                    value={settingFormData.enabled ? 'true' : 'false'}
                    onChange={(e) => setSettingFormData({ ...settingFormData, enabled: e.target.value === 'true' })}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                  >
                    <option value="true">Включено</option>
                    <option value="false">Выключено</option>
                  </select>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Шаблон сообщения <span className="text-terminal-red">*</span>
                </label>
                <textarea
                  value={settingFormData.message_template}
                  onChange={(e) => setSettingFormData({ ...settingFormData, message_template: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                  placeholder="Введите текст сообщения для рассылки..."
                />
                <p className="text-xs text-white/60 mt-1">
                  Поддерживается HTML разметка Telegram: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;code&gt;код&lt;/code&gt;
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Целевая аудитория
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-white/80">
                    <input
                      type="checkbox"
                      checked={settingFormData.target_audience?.all === true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettingFormData({ ...settingFormData, target_audience: { all: true } });
                        } else {
                          setSettingFormData({ ...settingFormData, target_audience: { all: false, roles: [], teams: [], users: [] } });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span>Все пользователи</span>
                  </label>
                  {!settingFormData.target_audience?.all && (
                    <div className="ml-6 space-y-2 text-sm text-white/70">
                      <p className="text-xs text-white/60">Выберите роли, команды или конкретных пользователей</p>
                      <div>
                        <label className="block mb-1">Роли:</label>
                        <div className="space-y-1">
                          {['user', 'moderator', 'admin'].map((role) => (
                            <label key={role} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(settingFormData.target_audience?.roles || []).includes(role)}
                                onChange={(e) => {
                                  const roles = settingFormData.target_audience?.roles || [];
                                  if (e.target.checked) {
                                    setSettingFormData({
                                      ...settingFormData,
                                      target_audience: { ...settingFormData.target_audience, roles: [...roles, role] }
                                    });
                                  } else {
                                    setSettingFormData({
                                      ...settingFormData,
                                      target_audience: { ...settingFormData.target_audience, roles: roles.filter(r => r !== role) }
                                    });
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span>{role === 'user' ? 'Пользователь' : role === 'moderator' ? 'Модератор' : 'Администратор'}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {settingFormData.type === 'scheduled' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Время отправки <span className="text-terminal-red">*</span>
                    <span className="text-white/40 font-normal ml-2">(московское время, МСК)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={settingFormData.schedule_time}
                    onChange={(e) => setSettingFormData({ ...settingFormData, schedule_time: e.target.value })}
                    required={settingFormData.type === 'scheduled'}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Укажите дату и время по Москве (UTC+3)
                  </p>
                </div>
              )}

              <div className="flex gap-4 border-t border-terminal-gray/30 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-medium rounded"
                >
                  {editingSetting ? 'Сохранить изменения' : 'Создать настройку'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingForm(false);
                    setEditingSetting(null);
                    setSettingFormData({
                      name: '',
                      type: 'general',
                      enabled: true,
                      target_audience: { all: true },
                      message_template: '',
                      schedule_time: '',
                      conditions: {},
                      case_id: null,
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-blue transition-all font-medium rounded"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="admin-settings">
          <div className="admin-settings-header">
            <h2>Настройки хакатона</h2>
            <p>Управление таймлайном событий</p>
          </div>

          <div className="admin-settings-content">
              <div className="admin-settings-section-header">
                <h3>Таймлайн событий</h3>
                <button
                  onClick={() => {
                    setEditingTimelineItem({
                      title: '',
                      description: '',
                      date: '',
                      date_to: '',
                      show_countdown: false
                    });
                  }}
                  className="admin-btn-primary"
                >
                  + Добавить событие
                </button>
              </div>
              <div className="admin-settings-list">
                {hackathonSettings.timeline.map((item, idx) => (
                  <div key={item.id || idx} className="admin-settings-item">
                    <div className="admin-settings-item-content">
                      <div className="admin-settings-item-title">{item.title}</div>
                      <div className="admin-settings-item-desc">{item.description}</div>
                      <div className="admin-settings-item-meta">
                        {item.date_to ? (
                          <span>От {item.date ? new Date(item.date).toLocaleString('ru-RU') : '—'} до {item.date_to ? new Date(item.date_to).toLocaleString('ru-RU') : '—'}</span>
                        ) : (
                          <span>Дата: {item.date ? new Date(item.date).toLocaleString('ru-RU') : 'Не указана'}</span>
                        )}
                        {item.show_countdown && <span className="admin-badge" style={{ marginLeft: 8 }}>Таймер на главной</span>}
                      </div>
                    </div>
                    <div className="admin-settings-item-actions">
                      <button
                        onClick={() => setEditingTimelineItem(item)}
                        className="admin-btn-secondary"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => deleteTimelineItem(item.id)}
                        className="admin-btn-danger"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {editingTimelineItem && (
                <div className="admin-modal">
                  <div className="admin-modal-content">
                    <h3>{editingTimelineItem.id ? 'Редактировать' : 'Создать'} событие</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      saveTimeline(editingTimelineItem);
                    }}>
                      <div className="admin-form-group">
                        <label>Название</label>
                        <input
                          type="text"
                          value={editingTimelineItem.title}
                          onChange={(e) => setEditingTimelineItem({...editingTimelineItem, title: e.target.value})}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Описание</label>
                        <textarea
                          value={editingTimelineItem.description}
                          onChange={(e) => setEditingTimelineItem({...editingTimelineItem, description: e.target.value})}
                          className="admin-input"
                          rows={3}
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Дата начала (от)</label>
                        <input
                          type="datetime-local"
                          value={utcToMoscowForInput(editingTimelineItem.date)}
                          onChange={(e) => setEditingTimelineItem({...editingTimelineItem, date: e.target.value})}
                          className="admin-input"
                        />
                        <small style={{ color: 'var(--text-muted)' }}>Московское время. Если не указано — от текущего времени</small>
                      </div>
                      <div className="admin-form-group">
                        <label>Дата окончания (до)</label>
                        <input
                          type="datetime-local"
                          value={utcToMoscowForInput(editingTimelineItem.date_to)}
                          onChange={(e) => setEditingTimelineItem({...editingTimelineItem, date_to: e.target.value})}
                          className="admin-input"
                        />
                        <small style={{ color: 'var(--text-muted)' }}>Московское время. Если указано — таймлайн покажет период «от и до»</small>
                      </div>
                      <div className="admin-form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!editingTimelineItem.show_countdown}
                            onChange={(e) => setEditingTimelineItem({...editingTimelineItem, show_countdown: e.target.checked})}
                          />
                          Использовать для таймера на главной
                        </label>
                        <small style={{ color: 'var(--text-muted)' }}>Таймер будет считать до даты окончания (до)</small>
                      </div>
                      <div className="admin-form-actions">
                        <button type="submit" className="admin-btn-primary">Сохранить</button>
                        <button
                          type="button"
                          onClick={() => setEditingTimelineItem(null)}
                          className="admin-btn-secondary"
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
};

export default observer(AdminPanel);
