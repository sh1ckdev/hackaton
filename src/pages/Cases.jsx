import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';
import { CaseIcon, TimeIcon, PaperPlaneIcon, SearchIcon, FilterIcon, UsersIcon } from '../components/Icons';

const Cases = () => {
  useDocumentTitle('Кейсы');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  useEffect(() => {
    casesStore.fetchCases('active');
  }, []);


  const globalOpenDate = useMemo(() => {
    const now = new Date();
    const futureCases = casesStore.cases
      .filter(c => c.opens_at && new Date(c.opens_at) > now)
      .map(c => new Date(c.opens_at))
      .sort((a, b) => a - b);

    return futureCases.length > 0 ? futureCases[0].toISOString() : null;
  }, [casesStore.cases]);


  const areCasesOpen = useMemo(() => {
    const now = new Date();

    if (authStore.isModerator) return true;

    return !globalOpenDate || new Date(globalOpenDate) <= now;
  }, [globalOpenDate]);


  const filteredAndSortedCases = useMemo(() => {
    let filtered = [...casesStore.cases];


    if (!authStore.isModerator) {
      const now = new Date();
      filtered = filtered.filter(c => !c.opens_at || new Date(c.opens_at) <= now);
    }


    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }


    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(c => c.difficulty === difficultyFilter);
    }


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


  const stats = useMemo(() => {
    const total = casesStore.cases.length;
    const easy = casesStore.cases.filter(c => c.difficulty === 'easy').length;
    const medium = casesStore.cases.filter(c => c.difficulty === 'medium').length;
    const hard = casesStore.cases.filter(c => c.difficulty === 'hard').length;
    const totalParticipants = casesStore.cases.reduce((sum, c) => sum + (c.current_participants || 0), 0);

    const areCasesOpen = !globalOpenDate || new Date(globalOpenDate) <= new Date();
    
    return { total, easy, medium, hard, totalParticipants, areCasesOpen };
  }, [casesStore.cases, globalOpenDate]);

  const getDifficultyBadge = (difficulty) => {
    const styles = {
      easy: 'border-terminal-green text-terminal-green bg-terminal-green/10',
      medium: 'border-terminal-cyan text-terminal-cyan bg-terminal-cyan/10',
      hard: 'border-terminal-red text-terminal-red bg-terminal-red/10',
    };
    const labels = {
      easy: 'EASY',
      medium: 'MEDIUM',
      hard: 'HARD',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${styles[difficulty] || styles.medium}`}>
        {labels[difficulty] || labels.medium}
      </span>
    );
  };

  return (
    <div>
      {}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Кейсы</h1>
            <p className="text-gray-400 text-sm">
              {stats.areCasesOpen 
                ? 'Все кейсы доступны для участия' 
                : 'Кейсы откроются одновременно'}
            </p>
          </div>
          {globalOpenDate && (
            <div className="border border-terminal-cyan/30 rounded-xl p-5 bg-terminal-cyan/5 backdrop-blur-sm lg:min-w-[300px]">
              <div className="flex items-center gap-2 mb-3">
                <TimeIcon size={18} className="text-terminal-cyan" />
                <p className="text-sm font-medium text-terminal-cyan">Кейсы откроются через:</p>
              </div>
              <CountdownTimer targetDate={globalOpenDate} />
            </div>
          )}
        </div>

        {}
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
          <div className={`border rounded-lg p-4 backdrop-blur-sm ${
            stats.areCasesOpen 
              ? 'border-terminal-green/30 bg-terminal-green/5' 
              : 'border-terminal-gray/30 bg-terminal-dark/30'
          }`}>
            <div className={`text-2xl font-bold mb-1 ${
              stats.areCasesOpen ? 'text-terminal-green' : 'text-white'
            }`}>
              {stats.areCasesOpen ? '✓' : '⏳'}
            </div>
            <div className="text-xs text-gray-400">
              {stats.areCasesOpen ? 'Открыто' : 'Ожидание'}
            </div>
          </div>
          <div className="border border-terminal-gray/30 rounded-lg p-4 bg-terminal-dark/30 backdrop-blur-sm">
            <div className="text-2xl font-bold text-white mb-1">{stats.totalParticipants}</div>
            <div className="text-xs text-gray-400">Участников</div>
          </div>
        </div>

        {}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {}
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

          {}
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

          {}
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
      ) : !areCasesOpen && !authStore.isModerator ? (
        <div className="text-center py-20 border border-terminal-cyan/30 rounded-xl bg-terminal-cyan/5 backdrop-blur-sm">
          <TimeIcon size={48} className="text-terminal-cyan mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-semibold text-white mb-2">Кейсы еще не открыты</h2>
          <p className="text-gray-400 mb-4">
            Информация о кейсах будет доступна после их открытия
          </p>
          {globalOpenDate && (
            <div className="mt-6 inline-block border border-terminal-cyan/30 rounded-xl p-5 bg-terminal-cyan/5">
              <div className="flex items-center gap-2 mb-3 justify-center">
                <TimeIcon size={18} className="text-terminal-cyan" />
                <p className="text-sm font-medium text-terminal-cyan">Кейсы откроются через:</p>
              </div>
              <CountdownTimer targetDate={globalOpenDate} />
            </div>
          )}
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
          {filteredAndSortedCases.map((caseItem, index) => {
            const participantsPercent = caseItem.max_participants > 0 
              ? Math.min(100, ((caseItem.current_participants || 0) / caseItem.max_participants) * 100)
              : 0;
            
            return (
              <Link
                key={caseItem.id}
                to={`/cases/${caseItem.id}`}
                className="group relative border border-terminal-gray/30 rounded-xl p-6 hover:border-terminal-green/50 transition-all hover:shadow-lg hover:shadow-terminal-green/10 bg-terminal-dark/30 backdrop-blur-sm flex flex-col animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {}
                <div className="absolute top-4 right-4 z-10">
                  {getDifficultyBadge(caseItem.difficulty)}
                </div>

                {}
                <div className="mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-terminal-green/20 to-terminal-green/5 border border-terminal-green/30 flex items-center justify-center group-hover:bg-terminal-green/20 transition-all group-hover:scale-110 group-hover:rotate-3">
                    <CaseIcon size={28} className="text-terminal-green" />
                  </div>
                </div>

                {}
                <h2 className="text-xl font-semibold text-white mb-3 pr-20 group-hover:text-terminal-green transition-colors leading-tight">
                  {caseItem.title}
                </h2>

                {}
                {(!caseItem.opens_at || new Date(caseItem.opens_at) <= new Date() || authStore.isModerator) ? (
                  <p className="text-sm text-gray-400 line-clamp-3 mb-5 flex-1 leading-relaxed">
                    {caseItem.description || 'Описание отсутствует'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 line-clamp-3 mb-5 flex-1 leading-relaxed italic">
                    Информация будет доступна после открытия кейса
                  </p>
                )}

                {}
                <div className="pt-4 border-t border-terminal-gray/20 space-y-3 mt-auto">
                  {}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <UsersIcon size={14} className="text-gray-400" />
                        <span className="font-medium">
                          {caseItem.current_participants || 0}
                          {caseItem.max_participants > 0 && ` / ${caseItem.max_participants}`}
                          <span className="text-gray-600 ml-1">участников</span>
                        </span>
                      </span>
                    </div>
                    {caseItem.max_participants > 0 && (
                      <div className="w-full bg-terminal-gray/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-terminal-green to-terminal-cyan h-2 rounded-full transition-all duration-500"
                          style={{ width: `${participantsPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">Подробнее</span>
                    <div className="flex items-center gap-1 text-terminal-green">
                      <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Открыть
                      </span>
                      <PaperPlaneIcon size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:rotate-12 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
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
