import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import authStore from '../stores/authStore';

const AuthVkCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    const vkError = searchParams.get('error');

    if (vkError) {
      setError(searchParams.get('error_description') || 'Ошибка авторизации VK');
      setLoading(false);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const ok = await authStore.loginWithVk(code);
        if (ok) {
          navigate('/profile', { replace: true });
        } else {
          setError(authStore.error || 'Ошибка входа через VK');
        }
      } catch (err) {
        setError('Ошибка входа через VK');
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div className="terminal-loading">
          <div className="terminal-loading-container">
            <div>
              <span className="terminal-loading-prompt">sys@hackathon:~$</span>
              <span className="terminal-loading-command">auth_vk</span>
            </div>
            <div className="terminal-loading-status">
              &gt; Вход через VK ID...
              <span className="terminal-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
            <div className="terminal-loading-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg p-4">
      <div className="login-terminal max-w-md w-full">
        <div className="login-terminal-header">
          <div className="login-terminal-dots" aria-hidden="true">
            <span className="login-dot-circle red"></span>
            <span className="login-dot-circle yellow"></span>
            <span className="login-dot-circle green"></span>
          </div>
          <div className="login-terminal-title">auth_vk_callback</div>
        </div>
        <div className="login-terminal-body">
          {error && (
            <div className="login-error">
              <strong>Ошибка</strong>
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="login-telegram-button"
            style={{ marginTop: 16 }}
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthVkCallback;
