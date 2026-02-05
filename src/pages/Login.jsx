import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import PixelSnow from '../components/PixelSnow';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PaperPlaneIcon, TelegramIcon } from '../components/Icons';

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

      <div className="max-w-lg w-full mx-4 relative z-10">
        <div className="border border-terminal-gray/30 rounded-2xl p-8 md:p-12 bg-terminal-dark/40 backdrop-blur-xl shadow-2xl animate-fade-in-up">
          {/* Логотип и заголовок */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-terminal-green/20 to-terminal-cyan/20 border-2 border-terminal-green/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-terminal-green">&gt;</span>
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold text-white mb-1">Hackathon</h1>
                <p className="text-sm text-gray-400">Платформа для соревнований</p>
              </div>
            </div>
            
            <div className="border-l-4 border-terminal-green pl-6 text-left max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-2 animate-slide-in-left">
                Добро пожаловать
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed animate-slide-in-left-delay">
                {hasToken 
                  ? 'Завершите вход, пройдя проверку безопасности' 
                  : 'Войдите через Telegram бота для участия в соревнованиях'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {hasToken ? (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center p-6 bg-terminal-cyan/5 border border-terminal-cyan/20 rounded-xl">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terminal-cyan/10 border border-terminal-cyan/30 mb-4">
                    <PaperPlaneIcon size={32} className="text-terminal-cyan" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Почти готово!</h3>
                  <p className="text-gray-300 text-sm">
                    Пройдите проверку безопасности для завершения входа
                  </p>
                </div>
                
                {turnstileSiteKey && (
                  <div className="flex justify-center animate-scale-in">
                    <div ref={captchaRef} className="transform transition-all"></div>
                  </div>
                )}
                
                {loginPending && (
                  <div className="text-center p-2">
                    <div className="inline-flex items-center gap-3 text-terminal-green mb-2">
                      <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-1"></div>
                      <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-2"></div>
                    </div>
                    <p className="text-terminal-green font-medium">Выполняется вход...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <button
                  onClick={handleTelegramRedirect}
                  className="group w-full flex items-center justify-center gap-4 py-5 px-8 border-2 border-terminal-green bg-gradient-to-r from-terminal-green/10 to-terminal-cyan/10 text-terminal-green hover:from-terminal-green hover:to-terminal-cyan hover:text-terminal-bg transition-all font-semibold rounded-xl transform hover:scale-[1.02] shadow-lg shadow-terminal-green/20 hover:shadow-terminal-green/40 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-terminal-green/0 via-terminal-green/10 to-terminal-green/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <TelegramIcon size={24} className="relative z-10 transition-transform group-hover:scale-110" />
                  <span className="relative z-10 text-lg">Войти через Telegram</span>
                  <PaperPlaneIcon size={20} className="relative z-10 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                </button>
                
              </div>
            )}
            
            {error && (
              <div className="border border-terminal-red/50 bg-terminal-red/10 p-5 rounded-xl animate-shake">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-terminal-red shrink-0 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-terminal-red font-medium text-sm mb-1">Ошибка входа</p>
                    <p className="text-terminal-red/80 text-sm">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!hasToken && (
            <div className="mt-8 pt-6 border-t border-terminal-gray/20 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                <PaperPlaneIcon size={14} className="text-gray-600" />
                <span>После авторизации в боте вернитесь на сайт</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default observer(Login);
