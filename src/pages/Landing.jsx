import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, PaperPlaneIcon, RocketIcon, TrophyIcon, ShieldIcon } from '../components/Icons';

const Landing = () => {
  useDocumentTitle('Главная');
  
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Декоративные элементы */}
      <div className="absolute top-20 left-20 opacity-20">
        <RocketIcon size={120} className="text-terminal-green animate-pulse-slow" />
      </div>
      <div className="absolute bottom-20 right-20 opacity-20">
        <TrophyIcon size={100} className="text-terminal-cyan animate-pulse-slow-delay" />
      </div>

      <div className="text-center max-w-4xl mx-auto px-6 relative z-10">
        {/* Логотип */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-terminal-green/30 blur-2xl rounded-full"></div>
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-terminal-green/40 to-terminal-cyan/30 border-2 border-terminal-green/50 flex items-center justify-center">
                <RocketIcon size={50} className="text-terminal-green" />
              </div>
            </div>
          </div>
          <h1 className="text-7xl font-bold text-white mb-4">
            <span className="text-terminal-green">&gt;</span>
            <span className="ml-3">Hackathon</span>
          </h1>
          <p className="text-2xl text-gray-300 mb-3">
            Решайте кейсы, создавайте команды
          </p>
          <p className="text-xl text-gray-400 mb-12 flex items-center justify-center gap-2">
            <TrophyIcon size={20} className="text-terminal-cyan" />
            <span>Побеждайте в соревнованиях</span>
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          {authStore.isAuthenticated ? (
            <Link
              to="/cases"
              className="group px-8 py-4 bg-terminal-green text-terminal-bg font-semibold rounded-xl hover:opacity-90 transition-all transform hover:scale-105 shadow-lg shadow-terminal-green/30 flex items-center justify-center gap-2"
            >
              <CaseIcon size={20} />
              <span>Кейсы</span>
              <PaperPlaneIcon size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="group px-8 py-4 bg-terminal-green text-terminal-bg font-semibold rounded-xl hover:opacity-90 transition-all transform hover:scale-105 shadow-lg shadow-terminal-green/30 flex items-center justify-center gap-2"
            >
              <ShieldIcon size={20} />
              <span>Войти</span>
              <PaperPlaneIcon size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          )}
          <Link
            to="/info"
            className="group px-8 py-4 border-2 border-terminal-gray/30 text-white font-semibold rounded-xl hover:border-terminal-cyan transition-all transform hover:scale-105 flex items-center justify-center gap-2 bg-terminal-dark/30"
          >
            <span>Информация</span>
            <PaperPlaneIcon size={18} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Особенности */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 border border-terminal-gray/20 rounded-xl bg-terminal-dark/20 backdrop-blur-sm">
            <CaseIcon size={32} className="text-terminal-green mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Кейсы</h3>
            <p className="text-gray-400 text-sm">Решайте интересные задачи от компаний</p>
          </div>
          <div className="p-6 border border-terminal-gray/20 rounded-xl bg-terminal-dark/20 backdrop-blur-sm">
            <TrophyIcon size={32} className="text-terminal-cyan mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Соревнования</h3>
            <p className="text-gray-400 text-sm">Соревнуйтесь с другими участниками</p>
          </div>
          <div className="p-6 border border-terminal-gray/20 rounded-xl bg-terminal-dark/20 backdrop-blur-sm">
            <ShieldIcon size={32} className="text-terminal-purple mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Безопасно</h3>
            <p className="text-gray-400 text-sm">Защищенная авторизация через Telegram</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
