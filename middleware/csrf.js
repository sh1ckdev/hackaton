import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const EXEMPT_PATHS = new Set([
  '/api/auth/telegram',
  '/api/auth/bot',
  '/api/auth/vk',
  '/api/auth/dev-login',
]);

const parseSameSite = (value) => {
  const normalized = String(value || 'lax').toLowerCase();
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'none';
  return 'lax';
};

const getCsrfCookieOptions = () => {
  const sameSite = parseSameSite(process.env.AUTH_COOKIE_SAMESITE);
  const secure = process.env.AUTH_COOKIE_SECURE
    ? process.env.AUTH_COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
  };
};

const generateToken = () => crypto.randomBytes(32).toString('hex');
const isValidToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);

const safeEquals = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export const attachCsrfToken = (req, res, next) => {
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  if (!isValidToken(token)) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  }
  req.csrfToken = token;
  res.set('X-CSRF-Token', token);
  next();
};

export const verifyCsrfToken = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.has(req.path)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get('x-csrf-token');
  if (!isValidToken(cookieToken) || !isValidToken(headerToken) || !safeEquals(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }
  return next();
};

