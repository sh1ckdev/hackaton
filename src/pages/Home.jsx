import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';

const Home = () => {
  useEffect(() => {
    casesStore.fetchCases('active');
    solutionsStore.fetchMySolutions();
  }, []);

  const mySolutionsCount = solutionsStore.solutions.length;
  const activeCasesCount = casesStore.cases.length;

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-100 mb-2">
          Добро пожаловать
        </h1>
        <p className="text-gray-400">
          Выберите кейс, создайте решение и отправьте его на модерацию
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-lg p-6 hover:border-terminal-green transition-all">
          <div className="text-3xl font-semibold text-terminal-green mb-2">{activeCasesCount}</div>
          <div className="text-gray-400 text-sm mb-4">Активных кейсов</div>
          <Link
            to="/cases"
            className="text-terminal-green hover:text-terminal-cyan transition-colors text-sm"
          >
            Посмотреть →
          </Link>
        </div>

        <div className="glass rounded-lg p-6 hover:border-terminal-cyan transition-all">
          <div className="text-3xl font-semibold text-terminal-cyan mb-2">{mySolutionsCount}</div>
          <div className="text-gray-400 text-sm mb-4">Моих решений</div>
          <Link
            to="/solutions"
            className="text-terminal-cyan hover:text-terminal-green transition-colors text-sm"
          >
            Посмотреть →
          </Link>
        </div>

        <div className="glass rounded-lg p-6 hover:border-terminal-blue transition-all">
          <div className="text-3xl font-semibold text-terminal-blue mb-2">Новые</div>
          <div className="text-gray-400 text-sm mb-4">Кейсы ждут вас</div>
          <Link
            to="/cases"
            className="text-terminal-blue hover:text-terminal-cyan transition-colors text-sm"
          >
            Начать →
          </Link>
        </div>
      </div>

      {casesStore.cases.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">Последние кейсы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {casesStore.cases.slice(0, 3).map((caseItem) => (
              <Link
                key={caseItem.id}
                to={`/cases/${caseItem.id}`}
                className="glass rounded-lg p-6 hover:border-terminal-green transition-all"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  {caseItem.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {caseItem.description}
                </p>
                <div className="flex items-center justify-between border-t border-terminal-gray pt-3">
                  <span className={`px-2 py-1 text-xs rounded border ${
                    caseItem.difficulty === 'easy' ? 'border-terminal-green text-terminal-green' :
                    caseItem.difficulty === 'medium' ? 'border-terminal-cyan text-terminal-cyan' :
                    'border-terminal-red text-terminal-red'
                  }`}>
                    {caseItem.difficulty === 'easy' ? 'Легко' :
                     caseItem.difficulty === 'medium' ? 'Средне' : 'Сложно'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {caseItem.current_participants} участников
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {casesStore.loading && (
        <div className="text-center py-8">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      )}
    </div>
  );
};

export default observer(Home);
