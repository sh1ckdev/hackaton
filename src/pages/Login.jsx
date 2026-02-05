import { useEffect, useRef, useState, useCallback } from 'react';
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

  const handleTokenLogin = useCallback(async (tokenFromUrl = null, captchaTokenFromCallback = null) => {
    const params = new URLSearchParams(location.search);
    const token = tokenFromUrl || params.get('token');
    const captcha = captchaTokenFromCallback || captchaToken;
    
    if (!captcha) {
      setError('Пройдите капчу.');
      return;
    }
    if (!token) {
      setError('Токен входа не найден.');
      return;
    }
    
    setLoginPending(true);
    setError(null);
    const ok = await authStore.loginWithToken(token, captcha);
    setLoginPending(false);
    if (ok) {
      navigate('/profile');
    } else {
      setError(authStore.error || 'Ошибка входа');
    }
  }, [location.search, captchaToken, navigate]);

  // Автоматический вход после прохождения капчи, если есть токен в URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token && captchaToken && !loginPending) {
      handleTokenLogin(token, captchaToken);
    }
  }, [captchaToken, location.search, loginPending, handleTokenLogin]);

  const handleTelegramRedirect = () => {
    if (!botUsername) {
      setError('Укажите VITE_TELEGRAM_BOT_USERNAME в .env клиента.');
      return;
    }
    window.location.href = `https://t.me/${botUsername}?start=login`;
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
          {(() => {
            const params = new URLSearchParams(location.search);
            const hasToken = params.get('token');
            
            if (hasToken) {
              // Если есть токен в URL - показываем капчу и статус входа
              return (
                <>
                  <div className="text-center text-white/70 text-sm mb-2">
                    Пройдите капчу для завершения входа
                  </div>
                  {turnstileSiteKey && (
                    <div className="flex justify-center">
                      <div ref={captchaRef}></div>
                    </div>
                  )}
                  {loginPending && (
                    <div className="text-center text-terminal-green text-sm">
                      Вход...
                    </div>
                  )}
                </>
              );
            } else {
              // Если токена нет - показываем кнопку перехода к боту
              return (
                <button
                  onClick={handleTelegramRedirect}
                  className="w-full flex justify-center py-3 px-4 border border-terminal-green bg-terminal-dark/40 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded"
                >
                  Перейти к боту
                </button>
              );
            }
          })()}
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
