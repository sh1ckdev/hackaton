import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';

const Landing = () => {
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-terminal-green/10 via-transparent to-terminal-cyan/10"></div>
      
      {/* Centered content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 w-full max-w-5xl mx-auto">
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
  );
};

export default observer(Landing);
