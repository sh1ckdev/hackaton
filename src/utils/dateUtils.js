const TZ = 'Europe/Moscow';

const toDate = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const s = String(ts);
  
  if (/[Z+\-]\d*$/.test(s.trim())) return new Date(s);
  
  return new Date(s.replace(' ', 'T') + 'Z');
};

const fmt = (ts, opts) => {
  if (!ts) return '—';
  const d = toDate(ts);
  if (!d || isNaN(d)) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, ...opts }).format(d);
};

export const fmtDateTime = (ts) =>
  fmt(ts, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const fmtDate = (ts) =>
  fmt(ts, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const fmtTime = (ts) =>
  fmt(ts, { hour: '2-digit', minute: '2-digit' });

export const fmtChatTime = (ts) => {
  if (!ts) return '';
  const d = toDate(ts);
  if (!d || isNaN(d)) return '';
  const nowMsk = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const dMsk   = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  if (nowMsk === dMsk) return fmtTime(ts);
  return fmt(ts, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const fmtDayLabel = (ts) =>
  fmt(ts, { day: 'numeric', month: 'long' });

export const isDifferentDay = (ts1, ts2) => {
  const toDay = (ts) => {
    const d = toDate(ts);
    if (!d || isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  };
  return toDay(ts1) !== toDay(ts2);
};
