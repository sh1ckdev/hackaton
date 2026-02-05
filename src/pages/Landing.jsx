import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Landing = () => {
  useDocumentTitle('Главная');
  
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h1 className="text-6xl font-bold text-white mb-4">
          <span className="text-terminal-green">&gt;</span> hackathon
        </h1>
        <p className="text-xl text-white/60 mb-12">
          Решайте кейсы, создавайте команды, побеждайте
        </p>
        <div className="flex gap-4 justify-center">
          {authStore.isAuthenticated ? (
            <Link
              to="/cases"
              className="px-6 py-3 bg-terminal-green text-terminal-bg font-medium hover:opacity-90 transition-opacity"
            >
              Кейсы
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-6 py-3 bg-terminal-green text-terminal-bg font-medium hover:opacity-90 transition-opacity"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default observer(Landing);
