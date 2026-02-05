import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import solutionsStore from '../stores/solutionsStore';
import casesStore from '../stores/casesStore';
import api from '../utils/api';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('solutions');
  const [filters, setFilters] = useState({ status: '', case_id: '' });
  const [moderatingSolution, setModeratingSolution] = useState(null);
  const [moderationData, setModerationData] = useState({
    status: 'approved',
    admin_comment: '',
    score: 0,
  });
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [caseFormData, setCaseFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    difficulty: 'medium',
    max_participants: 0,
    status: 'active',
  });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    solutionsStore.fetchAllSolutions();
    casesStore.fetchCases();
  }, []);

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
          <div className="glass rounded-lg p-4">
            <div className="text-3xl font-semibold text-white">{stats.users}</div>
            <div className="text-sm text-white/70">Пользователей</div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-3xl font-semibold text-white">{stats.cases}</div>
            <div className="text-sm text-white/70">Кейсов</div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-3xl font-semibold text-white">{stats.solutions}</div>
            <div className="text-sm text-white/70">Решений</div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-3xl font-semibold text-white">
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
              {solutionsStore.allSolutions.map((solution) => (
                <div
                  key={solution.id}
                  className="border border-terminal-gray hover:border-terminal-green transition-all p-4 bg-terminal-dark"
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
                    {solution.repository_url && (
                      <a
                        href={solution.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-cyan hover:text-white transition-colors"
                      >
                        Репозиторий
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
                    className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all text-sm font-medium rounded"
                  >
                    Модерировать
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-6">
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border border-terminal-gray hover:border-terminal-green transition-all p-4 flex items-center justify-between bg-terminal-dark"
                >
                  <div>
                    <p className="font-semibold text-terminal-green">
                      {user.first_name} {user.last_name} ({user.username})
                    </p>
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
                            await api.put(`/admin/users/${user.id}/role`, { role: user.role === 'moderator' ? 'user' : 'moderator' });
                            fetchUsers();
                          } catch (error) {
                            console.error('Ошибка изменения роли:', error);
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
                    {user.role !== 'admin' && (
                      <button
                        onClick={async () => {
                          try {
                            await api.put(`/admin/users/${user.id}/role`, { role: 'admin' });
                            fetchUsers();
                          } catch (error) {
                            console.error('Ошибка изменения роли:', error);
                          }
                        }}
                        className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all text-sm font-medium rounded"
                      >
                        Сделать админом
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
