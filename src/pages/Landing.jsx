import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, ArrowRightIcon } from '../components/Icons';

const Landing = () => {
  useDocumentTitle('Главная');
  
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center relative overflow-hidden">
      {/* Анимированные градиентные круги */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-terminal-green/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-terminal-cyan/20 rounded-full blur-3xl animate-pulse-slow-delay"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-terminal-purple/10 rounded-full blur-3xl animate-pulse-slow"></div>
      
      {/* Centered content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 w-full max-w-5xl mx-auto">
        <div className="glass-strong p-12 rounded-3xl backdrop-blur-2xl animate-fade-in-up">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-terminal-green/30 blur-2xl rounded-full animate-pulse-glow"></div>
              <CaseIcon size={80} className="relative text-terminal-green" />
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in-up">
            <span className="text-terminal-green">&gt;</span> Hackathon
            <span className="text-terminal-cyan"> Platform</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto animate-fade-in-up leading-relaxed">
            Решайте кейсы, создавайте команды, побеждайте в соревнованиях
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {authStore.isAuthenticated ? (
              <Link
                to="/cases"
                className="group relative px-8 py-4 bg-gradient-to-r from-terminal-green to-terminal-cyan text-terminal-bg font-bold rounded-xl hover:shadow-2xl hover:shadow-terminal-green/50 transition-all transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-terminal-green/80 to-terminal-cyan/80 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-2">
                  <CaseIcon size={20} className="text-terminal-bg" />
                  Перейти к кейсам
                  <ArrowRightIcon size={20} className="text-terminal-bg group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="group relative px-8 py-4 bg-gradient-to-r from-terminal-green to-terminal-cyan text-terminal-bg font-bold rounded-xl hover:shadow-2xl hover:shadow-terminal-green/50 transition-all transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-terminal-green/80 to-terminal-cyan/80 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-2">
                  Войти через Telegram
                  <ArrowRightIcon size={20} className="text-terminal-bg group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            )}
            <Link
              to="/info"
              className="group px-8 py-4 glass-gradient-cyan border-2 border-terminal-cyan/50 text-terminal-cyan font-bold rounded-xl hover:border-terminal-cyan hover:shadow-lg hover:shadow-terminal-cyan/30 transition-all transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Узнать больше
                <ArrowRightIcon size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
