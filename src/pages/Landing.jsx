import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';

const Landing = () => {
  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-terminal-green/10 via-transparent to-terminal-cyan/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in-up">
              <span className="text-terminal-green">&gt;</span> Hackathon
              <span className="text-terminal-cyan"> Platform</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/70 mb-8 max-w-3xl mx-auto animate-fade-in-up">
              Решайте кейсы, создавайте команды, побеждайте в соревнованиях
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {authStore.isAuthenticated ? (
                <Link
                  to="/cases"
                  className="px-8 py-4 bg-terminal-green text-terminal-bg font-semibold rounded-lg hover:bg-terminal-green/90 transition-all transform hover:scale-105 shadow-lg shadow-terminal-green/50"
                >
                  Перейти к кейсам
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-8 py-4 bg-terminal-green text-terminal-bg font-semibold rounded-lg hover:bg-terminal-green/90 transition-all transform hover:scale-105 shadow-lg shadow-terminal-green/50"
                >
                  Войти через Telegram
                </Link>
              )}
              <Link
                to="/info"
                className="px-8 py-4 border-2 border-terminal-cyan text-terminal-cyan font-semibold rounded-lg hover:bg-terminal-cyan/10 transition-all transform hover:scale-105"
              >
                Узнать больше
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass rounded-xl p-6 hover:border-terminal-green transition-all transform hover:scale-105">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-white mb-2">Кейсы</h3>
            <p className="text-white/70">
              Решайте интересные задачи разной сложности и получайте опыт
            </p>
          </div>
          <div className="glass rounded-xl p-6 hover:border-terminal-cyan transition-all transform hover:scale-105">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-white mb-2">Команды</h3>
            <p className="text-white/70">
              Создавайте команды и работайте вместе над решениями
            </p>
          </div>
          <div className="glass rounded-xl p-6 hover:border-terminal-purple transition-all transform hover:scale-105">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">Соревнования</h3>
            <p className="text-white/70">
              Участвуйте в хакатонах и соревнуйтесь с другими командами
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass rounded-xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-terminal-green mb-2">100+</div>
              <div className="text-white/70 text-sm">Участников</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-terminal-cyan mb-2">50+</div>
              <div className="text-white/70 text-sm">Кейсов</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-terminal-purple mb-2">30+</div>
              <div className="text-white/70 text-sm">Команд</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-terminal-blue mb-2">200+</div>
              <div className="text-white/70 text-sm">Решений</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
