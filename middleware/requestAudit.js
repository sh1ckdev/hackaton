import pool from '../db/index.js';
import { logError, logSecurity } from '../utils/logger.js';
import { createRequestId, getClientIp } from '../utils/securityAudit.js';

const REQUEST_WINDOW_MS = Math.max(10, Number(process.env.SECURITY_DDOS_WINDOW_SEC || 60)) * 1000;
const REQUEST_THRESHOLD = Math.max(20, Number(process.env.SECURITY_DDOS_REQ_THRESHOLD || 180));
const ALERT_COOLDOWN_MS = Math.max(30, Number(process.env.SECURITY_DDOS_ALERT_COOLDOWN_SEC || 300)) * 1000;

const perIpEvents = new Map(); // ip -> timestamps[]
const perIpCooldown = new Map(); // ip -> lastAlertTs

const addIpTick = (ip, ts) => {
  const prev = perIpEvents.get(ip) || [];
  prev.push(ts);
  const minTs = ts - REQUEST_WINDOW_MS;
  while (prev.length && prev[0] < minTs) prev.shift();
  perIpEvents.set(ip, prev);
  return prev.length;
};

const shouldAlert = (ip, ts) => {
  const last = perIpCooldown.get(ip) || 0;
  if (ts - last < ALERT_COOLDOWN_MS) return false;
  perIpCooldown.set(ip, ts);
  return true;
};

const cleanupState = (ts) => {
  const staleTs = ts - Math.max(REQUEST_WINDOW_MS, ALERT_COOLDOWN_MS) * 3;
  for (const [ip, ticks] of perIpEvents.entries()) {
    const filtered = ticks.filter((v) => v >= staleTs);
    if (filtered.length === 0) perIpEvents.delete(ip);
    else perIpEvents.set(ip, filtered);
  }
  for (const [ip, cooldownTs] of perIpCooldown.entries()) {
    if (cooldownTs < staleTs) perIpCooldown.delete(ip);
  }
};

const saveSecurityEvent = async (req, eventType, details) => {
  const ip = getClientIp(req);
  const userId = req.user?.id || null;
  try {
    await pool.query(
      `INSERT INTO security_events (event_type, ip_address, user_id, path, method, details)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [eventType, ip, userId, req.path, req.method, JSON.stringify(details || {})]
    );
  } catch (error) {
    logError('Ошибка записи security_events', error, { eventType, ip, userId });
  }
};

export const attachRequestContext = (req, res, next) => {
  req.requestId = req.get('x-request-id') || createRequestId();
  res.set('X-Request-Id', req.requestId);
  next();
};

export const requestAuditMiddleware = (req, res, next) => {
  const startAt = Date.now();

  res.on('finish', async () => {
    const now = Date.now();
    const durationMs = now - startAt;
    const ip = getClientIp(req);
    const userId = req.user?.id || null;
    const userRole = req.user?.role || null;
    const userAgent = req.get('user-agent') || null;
    const origin = req.get('origin') || null;
    const contentLength = Number(res.get('content-length') || 0) || 0;
    const requestCountInWindow = addIpTick(ip || 'unknown', now);

    if (ip && requestCountInWindow >= REQUEST_THRESHOLD && shouldAlert(ip, now)) {
      const details = {
        requestCountInWindow,
        windowSeconds: Math.floor(REQUEST_WINDOW_MS / 1000),
        threshold: REQUEST_THRESHOLD,
      };
      logSecurity('Возможная DDoS-активность по IP', req, details);
      await saveSecurityEvent(req, 'possible_ddos', details);
    }

    cleanupState(now);

    try {
      await pool.query(
        `INSERT INTO request_audit (
          request_id, ip_address, method, path, query_string, status_code,
          duration_ms, content_length, user_id, user_role, user_agent, origin
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          req.requestId,
          ip,
          req.method,
          req.path,
          req.originalUrl || req.url || '',
          res.statusCode,
          durationMs,
          contentLength,
          userId,
          userRole,
          userAgent,
          origin,
        ]
      );
    } catch (error) {
      logError('Ошибка записи request_audit', error, { requestId: req.requestId, path: req.path });
    }
  });

  next();
};

