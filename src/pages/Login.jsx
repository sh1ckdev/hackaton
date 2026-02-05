import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import PixelSnow from '../components/PixelSnow';

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

      <div className="max-w-md w-full space-y-8 p-10 glass rounded-xl relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <span className="text-4xl font-bold text-terminal-green animate-typing">&gt;</span>
            <span className="text-4xl font-bold text-white ml-2">Hackathon</span>
          </div>
          <div className="border-l-2 border-terminal-green pl-4 mt-4 text-left">
            <h2 className="text-2xl font-semibold text-white mb-2 animate-slide-in-left">
              Вход в систему
            </h2>
            <p className="text-white/70 text-sm animate-slide-in-left-delay">
              {hasToken ? 'Завершите вход, пройдя капчу' : 'Нажмите кнопку, чтобы перейти к боту в Telegram'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {hasToken ? (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center">
                <p className="text-white/70 text-sm mb-4">
                  Пройдите капчу для завершения входа
                </p>
              </div>
              {turnstileSiteKey && (
                <div className="flex justify-center animate-scale-in">
                  <div ref={captchaRef} className="transform transition-all"></div>
                </div>
              )}
              {loginPending && (
                <div className="text-center animate-pulse">
                  <div className="inline-flex items-center gap-2 text-terminal-green">
                    <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-1"></div>
                    <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce-delay-2"></div>
                    <span className="ml-2">Вход...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <button
                onClick={handleTelegramRedirect}
                className="group w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-terminal-green bg-terminal-dark/40 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all font-medium rounded-lg transform hover:scale-105 shadow-lg shadow-terminal-green/20 hover:shadow-terminal-green/40"
              >
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Войти через Telegram</span>
              </button>
            </div>
          )}
          
          {error && (
            <div className="border border-terminal-red bg-terminal-red/10 p-4 rounded-lg animate-shake">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-terminal-red flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-terminal-red text-sm">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        {!hasToken && (
          <div className="text-xs text-white/60 border-t border-terminal-gray pt-4 text-center animate-fade-in-delay">
            После авторизации в боте вернитесь на сайт
          </div>
        )}
      </div>
    </div>
  );
};

export default observer(Login);
