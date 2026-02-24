import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, TelegramIcon } from '../components/Icons';
import AppHeader from '../components/AppHeader';
import Logo from '../components/Logo';
import api from '../utils/api';

const Landing = () => {
  useDocumentTitle('Главная');
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchLandingData();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLandingData = async () => {
    try {
      const [timelineRes, prizesRes, tracksRes] = await Promise.all([
        api.get('/landing/timeline').catch(() => ({ data: { timeline: [] } })),
        api.get('/landing/prizes').catch(() => ({ data: { prizes: [] } })),
        api.get('/landing/tracks').catch(() => ({ data: { tracks: [] } }))
      ]);
      setTimeline(timelineRes.data.timeline || []);
      setPrizes(prizesRes.data.prizes || []);
      setTracks(tracksRes.data.tracks || []);
    } catch (error) {
      console.error('Ошибка загрузки данных', error);
    }
  };

  const updateCountdown = () => {
    // Получаем дату начала из timeline или используем дефолт
    const startDate = timeline.find(t => t.type === 'hacking_begins')?.date 
      || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = new Date(startDate) - now;
    
    if (diff > 0) {
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes} UTC`;
  };

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  const defaultTimeline = [
    { type: 'registration', title: 'Старт регистрации', description: 'Войдите через Telegram, соберите команду и подготовьте рабочее окружение.', date: null, active: true },
    { type: 'hacking_begins', title: 'Начало хакатона', description: 'Открывается доступ к кейсам. 48 часов непрерывной разработки.', date: null, active: false },
    { type: 'submission', title: 'Дедлайн сдачи решений', description: 'Залейте финальный код в GitHub. Просроченные решения не принимаются.', date: null, active: false }
  ];

  const defaultPrizes = [
    { rank: 2, name: 'Серебряный нод', amount: 5000, benefits: ['Облачные кредиты', 'Лицензия на dev-инструменты', 'Мерч-пак'], featured: false },
    { rank: 1, name: 'Золотой мастер', amount: 15000, benefits: ['Интро к инвесторам', 'Кредиты на аудит', 'Премиальное железо'], featured: true },
    { rank: 3, name: 'Бронзовый линк', amount: 2500, benefits: ['API-кредиты', 'Менторская сессия', 'Мерч-пак'], featured: false }
  ];

  const defaultTracks = [
    { id: 1, name: 'AI & ML', description: 'Разработка интеллектуальных агентов, моделей предсказания и генеративных систем.', tags: ['Python', 'TensorFlow'] },
    { id: 2, name: 'Кибербезопасность', description: 'Инструменты защиты, безопасные коммуникации, анализ смарт-контрактов и блокчейна.', tags: ['Rust', 'Cryptography'] },
    { id: 3, name: 'GameDev / GameFi', description: 'Игровые механики, геймификация и встроенные экономики.', tags: ['Unity', 'Solidity'] }
  ];

  const displayTimeline = timeline.length > 0 ? timeline : defaultTimeline;
  const displayPrizes = prizes.length > 0 ? prizes : defaultPrizes;
  const displayTracks = tracks.length > 0 ? tracks : defaultTracks;
  
  return (
    <div className="landing-page">
      <AppHeader
        isAuthenticated={authStore.isAuthenticated}
        user={authStore.user}
        isAdmin={authStore.isAdmin}
        onLogout={handleLogout}
      />

      <div className="landing-content">
        <section className="landing-hero">
          <div className="landing-hero-left">
            <h1>
              СОЗДАЙ<br />
              <span>БУДУЩЕЕ_</span>
            </h1>
            <p>
              Присоединяйся к сотням разработчиков в 48‑часовом спринте: разбирайся в кейсах,
              собирай решения и выкатывай продакшн. Доступ к инфраструктуре, наставникам и призам.
            </p>
            <div className="landing-hero-actions">
              {authStore.isAuthenticated ? (
                <Link to="/cases" className="landing-primary-btn">
                  <CaseIcon size={18} />
                  Перейти к кейсам
                </Link>
              ) : (
                <Link to="/login" className="landing-primary-btn">
                  <TelegramIcon size={18} />
                  Войти через Telegram
                </Link>
              )}
              <Link to="/info" className="landing-secondary-btn">
                Подробнее о хакатоне
              </Link>
            </div>
            <div className="landing-timer">
              <div>
                <span>{countdown.days.toString().padStart(2, '0')}</span>
                  <span>ДНЕЙ</span>
              </div>
              <div>
                <span>{countdown.hours.toString().padStart(2, '0')}</span>
                  <span>ЧАС</span>
              </div>
              <div>
                <span>{countdown.minutes.toString().padStart(2, '0')}</span>
                  <span>МИН</span>
              </div>
              <div>
                <span>{countdown.seconds.toString().padStart(2, '0')}</span>
                  <span>СЕК</span>
              </div>
            </div>
          </div>
          <div className="landing-hero-right">
            <div className="landing-terminal">
              <div className="landing-terminal-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
                <span>terminal - zsh - 8/20/24</span>
              </div>
              <div className="landing-terminal-body">
                <div className="line">➜ hack_node init</div>
                <div className="line muted">&gt; Инициализация окружения...</div>
                <div className="line muted">&gt; Загрузка модулей: [React, Tailwind, Node, Python]</div>
                <div className="line muted">&gt; ОБНАРУЖЕН СОБЫТИЕ: старт через 48 часов</div>
                <div className="line muted">&gt; Оптимизация уровня кофеина... Готово.</div>
                <div className="line accent">&gt; ДОСТУП РАЗРЕШЕН</div>
                <div className="line cursor">▍</div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-tracks">
          <div className="landing-section-title">/ выбор трека</div>
          <h2>Треки хакатона</h2>
          <div className="landing-track-grid">
            {displayTracks.map((track, idx) => (
              <div key={track.id || idx} className="landing-track-card">
                <div className="landing-track-header">{String(idx + 1).padStart(2, '0')}. {track.name}</div>
                <p>{track.description}</p>
                <div className="landing-tag-row">
                  {track.tags?.map((tag, tagIdx) => (
                    <span key={tagIdx}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-timeline">
          <div className="landing-section-title">/ последовательность</div>
          <h2>Таймлайн</h2>
          <div className="landing-timeline-list">
            {displayTimeline.map((item, idx) => {
              const isLeft = idx % 2 === 0;
              const isActive = item.active || false;
              return (
                <div key={item.type || idx} className={`landing-timeline-item ${isLeft ? 'landing-timeline-item-left' : 'landing-timeline-item-right'}`}>
                  {isLeft ? (
                    <>
                      <div className="landing-timeline-content">
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <div className={`landing-timeline-node ${isActive ? 'landing-timeline-node-active' : ''}`}></div>
                      <span className={`landing-timeline-date ${isActive ? 'landing-timeline-date-active' : ''}`}>
                        {formatDate(item.date)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`landing-timeline-date ${isActive ? 'landing-timeline-date-active' : ''}`}>
                        {formatDate(item.date)}
                      </span>
                      <div className={`landing-timeline-node ${isActive ? 'landing-timeline-node-active' : ''}`}></div>
                      <div className="landing-timeline-content">
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-section landing-prizes">
          <div className="landing-section-title">/ призовой фонд</div>
          <h2>Призы и награды</h2>
          <div className="landing-prize-grid">
            {displayPrizes.map((prize) => {
              const rankClass = prize.rank === 1 ? 'landing-prize-rank-gold' : 
                               prize.rank === 2 ? 'landing-prize-rank-silver' : 
                               'landing-prize-rank-bronze';
              const amountClass = prize.rank === 1 ? 'landing-prize-amount-featured' : 
                                 prize.rank === 3 ? 'landing-prize-amount-bronze' : '';
              return (
                <div key={prize.rank} className={`landing-prize-card ${prize.featured ? 'is-featured' : ''}`}>
                  {prize.featured && <div className="landing-prize-top-label">TOP PRIZE</div>}
                  <div className={`landing-prize-rank ${rankClass}`}>{prize.rank}</div>
                  <h3>{prize.name}</h3>
                  <p className={`landing-prize-amount ${amountClass}`}>${prize.amount.toLocaleString()}</p>
                  <ul className={`landing-prize-benefits ${prize.featured ? 'landing-prize-benefits-featured' : ''}`}>
                    {prize.benefits?.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                  {prize.featured && (
                    <Link to="/cases" className="landing-prize-btn">Смотреть кейсы</Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-section landing-cta">
          <h2>Готов(а) залетать?</h2>
          <p>Сеть уже ждёт. Займи место на одном из самых ожидаемых dev‑ивентов года.</p>
          <Link to="/login" className="landing-primary-btn">
            <TelegramIcon size={18} />
            [ ВОЙТИ ЧЕРЕЗ TELEGRAM ]
          </Link>
          <span className="landing-cta-note">Авторизация и вход по Telegram, токены одноразовые.</span>
        </section>

        <footer className="landing-footer">
          <Logo showVersion={true} asLink={true} />
          <span>© 2024 System Corp. Все права защищены.</span>
        </footer>
      </div>
    </div>
  );
};

export default observer(Landing);
