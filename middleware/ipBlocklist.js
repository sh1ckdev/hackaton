import { normalizeIp, getClientIp } from '../utils/securityAudit.js';

const blockedIps = new Map(); 

const now = () => Date.now();
const DEFAULT_BAN_MINUTES = 60;
const MAX_BAN_MINUTES = 60 * 24 * 30;

const cleanupExpired = () => {
  const ts = now();
  for (const [ip, info] of blockedIps.entries()) {
    if (!info?.expiresAt || info.expiresAt <= ts) blockedIps.delete(ip);
  }
};

export const banIp = (ipRaw, minutes = DEFAULT_BAN_MINUTES, reason = 'manual', createdBy = null) => {
  const ip = normalizeIp(ipRaw);
  if (!ip) return null;
  const safeMinutes = Math.max(1, Math.min(MAX_BAN_MINUTES, Number(minutes) || DEFAULT_BAN_MINUTES));
  const createdAt = now();
  blockedIps.set(ip, {
    createdAt,
    expiresAt: createdAt + safeMinutes * 60 * 1000,
    reason: String(reason || 'manual').slice(0, 500),
    createdBy: createdBy || null,
  });
  return ip;
};

export const unbanIp = (ipRaw) => {
  const ip = normalizeIp(ipRaw);
  if (!ip) return false;
  return blockedIps.delete(ip);
};

export const getActiveIpBans = () => {
  cleanupExpired();
  return Array.from(blockedIps.entries()).map(([ip, info]) => ({
    ip,
    ...info,
  })).sort((a, b) => b.createdAt - a.createdAt);
};

export const isIpBlocked = (ipRaw) => {
  cleanupExpired();
  const ip = normalizeIp(ipRaw);
  if (!ip) return null;
  const info = blockedIps.get(ip);
  if (!info) return null;
  if (info.expiresAt <= now()) {
    blockedIps.delete(ip);
    return null;
  }
  return { ip, ...info };
};

export const ipBlocklistMiddleware = (req, res, next) => {
  const ip = getClientIp(req);
  const blocked = isIpBlocked(ip);
  if (!blocked) return next();
  res.set('Retry-After', String(Math.max(1, Math.ceil((blocked.expiresAt - now()) / 1000))));
  return res.status(403).json({
    error: 'IP временно заблокирован',
    reason: blocked.reason || 'policy_violation',
    expires_at: new Date(blocked.expiresAt).toISOString(),
  });
};

