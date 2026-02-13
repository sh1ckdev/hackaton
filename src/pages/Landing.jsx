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
    { type: 'registration', title: 'Registration Opens', description: 'Sign up via Telegram, form your squad, and prepare your dev environment.', date: null, active: true },
    { type: 'hacking_begins', title: 'Hacking Begins', description: 'The mainframe opens. 48 hours of non-stop coding. Energy drinks recommended.', date: null, active: false },
    { type: 'submission', title: 'Submission Deadline', description: 'Commit your final code to GitHub. Late submissions will be rejected by the firewall.', date: null, active: false }
  ];

  const defaultPrizes = [
    { rank: 2, name: 'Silver Node', amount: 5000, benefits: ['Cloud Credits', 'Dev Tools License', 'Merch Pack'], featured: false },
    { rank: 1, name: 'Gold Master', amount: 15000, benefits: ['VC Introduction', 'Audit Credits', 'Premium Hardware'], featured: true },
    { rank: 3, name: 'Bronze Link', amount: 2500, benefits: ['API Credits', 'Mentorship Session', 'Merch Pack'], featured: false }
  ];

  const defaultTracks = [
    { id: 1, name: 'AI & ML', description: 'Develop intelligent agents, predictive models, and generative systems.', tags: ['Python', 'TensorFlow'] },
    { id: 2, name: 'Cybersecurity', description: 'Build defensive tools, secure communications, or blockchain auditing.', tags: ['Rust', 'Cryptography'] },
    { id: 3, name: 'GameFi', description: 'Create immersive experiences with decentralized economies.', tags: ['Unity', 'Solidity'] }
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
              BUILD THE<br />
              <span>FUTURE_</span>
            </h1>
            <p>
              Join 500+ developers in a 48-hour sprint to deconstruct
              problems and compile solutions. Access the mainframe, deploy
              your code, and claim your bounty.
            </p>
            <div className="landing-hero-actions">
              {authStore.isAuthenticated ? (
                <Link to="/cases" className="landing-primary-btn">
                  <CaseIcon size={18} />
                  Initialize Sequence
                </Link>
              ) : (
                <Link to="/login" className="landing-primary-btn">
                  <TelegramIcon size={18} />
                  Initialize Sequence
                </Link>
              )}
              <Link to="/info" className="landing-secondary-btn">
                Read Docs
              </Link>
            </div>
            <div className="landing-timer">
              <div>
                <span>{countdown.days.toString().padStart(2, '0')}</span>
                <span>DAYS</span>
              </div>
              <div>
                <span>{countdown.hours.toString().padStart(2, '0')}</span>
                <span>HRS</span>
              </div>
              <div>
                <span>{countdown.minutes.toString().padStart(2, '0')}</span>
                <span>MIN</span>
              </div>
              <div>
                <span>{countdown.seconds.toString().padStart(2, '0')}</span>
                <span>SEC</span>
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
                <div className="line muted">&gt; Initializing environment...</div>
                <div className="line muted">&gt; Loading modules: [React, Tailwind, Node, Python]</div>
                <div className="line muted">&gt; TARGET DETECTED: 48 hours to launch</div>
                <div className="line muted">&gt; Optimizing caffeine intake... Done.</div>
                <div className="line accent">&gt; ACCESS GRANTED</div>
                <div className="line cursor">▍</div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-tracks">
          <div className="landing-section-title">/ select protocol</div>
          <h2>Event Tracks</h2>
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
          <div className="landing-section-title">/ execution sequence</div>
          <h2>Timeline</h2>
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
          <div className="landing-section-title">/ bounty board</div>
          <h2>Prizes & Rewards</h2>
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
                    <Link to="/cases" className="landing-prize-btn">View Details</Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-section landing-cta">
          <h2>Ready to Deploy?</h2>
          <p>The network is waiting. Secure your spot in the most anticipated dev event of the year.</p>
          <Link to="/login" className="landing-primary-btn">
            <TelegramIcon size={18} />
            [ LOGIN WITH TELEGRAM ]
          </Link>
          <span className="landing-cta-note">Secured via Telegram Auth Protocol v2.0</span>
        </section>

        <footer className="landing-footer">
          <Logo showVersion={true} asLink={true} />
          <span>© 2024 System Corp. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
};

export default observer(Landing);
