import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { VkIcon } from '../components/Icons';
import Logo from '../components/Logo';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const TelegramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/>
  </svg>
);

const Login = () => {
  useDocumentTitle('Вход');
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loginPending, setLoginPending] = useState(false);
  const widgetRef = useRef(null);
  const vkAuthUrl = apiBaseUrl.replace(/\/$/, '') + '/auth/vk';
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const captchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReady, setCaptchaReady] = useState(false);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  const CATEGORY_STORAGE_KEY = 'hackathon_participant_category';
  const [participantCategory, setParticipantCategory] = useState(() => {
    try {
      const s = localStorage.getItem(CATEGORY_STORAGE_KEY);
      return (s === 'student' || s === 'school') ? s : '';
    } catch { return ''; }
  });

  useEffect(() => {
    if (authStore.isAuthenticated) navigate('/');
  }, [navigate]);

  // Turnstile captcha
  useEffect(() => {
    if (!turnstileSiteKey) return;
    if (window.turnstile) { setCaptchaReady(true); return; }
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
      'expired-callback': () => setCaptchaToken(''),
    });
  }, [turnstileSiteKey, captchaReady]);

  // Callback который Telegram вызывает после авторизации в виджете
  useEffect(() => {
    window.onTelegramAuth = async (telegramUser) => {
      if (!participantCategory) {
        setError('Выберите категорию участника: студент или школьник.');
        return;
      }
      if (turnstileSiteKey && !captchaToken) {
        setError('Пройдите капчу.');
        return;
      }
      setLoginPending(true);
      setError(null);
      try {
        const ok = await authStore.login(telegramUser, captchaToken || '', participantCategory);
        if (ok) {
          navigate('/profile');
        } else {
          setError(authStore.error || 'Ошибка входа');
        }
      } catch {
        setError('Ошибка входа');
      } finally {
        setLoginPending(false);
      }
    };
    return () => { delete window.onTelegramAuth; };
  }, [participantCategory, captchaToken, navigate, turnstileSiteKey]);

  // Вставляем Telegram Login Widget кнопку
  useEffect(() => {
    if (!botUsername || !widgetRef.current) return;
    // Очищаем предыдущий виджет
    widgetRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    widgetRef.current.appendChild(script);
  }, [botUsername]);

  const handleVkRedirect = () => {
    if (!participantCategory) {
      setError('Выберите категорию: студент или школьник.');
      return;
    }
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, participantCategory); } catch (e) {}
    window.location.href = vkAuthUrl;
  };

  const handleCategoryChange = (val) => {
    setParticipantCategory(val);
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, val); } catch (e) {}
  };

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
                onChange={(e) => handleCategoryChange(e.target.value)}
              />
              <span>Студент</span>
            </label>
            <label className="login-category-option">
              <input
                type="radio"
                name="participant_category"
                value="school"
                checked={participantCategory === 'school'}
                onChange={(e) => handleCategoryChange(e.target.value)}
              />
              <span>Школьник</span>
            </label>
          </div>

          {turnstileSiteKey && (
            <div className="login-captcha" style={{ marginBottom: 16 }}>
              <div ref={captchaRef}></div>
            </div>
          )}

          <div className="login-actions">
            <div className="login-auth-buttons">
              {/* Telegram Login Widget */}
              <div
                ref={widgetRef}
                className="login-telegram-widget-wrap"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  opacity: participantCategory ? 1 : 0.45,
                  pointerEvents: participantCategory ? 'auto' : 'none',
                  transition: 'opacity 0.2s',
                }}
              />

              {/* VK */}
              <button
                onClick={handleVkRedirect}
                className="login-vk-button"
                disabled={!participantCategory}
              >
                <VkIcon size={22} />
                <span>Войти через VK ID</span>
              </button>
            </div>

            {loginPending && (
              <div className="login-pending">
                <span className="login-dot"></span>
                <span className="login-dot delay-1"></span>
                <span className="login-dot delay-2"></span>
                <span>Выполняется вход...</span>
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

      <div className="login-terminal-note">Доступ разрешён только авторизованным участникам хакатона.</div>
    </section>
  );
};

export default observer(Login);
