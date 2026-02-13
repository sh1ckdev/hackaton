import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import solutionsStore from '../stores/solutionsStore';
import casesStore from '../stores/casesStore';
import authStore from '../stores/authStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PaperPlaneIcon } from '../components/Icons';

const AdminPanel = () => {
  useDocumentTitle('Панель администратора');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [activeTab, setActiveTab] = useState('solutions');
  const [settingsSubTab, setSettingsSubTab] = useState('timeline');
  const [filters, setFilters] = useState({ status: '', case_id: '' });
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
    schedule_cron: '',
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
    difficulty: 'medium',
    max_participants: 0,
    status: 'active',
    opens_at: '',
    links: [],
    attachments: [],
  });
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [randomizingTeams, setRandomizingTeams] = useState(false);
  const currentTelegramId = authStore.user?.telegram_id;
  
  // Настройки хакатона
  const [hackathonSettings, setHackathonSettings] = useState({
    timeline: [],
    prizes: [],
    tracks: []
  });
  const [editingTimelineItem, setEditingTimelineItem] = useState(null);
  const [editingPrize, setEditingPrize] = useState(null);
  const [editingTrack, setEditingTrack] = useState(null);

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
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'teams') {
      fetchTeams();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
    } catch (error) {
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams/all');
      setTeams(response.data.teams);
    } catch (error) {
    }
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

  const toggleTeam = (teamId) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
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
      const [timelineRes, prizesRes, tracksRes] = await Promise.all([
        api.get('/admin/settings/timeline').catch(() => ({ data: { timeline: [] } })),
        api.get('/admin/settings/prizes').catch(() => ({ data: { prizes: [] } })),
        api.get('/admin/settings/tracks').catch(() => ({ data: { tracks: [] } }))
      ]);
      setHackathonSettings({
        timeline: timelineRes.data.timeline || [],
        prizes: prizesRes.data.prizes || [],
        tracks: tracksRes.data.tracks || []
      });
    } catch (error) {
      console.error('Ошибка загрузки настроек', error);
    }
  };

  const saveTimeline = async (item) => {
    try {
      if (item.id) {
        await api.put(`/admin/settings/timeline/${item.id}`, item);
      } else {
        await api.post('/admin/settings/timeline', item);
      }
      await fetchHackathonSettings();
      setEditingTimelineItem(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения таймлайна');
    }
  };

  const savePrize = async (prize) => {
    try {
      if (prize.id) {
        await api.put(`/admin/settings/prizes/${prize.id}`, prize);
      } else {
        await api.post('/admin/settings/prizes', prize);
      }
      await fetchHackathonSettings();
      setEditingPrize(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения приза');
    }
  };

  const saveTrack = async (track) => {
    try {
      if (track.id) {
        await api.put(`/admin/settings/tracks/${track.id}`, track);
      } else {
        await api.post('/admin/settings/tracks', track);
      }
      await fetchHackathonSettings();
      setEditingTrack(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения трека');
    }
  };

  const deleteTimelineItem = async (id) => {
    if (!confirm('Удалить этот пункт таймлайна?')) return;
    try {
      await api.delete(`/admin/settings/timeline/${id}`);
      await fetchHackathonSettings();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const deletePrize = async (id) => {
    if (!confirm('Удалить этот приз?')) return;
    try {
      await api.delete(`/admin/settings/prizes/${id}`);
      await fetchHackathonSettings();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const deleteTrack = async (id) => {
    if (!confirm('Удалить этот трек?')) return;
    try {
      await api.delete(`/admin/settings/tracks/${id}`);
      await fetchHackathonSettings();
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
        schedule_cron: '',
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
    if (!confirm(`Удалить пользователя ${user.first_name || ''} ${user.last_name || ''} (@${user.username || '—'})?`)) {
      return;
    }
    try {
      await api.delete(`/admin/users/${user.telegram_id}`);
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
      schedule_cron: setting.schedule_cron || '',
      schedule_time: setting.schedule_time ? new Date(setting.schedule_time).toISOString().slice(0, 16) : '',
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
      approved: 'border-terminal-green text-terminal-green',
      rejected: 'border-terminal-red text-terminal-red',
      reviewing: 'border-terminal-cyan text-terminal-cyan',
      pending: 'border-terminal-gray text-terminal-gray',
    };
    const labels = {
      approved: 'APPROVED',
      rejected: 'REJECTED',
      reviewing: 'REVIEWING',
      pending: 'PENDING',
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
        <h1>ADMIN_PANEL</h1>
        <p>System configuration and moderation interface</p>
      </div>

      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.users}</div>
            <div className="admin-stat-label">USERS</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.cases}</div>
            <div className="admin-stat-label">CASES</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.solutions}</div>
            <div className="admin-stat-label">SOLUTIONS</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.solutionsByStatus?.pending || 0}</div>
            <div className="admin-stat-label">PENDING</div>
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
              SOLUTIONS
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            >
              USERS
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`admin-nav-tab ${activeTab === 'teams' ? 'active' : ''}`}
            >
              TEAMS
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`admin-nav-tab ${activeTab === 'cases' ? 'active' : ''}`}
            >
              CASES
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`admin-nav-tab ${activeTab === 'broadcast' ? 'active' : ''}`}
            >
              BROADCAST
            </button>
            <button
              onClick={() => setActiveTab('broadcast-settings')}
              className={`admin-nav-tab ${activeTab === 'broadcast-settings' ? 'active' : ''}`}
            >
              BROADCAST_SETTINGS
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setSettingsSubTab('timeline');
              }}
              className={`admin-nav-tab ${activeTab === 'settings' || activeTab.startsWith('settings-') ? 'active' : ''}`}
            >
              HACKATHON_CONFIG
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
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
              >
                <option value="">ALL_STATUSES</option>
                <option value="pending">PENDING</option>
                <option value="reviewing">REVIEWING</option>
                <option value="approved">APPROVED</option>
                <option value="rejected">REJECTED</option>
              </select>
              <select
                name="case_id"
                value={filters.case_id}
                onChange={handleFilterChange}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
              >
                <option value="">ALL_CASES</option>
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
                  className="border border-terminal-gray hover:border-terminal-green transition-all duration-300 p-4 bg-terminal-dark transform hover:scale-[1.01] hover:shadow-lg hover:shadow-terminal-green/10 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                    <div className="flex items-start justify-between mb-2 border-b border-terminal-gray/60 pb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">
                        {solution.title}
                      </h3>
                      <p className="text-sm text-white/70">
                        Пользователь: {solution.first_name} {solution.last_name} ({solution.username}) | Кейс: {solution.case_title}
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
                        href={`/uploads/${solution.presentation_file_path.split('/').pop()}`}
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
                    {solution.score > 0 && (
                      <span>
                        Оценка: <span className="text-white">{solution.score}</span>
                      </span>
                    )}
                  </div>
                  {solution.admin_comment && (
                    <p className="text-sm text-white/70 mb-2 border-l-2 border-terminal-gray/60 pl-3">
                      Комментарий: {solution.admin_comment}
                    </p>
                  )}
                  <button
                    onClick={() => setModeratingSolution(solution)}
                    className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all duration-300 text-sm font-medium rounded transform hover:scale-105 shadow-md hover:shadow-terminal-green/30"
                  >
                    Модерировать →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-6">
            <div className="space-y-4">
              {users.map((user) => {
                const MAIN_ADMIN_ID = 1046635419;
                const isMainAdmin = user.telegram_id && Number(user.telegram_id) === MAIN_ADMIN_ID;
                
                return (
                  <div
                    key={user.id}
                    className={`border transition-all p-4 flex items-center justify-between bg-terminal-dark ${
                      isMainAdmin 
                        ? 'border-terminal-green/50 hover:border-terminal-green' 
                        : 'border-terminal-gray hover:border-terminal-green'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-terminal-green">
                          {user.first_name} {user.last_name} ({user.username})
                        </p>
                        {isMainAdmin && (
                          <span className="px-2 py-0.5 text-xs rounded border border-terminal-green/50 text-terminal-green bg-terminal-green/10">
                            Главный админ
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/70">
                        Решений: {user.solutions_count} | Роль: {
                          user.role === 'admin' ? 'Администратор' :
                          user.role === 'moderator' ? 'Модератор' : 'Пользователь'
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {user.role !== 'admin' && (
                        <button
                          onClick={async () => {
                            try {
                              const newRole = user.role === 'moderator' ? 'user' : 'moderator';
                              const response = await api.put(`/admin/users/${user.telegram_id}/role`, { role: newRole });
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
                                await api.put(`/admin/users/${user.telegram_id}/role`, { role: 'user' });
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
                              await api.put(`/admin/users/${user.telegram_id}/role`, { role: 'admin' });
                              fetchUsers();
                            } catch (error) {
                              alert(error.response?.data?.error || 'Ошибка изменения роли');
                            }
                          }}
                          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all text-sm font-medium rounded"
                        >
                          Сделать админом
                        </button>
                      )}
                      {authStore.isAdmin && !isMainAdmin && String(currentTelegramId) !== String(user.telegram_id) && (
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

        {activeTab === 'teams' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Команды</h2>
              <button
                onClick={handleRandomizeTeams}
                disabled={randomizingTeams}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {randomizingTeams ? 'Распределение...' : 'Рандомизировать кейсы'}
              </button>
            </div>
            <div className="space-y-4">
              {teams.length === 0 ? (
                <p className="text-white/70 text-center py-8">Команды не найдены</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="border border-terminal-gray hover:border-terminal-green transition-all bg-terminal-dark"
                  >
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleTeam(team.id)}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-terminal-green">
                          {team.name}
                        </p>
                        <p className="text-sm text-white/70">
                          Код: {team.code} | Участников: {team.members_count} | Кейс: {team.assigned_case_title || 'не назначен'} | Создана: {new Date(team.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-white/70 transition-transform ${
                          expandedTeams.has(team.id) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {expandedTeams.has(team.id) && (
                      <div className="border-t border-terminal-gray p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white/80 mb-3">Участники:</h3>
                        {team.members && team.members.length > 0 ? (
                          team.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 glass rounded-lg p-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray shrink-0">
                                {member.photo_url ? (
                                  <img
                                    src={member.photo_url}
                                    alt="avatar"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-white/50 text-sm font-semibold">
                                    {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white/90 font-medium">
                                  {member.first_name || ''} {member.last_name || ''}
                                  {(!member.first_name && !member.last_name) && (member.username || 'Участник')}
                                </div>
                                <div className="text-white/60 text-sm">
                                  @{member.username || '—'} · {member.role === 'captain' ? 'Капитан' : 'Участник'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-white/60 text-sm">Нет участников</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
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
                    difficulty: 'medium',
                    max_participants: 0,
                    status: 'active',
                    opens_at: '',
                    links: [],
                    attachments: [],
                  });
                  setNewLink({ label: '', url: '' });
                  setAttachmentFiles([]);
                  setShowCaseForm(true);
                }}
                className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded"
              >
                + Создать кейс
              </button>
            </div>

            <div className="space-y-4">
              {casesStore.cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="border border-terminal-gray hover:border-terminal-green transition-all p-4 bg-terminal-dark"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{caseItem.title}</h3>
                      <p className="text-sm text-white/70 line-clamp-2">{caseItem.description}</p>
                      <div className="mt-2 flex gap-4 text-xs text-white/60">
                        <span>Сложность: {caseItem.difficulty}</span>
                        <span>Участников: {caseItem.current_participants}</span>
                        {caseItem.opens_at && (
                          <span>
                            Откроется: {new Date(caseItem.opens_at).toLocaleString('ru-RU')}
                          </span>
                        )}
                        {!caseItem.opens_at && <span>Открыт</span>}
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
                            difficulty: caseItem.difficulty,
                            max_participants: caseItem.max_participants,
                            status: caseItem.status,
                            opens_at: caseItem.opens_at
                              ? new Date(caseItem.opens_at).toISOString().slice(0, 16)
                              : '',
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                />
                <p className="text-xs text-white/60 mt-2">
                  Сообщение будет отправлено всем пользователям, которые не снялись с соревнований
                </p>
              </div>
              <button
                onClick={handleBroadcast}
                disabled={broadcasting || !broadcastMessage.trim()}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="glass rounded-lg p-4 border border-terminal-green">
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
                    schedule_cron: '',
                    schedule_time: '',
                    conditions: {},
                    case_id: null,
                  });
                  setShowSettingForm(true);
                }}
                className="px-4 py-2 bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-all font-medium rounded"
              >
                + Создать настройку
              </button>
            </div>

            <div className="space-y-4">
              {broadcastSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="border border-terminal-gray hover:border-terminal-green transition-all p-4 bg-terminal-dark rounded"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{setting.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          setting.enabled 
                            ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green' 
                            : 'bg-terminal-gray/20 text-terminal-gray border border-terminal-gray'
                        }`}>
                          {setting.enabled ? 'Включено' : 'Выключено'}
                        </span>
                        <span className="px-2 py-1 text-xs rounded bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan">
                          {setting.type === 'case_opening' ? 'Открытие кейса' :
                           setting.type === 'general' ? 'Общая' :
                           setting.type === 'scheduled' ? 'По расписанию' : 'Событие'}
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
                  formData.append('difficulty', caseFormData.difficulty);
                  formData.append('max_participants', caseFormData.max_participants);
                  formData.append('status', caseFormData.status);
                  formData.append('opens_at', caseFormData.opens_at || '');
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Сложность
                  </label>
                  <select
                    value={caseFormData.difficulty}
                    onChange={(e) => setCaseFormData({ ...caseFormData, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  >
                    <option value="easy">Легко</option>
                    <option value="medium">Средне</option>
                    <option value="hard">Сложно</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Макс. участников
                  </label>
                  <input
                    type="number"
                    value={caseFormData.max_participants}
                    onChange={(e) => setCaseFormData({ ...caseFormData, max_participants: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Дата и время открытия (оставьте пустым для немедленного открытия)
                </label>
                <input
                  type="datetime-local"
                  value={caseFormData.opens_at}
                  onChange={(e) => setCaseFormData({ ...caseFormData, opens_at: e.target.value })}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                />
                <p className="text-xs text-white/60 mt-1">
                  Если указана дата, кейс будет открыт автоматически в указанное время. Все пользователи получат уведомление в Telegram.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Статус
                </label>
                <select
                  value={caseFormData.status}
                  onChange={(e) => setCaseFormData({ ...caseFormData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                >
                  <option value="active">Активен</option>
                  <option value="closed">Закрыт</option>
                  <option value="archived">Архивирован</option>
                </select>
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
                    className="flex-1 px-3 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded text-sm"
                  />
                  <input
                    type="url"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded text-sm"
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
                    className="px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg rounded text-sm transition-colors"
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
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded"
                >
                  {editingCase ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCaseForm(false);
                    setEditingCase(null);
                  }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-green transition-all font-medium rounded"
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                >
                  <option value="approved">APPROVED</option>
                  <option value="rejected">REJECTED</option>
                  <option value="reviewing">REVIEWING</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Оценка
                </label>
                <input
                  type="number"
                  value={moderationData.score}
                  onChange={(e) =>
                    setModerationData({ ...moderationData, score: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  min="0"
                  max="100"
                />
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                />
              </div>
              <div className="flex gap-4 border-t border-terminal-gray pt-4">
                <button
                  onClick={handleModerate}
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setModeratingSolution(null);
                    setModerationData({ status: 'approved', admin_comment: '', score: 0 });
                  }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-green transition-all font-medium rounded"
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
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
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
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  >
                    <option value="case_opening">Открытие кейса</option>
                    <option value="general">Общая рассылка</option>
                    <option value="scheduled">По расписанию</option>
                    <option value="event">Событие</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Статус
                  </label>
                  <select
                    value={settingFormData.enabled ? 'true' : 'false'}
                    onChange={(e) => setSettingFormData({ ...settingFormData, enabled: e.target.value === 'true' })}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  >
                    <option value="true">Включено</option>
                    <option value="false">Выключено</option>
                  </select>
                </div>
              </div>

              {settingFormData.type === 'case_opening' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Связанный кейс (опционально)
                  </label>
                  <select
                    value={settingFormData.case_id || ''}
                    onChange={(e) => setSettingFormData({ ...settingFormData, case_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  >
                    <option value="">Все кейсы</option>
                    {availableCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Шаблон сообщения <span className="text-terminal-red">*</span>
                </label>
                <textarea
                  value={settingFormData.message_template}
                  onChange={(e) => setSettingFormData({ ...settingFormData, message_template: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                  placeholder="Введите шаблон сообщения. Для кейсов можно использовать переменные: {{case_title}}, {{case_description}}"
                />
                <p className="text-xs text-white/60 mt-1">
                  Поддерживается HTML разметка. Для кейсов доступны переменные: {'{{case_title}}'}, {'{{case_description}}'}
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
                              <span>{role}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {settingFormData.type === 'scheduled' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Cron выражение (например: "0 9 * * *" для ежедневно в 9:00)
                    </label>
                    <input
                      type="text"
                      value={settingFormData.schedule_cron}
                      onChange={(e) => setSettingFormData({ ...settingFormData, schedule_cron: e.target.value })}
                      className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                      placeholder="0 9 * * *"
                    />
                    <p className="text-xs text-white/60 mt-1">
                      Формат: минута час день месяц день_недели
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Или конкретное время отправки
                    </label>
                    <input
                      type="datetime-local"
                      value={settingFormData.schedule_time}
                      onChange={(e) => setSettingFormData({ ...settingFormData, schedule_time: e.target.value })}
                      className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-4 border-t border-terminal-gray/30 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded"
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
                      schedule_cron: '',
                      schedule_time: '',
                      conditions: {},
                      case_id: null,
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-terminal-gray text-white/70 hover:border-terminal-green transition-all font-medium rounded"
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
            <p>Управление таймлайном, призами и треками</p>
          </div>

          <div className="admin-settings-tabs">
            <button
              onClick={() => setSettingsSubTab('timeline')}
              className={`admin-settings-tab ${settingsSubTab === 'timeline' ? 'active' : ''}`}
            >
              Таймлайн
            </button>
            <button
              onClick={() => setSettingsSubTab('prizes')}
              className={`admin-settings-tab ${settingsSubTab === 'prizes' ? 'active' : ''}`}
            >
              Призы
            </button>
            <button
              onClick={() => setSettingsSubTab('tracks')}
              className={`admin-settings-tab ${settingsSubTab === 'tracks' ? 'active' : ''}`}
            >
              Треки
            </button>
          </div>

          {settingsSubTab === 'timeline' && (
            <div className="admin-settings-content">
              <div className="admin-settings-section-header">
                <h3>Таймлайн событий</h3>
                <button
                  onClick={() => {
                    setEditingTimelineItem({
                      type: 'registration',
                      title: '',
                      description: '',
                      date: '',
                      active: false
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
                        <span>Тип: {item.type}</span>
                        <span>Дата: {item.date ? new Date(item.date).toLocaleString('ru-RU') : 'Не указана'}</span>
                        {item.active && <span className="admin-badge-active">Активно</span>}
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
                        <label>Тип события</label>
                        <select
                          value={editingTimelineItem.type}
                          onChange={(e) => setEditingTimelineItem({...editingTimelineItem, type: e.target.value})}
                          className="admin-input"
                        >
                          <option value="registration">Регистрация</option>
                          <option value="hacking_begins">Начало хакатона</option>
                          <option value="submission">Дедлайн отправки</option>
                          <option value="other">Другое</option>
                        </select>
                      </div>
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
                        <label>Дата и время</label>
                        <input
                          type="datetime-local"
                          value={editingTimelineItem.date ? new Date(editingTimelineItem.date).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setEditingTimelineItem({...editingTimelineItem, date: e.target.value})}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={editingTimelineItem.active}
                            onChange={(e) => setEditingTimelineItem({...editingTimelineItem, active: e.target.checked})}
                          />
                          Активное событие
                        </label>
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
          )}

          {settingsSubTab === 'prizes' && (
            <div className="admin-settings-content">
              <div className="admin-settings-section-header">
                <h3>Призы и награды</h3>
                <button
                  onClick={() => {
                    setEditingPrize({
                      rank: 1,
                      name: '',
                      amount: 0,
                      benefits: [],
                      featured: false
                    });
                  }}
                  className="admin-btn-primary"
                >
                  + Добавить приз
                </button>
              </div>
              <div className="admin-settings-list">
                {hackathonSettings.prizes.map((prize, idx) => (
                  <div key={prize.id || idx} className="admin-settings-item">
                    <div className="admin-settings-item-content">
                      <div className="admin-settings-item-title">
                        #{prize.rank} - {prize.name}
                        {prize.featured && <span className="admin-badge-featured">TOP PRIZE</span>}
                      </div>
                      <div className="admin-settings-item-meta">
                        <span>Сумма: ${prize.amount.toLocaleString()}</span>
                        <span>Бонусов: {prize.benefits?.length || 0}</span>
                      </div>
                      {prize.benefits && prize.benefits.length > 0 && (
                        <div className="admin-settings-item-benefits">
                          {prize.benefits.map((b, i) => (
                            <span key={i} className="admin-benefit-tag">{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="admin-settings-item-actions">
                      <button
                        onClick={() => setEditingPrize(prize)}
                        className="admin-btn-secondary"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => deletePrize(prize.id)}
                        className="admin-btn-danger"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {editingPrize && (
                <div className="admin-modal">
                  <div className="admin-modal-content">
                    <h3>{editingPrize.id ? 'Редактировать' : 'Создать'} приз</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      savePrize(editingPrize);
                    }}>
                      <div className="admin-form-group">
                        <label>Место (ранг)</label>
                        <input
                          type="number"
                          min="1"
                          value={editingPrize.rank}
                          onChange={(e) => setEditingPrize({...editingPrize, rank: parseInt(e.target.value)})}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Название</label>
                        <input
                          type="text"
                          value={editingPrize.name}
                          onChange={(e) => setEditingPrize({...editingPrize, name: e.target.value})}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Сумма ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingPrize.amount}
                          onChange={(e) => setEditingPrize({...editingPrize, amount: parseInt(e.target.value)})}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Бонусы (через запятую)</label>
                        <input
                          type="text"
                          value={editingPrize.benefits?.join(', ') || ''}
                          onChange={(e) => setEditingPrize({
                            ...editingPrize,
                            benefits: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                          })}
                          className="admin-input"
                          placeholder="VC Introduction, Audit Credits, Premium Hardware"
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={editingPrize.featured}
                            onChange={(e) => setEditingPrize({...editingPrize, featured: e.target.checked})}
                          />
                          Главный приз (TOP PRIZE)
                        </label>
                      </div>
                      <div className="admin-form-actions">
                        <button type="submit" className="admin-btn-primary">Сохранить</button>
                        <button
                          type="button"
                          onClick={() => setEditingPrize(null)}
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
          )}

          {settingsSubTab === 'tracks' && (
            <div className="admin-settings-content">
              <div className="admin-settings-section-header">
                <h3>Треки событий</h3>
                <button
                  onClick={() => {
                    setEditingTrack({
                      name: '',
                      description: '',
                      tags: []
                    });
                  }}
                  className="admin-btn-primary"
                >
                  + Добавить трек
                </button>
              </div>
              <div className="admin-settings-list">
                {hackathonSettings.tracks.map((track, idx) => (
                  <div key={track.id || idx} className="admin-settings-item">
                    <div className="admin-settings-item-content">
                      <div className="admin-settings-item-title">
                        {String(idx + 1).padStart(2, '0')}. {track.name}
                      </div>
                      <div className="admin-settings-item-desc">{track.description}</div>
                      {track.tags && track.tags.length > 0 && (
                        <div className="admin-settings-item-tags">
                          {track.tags.map((tag, i) => (
                            <span key={i} className="admin-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="admin-settings-item-actions">
                      <button
                        onClick={() => setEditingTrack(track)}
                        className="admin-btn-secondary"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => deleteTrack(track.id)}
                        className="admin-btn-danger"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {editingTrack && (
                <div className="admin-modal">
                  <div className="admin-modal-content">
                    <h3>{editingTrack.id ? 'Редактировать' : 'Создать'} трек</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      saveTrack(editingTrack);
                    }}>
                      <div className="admin-form-group">
                        <label>Название</label>
                        <input
                          type="text"
                          value={editingTrack.name}
                          onChange={(e) => setEditingTrack({...editingTrack, name: e.target.value})}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Описание</label>
                        <textarea
                          value={editingTrack.description}
                          onChange={(e) => setEditingTrack({...editingTrack, description: e.target.value})}
                          className="admin-input"
                          rows={3}
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Теги (через запятую)</label>
                        <input
                          type="text"
                          value={editingTrack.tags?.join(', ') || ''}
                          onChange={(e) => setEditingTrack({
                            ...editingTrack,
                            tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                          })}
                          className="admin-input"
                          placeholder="Python, TensorFlow"
                        />
                      </div>
                      <div className="admin-form-actions">
                        <button type="submit" className="admin-btn-primary">Сохранить</button>
                        <button
                          type="button"
                          onClick={() => setEditingTrack(null)}
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
          )}
        </div>
      )}
    </div>
  );
};

export default observer(AdminPanel);
