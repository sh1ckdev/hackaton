import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const captchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReady, setCaptchaReady] = useState(false);
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    if (authStore.isAuthenticated) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    if (window.turnstile) {
      setCaptchaReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setCaptchaReady(true);
    document.body.appendChild(script);
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (!turnstileSiteKey || !captchaReady || !captchaRef.current) return;
    if (captchaRef.current.childNodes.length > 0) return;
    window.turnstile.render(captchaRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token) => setCaptchaToken(token),
      'expired-callback': () => setCaptchaToken('')
    });
  }, [turnstileSiteKey, captchaReady]);

  const handleTelegramRedirect = () => {
    if (!botUsername) {
      setError('Укажите VITE_TELEGRAM_BOT_USERNAME в .env клиента.');
      return;
    }
    window.location.href = `https://t.me/${botUsername}?start=login`;
  };

  const handleTokenLogin = async () => {
    if (!captchaToken) {
      setError('Пройдите капчу.');
      return;
    }
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      setError('Токен входа не найден.');
      return;
    }
    setLoginPending(true);
    const ok = await authStore.loginWithToken(token, captchaToken);
    setLoginPending(false);
    if (ok) {
      navigate('/profile');
    } else {
      setError(authStore.error || 'Ошибка входа');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
      <div className="max-w-md w-full space-y-8 p-10 glass rounded-xl">
        <div className="border-l-2 border-terminal-green pl-4">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Вход
          </h2>
          <p className="text-white/70 text-sm">
            Нажмите кнопку, чтобы перейти к боту в Telegram
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleTelegramRedirect}
            className="w-full flex justify-center py-3 px-4 border border-terminal-green bg-terminal-dark/40 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded"
          >
            Перейти к боту
          </button>
          {turnstileSiteKey && (
            <div className="flex justify-center">
              <div ref={captchaRef}></div>
            </div>
          )}
          <button
            onClick={handleTokenLogin}
            disabled={loginPending}
            className="w-full flex justify-center py-3 px-4 border border-terminal-gray text-white/80 hover:text-white hover:border-terminal-green transition-all font-medium rounded disabled:opacity-50"
          >
            {loginPending ? 'Вход...' : 'Подтвердить вход'}
          </button>
          {error && (
            <div className="border border-terminal-red bg-terminal-dark/40 p-3 rounded">
              <p className="text-terminal-red text-sm">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-white/60 border-t border-terminal-gray pt-4">
          После авторизации в боте вернитесь на сайт
        </div>
      </div>
    </div>
  );
};

export default observer(Login);
