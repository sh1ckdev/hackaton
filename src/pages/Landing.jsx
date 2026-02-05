import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';

const Landing = () => {
  return (
    <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
      {/* Анимированный фон */}
      <div className="absolute inset-0 opacity-5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-terminal-green animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* Навигация */}
        <nav className="glass border-b border-terminal-gray/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-terminal-green text-xl font-mono font-bold">$</span>
                <span className="text-white text-xl font-mono ml-2">hackathon</span>
              </div>
              <div className="flex items-center gap-4">
                {authStore.isAuthenticated ? (
                  <>
                    <Link
                      to="/cases"
                      className="px-4 py-2 border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all font-mono text-sm rounded"
                    >
                      Кейсы
                    </Link>
                    <Link
                      to="/profile"
                      className="px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono text-sm rounded"
                    >
                      Профиль
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono text-sm rounded"
                  >
                    Войти
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero секция */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white font-mono">
                <span className="text-terminal-green">&gt;</span> Hackathon
              </h1>
              <p className="text-xl md:text-2xl text-white/70 font-mono max-w-2xl mx-auto">
                Решай кейсы, создавай решения, побеждай в команде
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              {authStore.isAuthenticated ? (
                <Link
                  to="/cases"
                  className="px-8 py-4 border-2 border-terminal-green bg-terminal-green/10 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono font-semibold rounded-lg text-lg"
                >
                  Начать работу
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-8 py-4 border-2 border-terminal-green bg-terminal-green/10 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono font-semibold rounded-lg text-lg"
                >
                  Войти через Telegram
                </Link>
              )}
              <Link
                to="/info"
                className="px-8 py-4 border-2 border-terminal-gray text-white/70 hover:text-white hover:border-terminal-cyan transition-all font-mono font-semibold rounded-lg text-lg"
              >
                Узнать больше
              </Link>
            </div>
          </div>

          {/* Особенности */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="glass rounded-xl p-6 border border-terminal-gray/30 hover:border-terminal-green transition-all">
              <div className="text-terminal-green text-3xl font-mono mb-4">&gt; Кейсы</div>
              <h3 className="text-white text-xl font-semibold mb-2 font-mono">Реальные задачи</h3>
              <p className="text-white/60 text-sm font-mono">
                Решай интересные кейсы разной сложности и получай опыт
              </p>
            </div>

            <div className="glass rounded-xl p-6 border border-terminal-gray/30 hover:border-terminal-cyan transition-all">
              <div className="text-terminal-cyan text-3xl font-mono mb-4">$ Команды</div>
              <h3 className="text-white text-xl font-semibold mb-2 font-mono">Работа в команде</h3>
              <p className="text-white/60 text-sm font-mono">
                Создавай команды, приглашай друзей и решай задачи вместе
              </p>
            </div>

            <div className="glass rounded-xl p-6 border border-terminal-gray/30 hover:border-terminal-blue transition-all">
              <div className="text-terminal-blue text-3xl font-mono mb-4"># Решения</div>
              <h3 className="text-white text-xl font-semibold mb-2 font-mono">Отправляй работы</h3>
              <p className="text-white/60 text-sm font-mono">
                Загружай решения, получай обратную связь и улучшай навыки
              </p>
            </div>
          </div>

          {/* Рейтинг команд */}
          {authStore.isAuthenticated && (
            <div className="mt-12 text-center">
              <Link
                to="/leaderboard"
                className="inline-block px-8 py-4 border-2 border-terminal-blue bg-terminal-blue/10 text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg transition-all font-mono font-semibold rounded-lg text-lg"
              >
                Посмотреть рейтинг команд
              </Link>
            </div>
          )}

          {/* Статистика (если авторизован) */}
          {authStore.isAuthenticated && (
            <div className="mt-20 glass rounded-xl p-8 border border-terminal-gray/30">
              <h2 className="text-2xl font-semibold text-white mb-6 font-mono text-center">
                <span className="text-terminal-green">&gt;</span> Добро пожаловать, {authStore.user?.first_name || authStore.user?.username || 'участник'}!
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Link
                  to="/cases"
                  className="glass rounded-lg p-6 border border-terminal-gray/30 hover:border-terminal-green transition-all text-center"
                >
                  <div className="text-terminal-green text-3xl font-mono mb-2">Кейсы</div>
                  <p className="text-white/60 text-sm font-mono">Выбери задачу</p>
                </Link>
                <Link
                  to="/solutions"
                  className="glass rounded-lg p-6 border border-terminal-gray/30 hover:border-terminal-cyan transition-all text-center"
                >
                  <div className="text-terminal-cyan text-3xl font-mono mb-2">Решения</div>
                  <p className="text-white/60 text-sm font-mono">Мои работы</p>
                </Link>
                <Link
                  to="/profile"
                  className="glass rounded-lg p-6 border border-terminal-gray/30 hover:border-terminal-blue transition-all text-center"
                >
                  <div className="text-terminal-blue text-3xl font-mono mb-2">Профиль</div>
                  <p className="text-white/60 text-sm font-mono">Настройки</p>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
