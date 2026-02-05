import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, ArrowRightIcon } from '../components/Icons';

const Landing = () => {
  useDocumentTitle('Главная');
  
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center relative overflow-hidden">
      {/* Centered content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 w-full max-w-5xl mx-auto">
        <div className="glass p-12 rounded-lg">
          <div className="flex justify-center mb-6">
            <CaseIcon size={64} className="text-terminal-green" />
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
            <span className="text-terminal-green">&gt;</span> Hackathon
            <span className="text-terminal-cyan"> Platform</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Решайте кейсы, создавайте команды, побеждайте в соревнованиях
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {authStore.isAuthenticated ? (
              <Link
                to="/cases"
                className="px-8 py-4 bg-gradient-to-r from-terminal-green to-terminal-cyan text-terminal-bg font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <CaseIcon size={20} className="text-terminal-bg" />
                Перейти к кейсам
                <ArrowRightIcon size={20} className="text-terminal-bg" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-8 py-4 bg-gradient-to-r from-terminal-green to-terminal-cyan text-terminal-bg font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                Войти через Telegram
                <ArrowRightIcon size={20} className="text-terminal-bg" />
              </Link>
            )}
            <Link
              to="/info"
              className="px-8 py-4 glass border border-terminal-cyan/50 text-terminal-cyan font-bold rounded-lg hover:border-terminal-cyan transition-colors flex items-center gap-2"
            >
              Узнать больше
              <ArrowRightIcon size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
