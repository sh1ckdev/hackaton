import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import PixelSnow from '../components/PixelSnow';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PaperPlaneIcon, RocketIcon, ShieldIcon, KeyIcon } from '../components/Icons';

const Login = () => {
  useDocumentTitle('Вход');
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

  const params = new URLSearchParams(location.search);
  const hasToken = params.get('token');

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg relative overflow-hidden">
      <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
        <PixelSnow 
          color="#ffffff"
          flakeSize={0.01}
          minFlakeSize={1.25}
          pixelResolution={200}
          speed={1.25}
          density={0.3}
          direction={125}
          brightness={1}
          depthFade={8}
          farPlane={20}
          gamma={0.4545}
          variant="square"
        />
      </div>

      <div className="max-w-lg w-full space-y-8 p-10 relative z-10 animate-fade-in-up">
        {/* Главная карточка */}
        <div className="border border-terminal-gray/30 rounded-2xl p-8 bg-terminal-dark/40 backdrop-blur-sm shadow-2xl">
          {/* Логотип и заголовок */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-terminal-green/20 blur-xl rounded-full"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-terminal-green/30 to-terminal-cyan/20 border-2 border-terminal-green/50 flex items-center justify-center">
                  <RocketIcon size={40} className="text-terminal-green" />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <h1 className="text-5xl font-bold text-white mb-2">
                <span className="text-terminal-green">&gt;</span>
                <span className="ml-2">Hackathon</span>
              </h1>
              <div className="flex items-center justify-center gap-2 mt-3">
                <ShieldIcon size={16} className="text-terminal-cyan" />
                <span className="text-sm text-gray-400">Безопасный вход через Telegram</span>
              </div>
            </div>
            <div className="border-l-2 border-terminal-green/50 pl-4 mt-6 text-left inline-block">
              <h2 className="text-2xl font-semibold text-white mb-2 animate-slide-in-left">
                {hasToken ? 'Завершение входа' : 'Добро пожаловать'}
              </h2>
              <p className="text-white/70 text-sm animate-slide-in-left-delay">
                {hasToken 
                  ? 'Пройдите проверку безопасности для завершения входа' 
                  : 'Нажмите кнопку ниже, чтобы авторизоваться через Telegram бота'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {hasToken ? (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-terminal-cyan/10 border border-terminal-cyan/30 rounded-lg mb-4">
                    <KeyIcon size={18} className="text-terminal-cyan" />
                    <p className="text-terminal-cyan text-sm font-medium">
                      Проверка безопасности
                    </p>
                  </div>
                  <p className="text-white/70 text-sm mb-6">
                    Пройдите капчу для завершения входа в систему
                  </p>
                </div>
                {turnstileSiteKey && (
                  <div className="flex justify-center animate-scale-in">
                    <div ref={captchaRef} className="transform transition-all"></div>
                  </div>
                )}
                {loginPending && (
                  <div className="text-center animate-pulse">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-terminal-green/10 border border-terminal-green/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-1"></div>
                        <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-2"></div>
                      </div>
                      <span className="ml-2 text-terminal-green font-medium">Вход в систему...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <button
                  onClick={handleTelegramRedirect}
                  className="group w-full flex items-center justify-center gap-3 py-5 px-8 border-2 border-terminal-green bg-terminal-green/10 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-semibold rounded-xl transform hover:scale-[1.02] shadow-lg shadow-terminal-green/20 hover:shadow-terminal-green/40 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-terminal-green/0 via-terminal-green/10 to-terminal-green/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center gap-3">
                    <PaperPlaneIcon size={22} className="transition-transform group-hover:translate-x-1 group-hover:rotate-12" />
                    <span className="text-lg">Войти через Telegram</span>
                    <PaperPlaneIcon size={18} className="opacity-50 transition-transform group-hover:translate-x-2 group-hover:-translate-y-1" />
                  </div>
                </button>
                
                {/* Дополнительная информация */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-terminal-dark/20 rounded-lg border border-terminal-gray/20">
                    <ShieldIcon size={24} className="text-terminal-cyan mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Безопасно</p>
                  </div>
                  <div className="text-center p-4 bg-terminal-dark/20 rounded-lg border border-terminal-gray/20">
                    <KeyIcon size={24} className="text-terminal-green mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Быстро</p>
                  </div>
                  <div className="text-center p-4 bg-terminal-dark/20 rounded-lg border border-terminal-gray/20">
                    <RocketIcon size={24} className="text-terminal-purple mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Удобно</p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="border border-terminal-red/50 bg-terminal-red/10 p-4 rounded-xl animate-shake">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-terminal-red/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-terminal-red" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-terminal-red font-medium text-sm">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!hasToken && (
            <div className="mt-8 pt-6 border-t border-terminal-gray/30">
              <div className="text-xs text-white/50 text-center space-y-2">
                <p className="flex items-center justify-center gap-2">
                  <PaperPlaneIcon size={14} className="text-terminal-green/50" />
                  <span>После авторизации в боте вернитесь на сайт</span>
                </p>
                <p className="text-gray-600">Вход выполняется автоматически</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default observer(Login);
