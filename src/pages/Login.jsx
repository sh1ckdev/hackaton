import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { TelegramIcon, VkIcon } from '../components/Icons';
import Logo from '../components/Logo';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const Login = () => {
  useDocumentTitle('Вход');
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  const vkAuthUrl = apiBaseUrl.replace(/\/$/, '') + '/auth/vk';
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const captchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReady, setCaptchaReady] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [processedToken, setProcessedToken] = useState(null);
  const [participantCategory, setParticipantCategory] = useState(() => {
    try {
      const s = localStorage.getItem('hackathon_participant_category');
      return (s === 'student' || s === 'school') ? s : '';
    } catch { return ''; }
  });
  const loginAttemptRef = useRef(false);

  const CATEGORY_STORAGE_KEY = 'hackathon_participant_category';

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
    
    // Предотвращаем повторные вызовы
    if (loginAttemptRef.current) {
      return;
    }
    
    // Требуем капчу только если Turnstile настроен
    if (turnstileSiteKey && !captcha) {
      setError('Пройдите капчу.');
      return;
    }
    if (!token) {
      setError('Токен входа не найден.');
      return;
    }
    if (!participantCategory) {
      setError('Выберите категорию участника: студент или школьник.');
      return;
    }
    
    // Проверяем, не обрабатывали ли мы уже этот токен
    if (processedToken === token && loginPending) {
      return;
    }
    
    loginAttemptRef.current = true;
    setProcessedToken(token);
    setLoginPending(true);
    setError(null);
    
    try {
      const ok = await authStore.loginWithToken(token, captcha || '', participantCategory);
      if (ok) {
        navigate('/profile');
      } else {
        setError(authStore.error || 'Ошибка входа');
        // Сбрасываем флаг только при ошибке, чтобы можно было повторить
        loginAttemptRef.current = false;
      }
    } catch (err) {
      setError('Ошибка входа');
      loginAttemptRef.current = false;
    } finally {
      setLoginPending(false);
    }
  }, [location.search, captchaToken, navigate, turnstileSiteKey, processedToken, loginPending, participantCategory]);


  useEffect(() => {
    // Если уже авторизован, не делаем ничего
    if (authStore.isAuthenticated) {
      return;
    }
    
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    // Если токена нет или уже обработан, не делаем ничего
    if (!token || processedToken === token) {
      return;
    }
    
    // Если уже идет попытка входа, не делаем ничего
    if (loginPending || loginAttemptRef.current) {
      return;
    }
    
    // Если Turnstile не настроен, можно входить сразу без капчи
    if (!turnstileSiteKey || captchaToken) {
      handleTokenLogin(token, captchaToken);
    }
  }, [captchaToken, location.search, turnstileSiteKey, processedToken, loginPending]);

  const handleTelegramRedirect = () => {
    if (!participantCategory) {
      setError('Выберите категорию: студент или школьник.');
      return;
    }
    if (!botUsername) {
      setError('Укажите VITE_TELEGRAM_BOT_USERNAME в .env клиента.');
      return;
    }
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, participantCategory); } catch (e) {}
    window.location.href = `https://t.me/${botUsername}?start=login`;
  };

  const handleVkRedirect = () => {
    if (!participantCategory) {
      setError('Выберите категорию: студент или школьник.');
      return;
    }
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, participantCategory); } catch (e) {}
    window.location.href = vkAuthUrl;
  };

  const params = new URLSearchParams(location.search);
  const hasToken = params.get('token');
  const formatSessionId = (token) => {
    if (!token) return '8f9a-2b3c-4d5e';
    const compact = token.replace(/[^a-zA-Z0-9]/g, '');
    if (compact.length < 12) return compact || '8f9a-2b3c-4d5e';
    return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(-4)}`;
  };
  const sessionId = formatSessionId(hasToken);

  return (
    <section className="login-surface">
      <div className="login-logo">
        <span className="login-logo-icon">{'>'}</span>
        <Logo showVersion={false} asLink={false} />
      </div>

      <div className="login-terminal">
        <div className="login-terminal-header">
          <div className="login-terminal-dots" aria-hidden="true">
            <span className="login-dot-circle red"></span>
            <span className="login-dot-circle yellow"></span>
            <span className="login-dot-circle green"></span>
          </div>
          <div className="login-terminal-title">auth_module.sh</div>
        </div>

        <div className="login-terminal-body">
          <div className="login-terminal-lines">
            <div className="login-line">
              <span className="login-prompt login-prompt-green">sys@hackathon:~$</span>
              <span> auth --init</span>
            </div>
            <div className="login-line login-line-muted">
              <span>&gt; Подключение провайдеров ... </span>
              <span className="login-status">[OK]</span>
            </div>
            <div className="login-line login-line-muted">
              <span>&gt; Telegram · VK ID</span>
            </div>
            <div className="login-line login-line-muted">&gt; Выберите способ входа</div>
            <div className="login-line login-line-spacer"></div>
            <div className="login-line">
              <span className="login-prompt login-prompt-blue">user@hackathon:~$</span>
              <span> authenticate</span>
              <span className="login-cursor" aria-hidden="true"></span>
            </div>
          </div>

          <div className="login-terminal-divider"></div>
          <div className="login-auth-title">Войдите одним из способов</div>

          <div className="login-category-block">
            <label className="login-category-label">Я участник:</label>
            <label className="login-category-option">
              <input
                type="radio"
                name="participant_category"
                value="student"
                checked={participantCategory === 'student'}
                onChange={(e) => setParticipantCategory(e.target.value)}
              />
              <span>Студент</span>
            </label>
            <label className="login-category-option">
              <input
                type="radio"
                name="participant_category"
                value="school"
                checked={participantCategory === 'school'}
                onChange={(e) => setParticipantCategory(e.target.value)}
              />
              <span>Школьник</span>
            </label>
          </div>

          <div className="login-actions">
            {hasToken ? (
              <div className="login-token-block">
                <div className="login-token-title">Почти готово!</div>
                <div className="login-token-text">
                  {turnstileSiteKey
                    ? 'Пройдите проверку безопасности для завершения входа'
                    : 'Завершите вход'}
                </div>

                {turnstileSiteKey && (
                  <div className="login-captcha">
                    <div ref={captchaRef}></div>
                  </div>
                )}

                {loginPending && (
                  <div className="login-pending">
                    <span className="login-dot"></span>
                    <span className="login-dot delay-1"></span>
                    <span className="login-dot delay-2"></span>
                    <span>Выполняется вход...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="login-auth-buttons">
                <button onClick={handleTelegramRedirect} className="login-telegram-button" disabled={!participantCategory}>
                  <TelegramIcon size={22} />
                  <span>Войти через Telegram</span>
                </button>
                <button onClick={handleVkRedirect} className="login-vk-button" disabled={!participantCategory}>
                  <VkIcon size={22} />
                  <span>Войти через VK ID</span>
                </button>
              </div>
            )}

            {error && (
              <div className="login-error">
                <strong>Ошибка входа</strong>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="login-terminal-note">Доступ разрешен только авторизованным участникам хакатона.</div>
    </section>
  );
};

export default observer(Login);
