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
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg relative overflow-hidden">
      {/* Анимированный фон */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-2 h-2 bg-terminal-green animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-terminal-cyan animate-pulse delay-300"></div>
        <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-terminal-blue animate-pulse delay-700"></div>
        <div className="absolute bottom-40 right-1/3 w-1 h-1 bg-terminal-green animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 p-10 glass rounded-xl relative z-10 border border-terminal-gray/30">
        <div className="text-center space-y-3">
          <div className="inline-block">
            <span className="text-terminal-green text-2xl font-mono">$</span>
            <span className="text-white text-2xl font-mono ml-2">hackathon login</span>
          </div>
          <div className="border-l-2 border-terminal-green pl-4 text-left">
            <h2 className="text-xl font-semibold text-white mb-1 font-mono">
              &gt; Авторизация через Telegram
            </h2>
            <p className="text-white/60 text-sm font-mono">
              Используйте бота для безопасного входа
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {(() => {
            const params = new URLSearchParams(location.search);
            const hasToken = params.get('token');
            
            if (hasToken) {
              // Если есть токен в URL - показываем капчу и статус входа
              return (
                <>
                  <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-2 glass rounded border border-terminal-green/50">
                      <span className="text-terminal-green text-sm font-mono">✓ Токен получен</span>
                    </div>
                    <p className="text-white/70 text-sm font-mono">
                      Пройдите проверку безопасности
                    </p>
                    {turnstileSiteKey && (
                      <div className="flex justify-center py-4">
                        <div ref={captchaRef}></div>
                      </div>
                    )}
                    {loginPending && (
                      <div className="flex items-center justify-center gap-2 text-terminal-green text-sm font-mono">
                        <span className="animate-pulse">●</span>
                        <span>Выполняется вход...</span>
                      </div>
                    )}
                  </div>
                </>
              );
            } else {
              // Если токена нет - показываем кнопку перехода к боту
              return (
                <div className="space-y-4">
                  <button
                    onClick={handleTelegramRedirect}
                    className="w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 px-6 border-2 border-terminal-green bg-terminal-dark/60 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-mono font-semibold rounded-lg"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0-.225 0-.44-.11-.567-.297l-1.028-1.457-3.06-1.01c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                      </svg>
                      <span>Перейти к боту</span>
                    </span>
                    <div className="absolute inset-0 bg-terminal-green transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  </button>
                  <div className="text-center text-xs text-white/50 font-mono space-y-1">
                    <p>1. Нажмите кнопку выше</p>
                    <p>2. Откройте бота в Telegram</p>
                    <p>3. Нажмите /start</p>
                    <p>4. Вернитесь на сайт</p>
                  </div>
                </div>
              );
            }
          })()}
          {error && (
            <div className="border-2 border-terminal-red bg-terminal-dark/60 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-terminal-red font-mono">✗</span>
                <p className="text-terminal-red text-sm font-mono">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-white/40 border-t border-terminal-gray/30 pt-4 text-center font-mono">
          <span className="text-terminal-green">//</span> Безопасный вход через Telegram Bot API
        </div>
      </div>
    </div>
  );
};

export default observer(Login);
