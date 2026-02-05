import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, ArrowRightIcon } from '../components/Icons';

const Landing = () => {
  useDocumentTitle('Главная');
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-3xl mx-auto px-6">
        <h1 className="text-6xl font-bold text-white mb-4">
          <span className="text-terminal-green">&gt;</span> Hackathon
        </h1>
        <p className="text-xl text-gray-400 mb-12">
          Решайте кейсы, создавайте команды, побеждайте в соревнованиях
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {authStore.isAuthenticated ? (
            <Link
              to="/cases"
              className="px-8 py-3 bg-terminal-green text-terminal-bg font-semibold rounded hover:opacity-90 transition-opacity"
            >
              Кейсы
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-8 py-3 bg-terminal-green text-terminal-bg font-semibold rounded hover:opacity-90 transition-opacity"
            >
              Войти
            </Link>
          )}
          <Link
            to="/info"
            className="px-8 py-3 border border-terminal-gray/30 text-white font-semibold rounded hover:border-terminal-cyan transition-colors"
          >
            Информация
          </Link>
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
