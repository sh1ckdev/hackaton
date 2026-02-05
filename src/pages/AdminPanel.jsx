import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import solutionsStore from '../stores/solutionsStore';
import casesStore from '../stores/casesStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const AdminPanel = () => {
  useDocumentTitle('Панель администратора');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [activeTab, setActiveTab] = useState('solutions');
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
  });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchTeams();
    solutionsStore.fetchAllSolutions();
    casesStore.fetchCases();
  }, []);

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
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams/all');
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Ошибка загрузки команд:', error);
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

  const handleModerate = async () => {
    if (!moderatingSolution) return;
    try {
      await solutionsStore.moderateSolution(moderatingSolution.id, moderationData);
      setModeratingSolution(null);
      setModerationData({ status: 'approved', admin_comment: '', score: 0 });
      solutionsStore.fetchAllSolutions(filters);
    } catch (error) {
      console.error('Ошибка модерации:', error);
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
    <div className="px-4 py-6">
      <h1 className="text-3xl font-semibold text-gray-100 mb-6">Панель администратора</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-lg p-4 transform hover:scale-105 transition-all duration-300 hover:border-terminal-green border border-terminal-gray/50">
            <div className="text-3xl font-semibold text-white mb-1">{stats.users}</div>
            <div className="text-sm text-white/70">Пользователей</div>
          </div>
          <div className="glass rounded-lg p-4 transform hover:scale-105 transition-all duration-300 hover:border-terminal-cyan border border-terminal-gray/50">
            <div className="text-3xl font-semibold text-white mb-1">{stats.cases}</div>
            <div className="text-sm text-white/70">Кейсов</div>
          </div>
          <div className="glass rounded-lg p-4 transform hover:scale-105 transition-all duration-300 hover:border-terminal-blue border border-terminal-gray/50">
            <div className="text-3xl font-semibold text-white mb-1">{stats.solutions}</div>
            <div className="text-sm text-white/70">Решений</div>
          </div>
          <div className="glass rounded-lg p-4 transform hover:scale-105 transition-all duration-300 hover:border-terminal-purple border border-terminal-gray/50">
            <div className="text-3xl font-semibold text-white mb-1">
              {stats.solutionsByStatus?.pending || 0}
            </div>
            <div className="text-sm text-white/70">На модерации</div>
          </div>
        </div>
      )}

      <div className="glass rounded-xl">
        <div className="border-b border-terminal-gray/60">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('solutions')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'solutions'
                  ? 'border-b-2 border-terminal-green text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Решения
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-terminal-green text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'teams'
                  ? 'border-b-2 border-terminal-green text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Команды
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'cases'
                  ? 'border-b-2 border-terminal-green text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Кейсы
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'broadcast'
                  ? 'border-b-2 border-terminal-green text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Рассылка
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
                              console.error('Ошибка изменения роли:', error);
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
                                console.error('Ошибка изменения роли:', error);
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
                              console.error('Ошибка изменения роли:', error);
                              alert(error.response?.data?.error || 'Ошибка изменения роли');
                            }
                          }}
                          className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all text-sm font-medium rounded"
                        >
                          Сделать админом
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
                          Код: {team.code} | Участников: {team.members_count} | Создана: {new Date(team.created_at).toLocaleDateString('ru-RU')}
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
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray flex-shrink-0">
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
                  });
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
                          });
                          setShowCaseForm(true);
                        }}
                        className="px-3 py-1 text-sm bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all rounded"
                      >
                        Редактировать
                      </button>
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
                className="px-6 py-3 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {broadcasting ? 'Отправка...' : 'Отправить всем участникам'}
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
                  const data = {
                    ...caseFormData,
                    opens_at: caseFormData.opens_at || null,
                    max_participants: parseInt(caseFormData.max_participants) || 0,
                  };
                  if (editingCase) {
                    await casesStore.updateCase(editingCase.id, data);
                  } else {
                    await casesStore.createCase(data);
                  }
                  setShowCaseForm(false);
                  setEditingCase(null);
                  casesStore.fetchCases();
                } catch (error) {
                  alert(error.response?.data?.error || 'Ошибка сохранения кейса');
                }
              }}
              className="space-y-4"
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
    </div>
  );
};

export default observer(AdminPanel);
