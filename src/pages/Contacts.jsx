import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { TelegramIcon, VkIcon, LinkIcon } from '../components/Icons';
import api from '../utils/api';

const TYPE_META = {
  telegram:     { icon: TelegramIcon,   color: '#2AABEE', bg: 'rgba(42,171,238,0.12)' },
  telegram_bot: { icon: TelegramIcon,   color: '#2AABEE', bg: 'rgba(42,171,238,0.12)' },
  vk:           { icon: VkIcon,         color: '#4680C2', bg: 'rgba(70,128,194,0.12)' },
  youtube:      { icon: YoutubeIcon,    color: '#FF0000', bg: 'rgba(255,0,0,0.10)' },
  tiktok:       { icon: TikTokIcon,     color: '#EE1D52', bg: 'rgba(238,29,82,0.10)' },
  website:      { icon: LinkIcon,       color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  email:        { icon: MailIcon,       color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  other:        { icon: LinkIcon,       color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
};

function YoutubeIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function TikTokIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  );
}

function MailIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

const ContactCard = ({ contact }) => {
  const meta = TYPE_META[contact.type] || TYPE_META.other;
  const IconComponent = meta.icon;

  const handleClick = () => {
    if (contact.type === 'email') {
      window.location.href = `mailto:${contact.url.replace(/^mailto:/, '')}`;
    } else {
      window.open(contact.url, '_blank', 'noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="contacts-card"
      style={{ '--card-color': meta.color, '--card-bg': meta.bg }}
    >
      <div className="contacts-card-icon">
        <IconComponent size={28} />
      </div>
      <div className="contacts-card-body">
        <div className="contacts-card-label">{contact.label}</div>
        <div className="contacts-card-url">{contact.url}</div>
      </div>
      <svg className="contacts-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12H19M19 12L12 5M19 12L12 19"/>
      </svg>
    </button>
  );
};

const Contacts = () => {
  useDocumentTitle('Контакты');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/contacts')
      .then(r => setContacts(r.data.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-8" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="profile-card" style={{ padding: '28px 32px 36px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary, #f1f5f9)' }}>
          Контакты
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', marginBottom: 24 }}>
          Официальные каналы и ресурсы хакатона
        </p>

        {loading && (
          <div className="text-white/40 text-sm text-center py-8">Загрузка...</div>
        )}

        {!loading && contacts.length === 0 && (
          <div className="text-white/30 text-sm text-center py-8">
            Контакты пока не добавлены.
          </div>
        )}

        {!loading && contacts.length > 0 && (
          <div className="contacts-grid">
            {contacts.map(c => (
              <ContactCard key={c.id} contact={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;
