import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, TelegramIcon } from '../components/Icons';
import AppHeader from '../components/AppHeader';
import Logo from '../components/Logo';
import api from '../utils/api';
import codeSprintLogo from '../assets/codesprintlogo.svg';

const Landing = () => {
  useDocumentTitle('Главная');
  const navigate = useNavigate();

  const [timeline, setTimeline] = useState([]);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    fetchLandingData();
  }, []);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeline]);

  const fetchLandingData = async () => {
    try {
      const [timelineRes] = await Promise.all([
        api.get('/landing/timeline').catch(() => ({ data: { timeline: [] } }))
      ]);
      setTimeline(timelineRes.data.timeline || []);
    } catch (error) {
      console.error('Ошибка загрузки данных', error);
    }
  };

  const updateCountdown = () => {
    const startDate = timeline.find(t => t.type === 'hacking_begins')?.date;
    if (!startDate) return;

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
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
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

  const displayTimeline = timeline;

  return (
    <div className="landing-page">
      <AppHeader
        isAuthenticated={authStore.isAuthenticated}
        user={authStore.user}
        isAdmin={authStore.isAdmin}
        onLogout={handleLogout}
      />

      <div className="landing-content">

        {/* HERO — 100vh */}
        <section
          className="landing-hero"
          style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 20px'
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* ЛОГО БОЛЬШЕ 640px */}
            <img
              src={codeSprintLogo}
              alt="Code Sprint Logo"
              style={{
                width: 'min(1000px, 95vw)',
                height: 'auto',
                marginBottom: '40px'
              }}
            />

            {/* КНОПКИ */}
            <div
              className="landing-hero-actions"
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginBottom: '40px'
              }}
            >
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

            {/* ТАЙМЕР */}
            <div
              className="landing-timer"
              style={{
                display: 'flex',
                gap: '32px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              {['days', 'hours', 'minutes', 'seconds'].map((key) => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {countdown[key].toString().padStart(2, '0')}
                  </span>
                  <div>{({ days: 'ДНЕЙ', hours: 'ЧАС', minutes: 'МИН', seconds: 'СЕК' })[key]}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="landing-section landing-timeline">
          <div className="landing-section-title">
            / последовательность
          </div>
          <h2>Таймлайн</h2>

          <div className="landing-timeline-list">
            {displayTimeline.map((item, idx) => {
              const isLeft = idx % 2 === 0;

              return (
                <div
                  key={item.id || item.type || idx}
                  className={`landing-timeline-item ${
                    isLeft
                      ? 'landing-timeline-item-left'
                      : 'landing-timeline-item-right'
                  }`}
                >
                  {isLeft ? (
                    <>
                      <div className="landing-timeline-content">
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <div className="landing-timeline-node" />
                      <span className="landing-timeline-date">
                        {formatDate(item.date)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="landing-timeline-date">
                        {formatDate(item.date)}
                      </span>
                      <div className="landing-timeline-node" />
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

        {/* FOOTER */}
        <footer className="landing-footer">
          <Logo showVersion={true} asLink={true} />
          <span>© 2026 XTRA development. Все права защищены.</span>
        </footer>

      </div>
    </div>
  );
};

export default observer(Landing);