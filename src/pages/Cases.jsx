import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';
import { CaseIcon, TimeIcon, ArrowRightIcon, SearchIcon, FilterIcon } from '../components/Icons';

const Cases = () => {
  useDocumentTitle('Кейсы');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  useEffect(() => {
    casesStore.fetchCases('active');
  }, []);

  // Находим ближайший opens_at среди всех кейсов
  const nearestOpenDate = useMemo(() => {
    const now = new Date();
    const futureCases = casesStore.cases
      .filter(c => c.opens_at && new Date(c.opens_at) > now)
      .map(c => new Date(c.opens_at))
      .sort((a, b) => a - b);
    return futureCases.length > 0 ? futureCases[0].toISOString() : null;
  }, [casesStore.cases]);

  // Фильтрация и сортировка кейсов
  const filteredAndSortedCases = useMemo(() => {
    let filtered = [...casesStore.cases];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }

    // Фильтр по сложности
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(c => c.difficulty === difficultyFilter);
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'participants':
          return (b.current_participants || 0) - (a.current_participants || 0);
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          return (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2);
        default:
          return 0;
      }
    });

    return filtered;
  }, [casesStore.cases, searchQuery, difficultyFilter, sortBy]);

  // Статистика
  const stats = useMemo(() => {
    const total = casesStore.cases.length;
    const easy = casesStore.cases.filter(c => c.difficulty === 'easy').length;
    const medium = casesStore.cases.filter(c => c.difficulty === 'medium').length;
    const hard = casesStore.cases.filter(c => c.difficulty === 'hard').length;
    const totalParticipants = casesStore.cases.reduce((sum, c) => sum + (c.current_participants || 0), 0);
    const openCases = casesStore.cases.filter(c => !c.opens_at || new Date(c.opens_at) <= new Date()).length;
    
    return { total, easy, medium, hard, totalParticipants, openCases };
  }, [casesStore.cases]);

  const getDifficultyBadge = (difficulty) => {
    const styles = {
      easy: 'border-terminal-green text-terminal-green',
      medium: 'border-terminal-cyan text-terminal-cyan',
      hard: 'border-terminal-red text-terminal-red',
    };
    const labels = {
      easy: 'EASY',
      medium: 'MEDIUM',
      hard: 'HARD',
    };
    return (
      <span className={`px-3 py-1 text-xs rounded border ${styles[difficulty] || styles.medium}`}>
        {labels[difficulty] || labels.medium}
      </span>
    );
  };

  return (
    <div>
      {/* Заголовок и общий таймер */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Кейсы</h1>
            <p className="text-gray-400 text-sm">Выберите кейс для участия</p>
          </div>
          {nearestOpenDate && (
            <div className="border border-terminal-cyan/30 rounded-xl p-5 bg-terminal-cyan/5 backdrop-blur-sm min-w-[280px]">
              <div className="flex items-center gap-2 mb-3">
                <TimeIcon size={18} className="text-terminal-cyan" />
                <p className="text-sm font-medium text-terminal-cyan">Ближайший кейс откроется через:</p>
              </div>
              <CountdownTimer targetDate={nearestOpenDate} />
            </div>
          )}
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="border border-terminal-gray/30 rounded-lg p-4 bg-terminal-dark/30 backdrop-blur-sm">
            <div className="text-2xl font-bold text-white mb-1">{stats.total}</div>
            <div className="text-xs text-gray-400">Всего кейсов</div>
          </div>
          <div className="border border-terminal-green/30 rounded-lg p-4 bg-terminal-green/5 backdrop-blur-sm">
            <div className="text-2xl font-bold text-terminal-green mb-1">{stats.easy}</div>
            <div className="text-xs text-gray-400">Easy</div>
          </div>
          <div className="border border-terminal-cyan/30 rounded-lg p-4 bg-terminal-cyan/5 backdrop-blur-sm">
            <div className="text-2xl font-bold text-terminal-cyan mb-1">{stats.medium}</div>
            <div className="text-xs text-gray-400">Medium</div>
          </div>
          <div className="border border-terminal-red/30 rounded-lg p-4 bg-terminal-red/5 backdrop-blur-sm">
            <div className="text-2xl font-bold text-terminal-red mb-1">{stats.hard}</div>
            <div className="text-xs text-gray-400">Hard</div>
          </div>
          <div className="border border-terminal-gray/30 rounded-lg p-4 bg-terminal-dark/30 backdrop-blur-sm">
            <div className="text-2xl font-bold text-white mb-1">{stats.openCases}</div>
            <div className="text-xs text-gray-400">Открыто</div>
          </div>
          <div className="border border-terminal-gray/30 rounded-lg p-4 bg-terminal-dark/30 backdrop-blur-sm">
            <div className="text-2xl font-bold text-white mb-1">{stats.totalParticipants}</div>
            <div className="text-xs text-gray-400">Участников</div>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Поиск */}
          <div className="flex-1 relative">
            <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск кейсов..."
              className="w-full pl-11 pr-4 py-3 bg-terminal-dark/40 border border-terminal-gray/30 text-white rounded-lg focus:border-terminal-green focus:outline-none transition-colors placeholder:text-gray-600"
            />
          </div>

          {/* Фильтр по сложности */}
          <div className="relative">
            <FilterIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="pl-11 pr-4 py-3 bg-terminal-dark/40 border border-terminal-gray/30 text-white rounded-lg focus:border-terminal-cyan focus:outline-none transition-colors appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="all">Все сложности</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Сортировка */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-terminal-dark/40 border border-terminal-gray/30 text-white rounded-lg focus:border-terminal-cyan focus:outline-none transition-colors appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="participants">По участникам</option>
            <option value="difficulty">По сложности</option>
          </select>
        </div>
      </div>

      {casesStore.loading ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center gap-2 text-terminal-green mb-4">
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-1"></div>
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-2"></div>
          </div>
          <div className="text-gray-400">Загрузка кейсов...</div>
        </div>
      ) : filteredAndSortedCases.length === 0 ? (
        <div className="text-center py-20 border border-terminal-gray/30 rounded-xl bg-terminal-dark/30 backdrop-blur-sm">
          <CaseIcon size={48} className="text-gray-600 mx-auto mb-4 opacity-50" />
          <p className="text-gray-400 text-lg mb-2">
            {searchQuery || difficultyFilter !== 'all' 
              ? 'Кейсы не найдены' 
              : 'Нет доступных кейсов'}
          </p>
          {(searchQuery || difficultyFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDifficultyFilter('all');
              }}
              className="text-terminal-green hover:text-terminal-cyan text-sm transition-colors"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCases.map((caseItem, index) => (
            <Link
              key={caseItem.id}
              to={`/cases/${caseItem.id}`}
              className="group relative border border-terminal-gray/30 rounded-xl p-6 hover:border-terminal-green/50 transition-all hover:shadow-lg hover:shadow-terminal-green/10 bg-terminal-dark/30 backdrop-blur-sm flex flex-col animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Бейдж сложности в правом верхнем углу */}
              <div className="absolute top-4 right-4">
                {getDifficultyBadge(caseItem.difficulty)}
              </div>

              {/* Иконка кейса */}
              <div className="mb-4">
                <div className="w-12 h-12 rounded-lg bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center group-hover:bg-terminal-green/20 transition-colors">
                  <CaseIcon size={24} className="text-terminal-green" />
                </div>
              </div>

              {/* Заголовок */}
              <h2 className="text-xl font-semibold text-white mb-3 pr-16 group-hover:text-terminal-green transition-colors">
                {caseItem.title}
              </h2>

              {/* Описание */}
              <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">
                {caseItem.description || 'Описание отсутствует'}
              </p>

              {/* Статус открытия */}
              {caseItem.opens_at && new Date(caseItem.opens_at) > new Date() ? (
                <div className="mb-4 p-3 bg-terminal-dark/60 rounded-lg border border-terminal-cyan/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TimeIcon size={14} className="text-terminal-cyan" />
                    <p className="text-xs text-terminal-cyan font-medium">Откроется позже</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-2 bg-terminal-green/10 rounded-lg border border-terminal-green/20">
                  <p className="text-xs text-terminal-green font-medium text-center">✓ Открыт</p>
                </div>
              )}

              {/* Футер с информацией */}
              <div className="pt-4 border-t border-terminal-gray/20 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{caseItem.current_participants || 0}</span>
                    <span>участников</span>
                    {caseItem.max_participants > 0 && (
                      <>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-600">{caseItem.max_participants} макс.</span>
                      </>
                    )}
                  </div>
                  {caseItem.max_participants > 0 && (
                    <div className="mt-1 w-full bg-terminal-gray/20 rounded-full h-1.5">
                      <div
                        className="bg-terminal-green h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((caseItem.current_participants || 0) / caseItem.max_participants) * 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>
                <ArrowRightIcon size={16} className="text-terminal-green opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {casesStore.error && (
        <div className="mt-4 p-4 border border-terminal-red/50 rounded-lg text-terminal-red text-sm bg-terminal-red/10">
          {casesStore.error}
        </div>
      )}
    </div>
  );
};

export default observer(Cases);
