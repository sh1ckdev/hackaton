const TZ = 'Europe/Moscow';

// PostgreSQL TIMESTAMP (без timezone) приходит без 'Z', браузер может трактовать как локальное время.
// Принудительно добавляем 'Z', чтобы браузер всегда читал как UTC.
const toDate = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const s = String(ts);
  // Если уже есть timezone-маркер (Z, +, -) — не трогаем
  if (/[Z+\-]\d*$/.test(s.trim())) return new Date(s);
  // Иначе — добавляем Z (UTC)
  return new Date(s.replace(' ', 'T') + 'Z');
};

const fmt = (ts, opts) => {
  if (!ts) return '—';
  const d = toDate(ts);
  if (!d || isNaN(d)) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, ...opts }).format(d);
};

/** «14.06.2025, 18:30» */
export const fmtDateTime = (ts) =>
  fmt(ts, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** «14.06.2025» */
export const fmtDate = (ts) =>
  fmt(ts, { day: '2-digit', month: '2-digit', year: 'numeric' });

/** «18:30» */
export const fmtTime = (ts) =>
  fmt(ts, { hour: '2-digit', minute: '2-digit' });

/** Для чата: сегодня → «18:30», иначе → «14.06 18:30» */
export const fmtChatTime = (ts) => {
  if (!ts) return '';
  const d = toDate(ts);
  if (!d || isNaN(d)) return '';
  const nowMsk = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const dMsk   = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  if (nowMsk === dMsk) return fmtTime(ts);
  return fmt(ts, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** «14 июня» — для разделителей дней в чате */
export const fmtDayLabel = (ts) =>
  fmt(ts, { day: 'numeric', month: 'long' });

/** Проверить, относится ли две метки к разным дням (МСК) */
export const isDifferentDay = (ts1, ts2) => {
  const toDay = (ts) => {
    const d = toDate(ts);
    if (!d || isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  };
  return toDay(ts1) !== toDay(ts2);
};
