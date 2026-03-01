import crypto from 'crypto';
import net from 'net';
import pool from '../db/index.js';
import { logError } from './logger.js';

const cleanForwardedFor = (xff) => {
  if (!xff || typeof xff !== 'string') return null;
  return xff.split(',')[0]?.trim() || null;
};

export const getClientIp = (req) => {
  const cfIp = req.get('cf-connecting-ip');
  const realIp = req.get('x-real-ip');
  const xff = cleanForwardedFor(req.get('x-forwarded-for'));
  const rawIp = cfIp || realIp || xff || req.ip || req.connection?.remoteAddress || null;
  return normalizeIp(rawIp);
};

export const normalizeIp = (ip) => {
  if (!ip || typeof ip !== 'string') return null;
  let v = ip.trim();
  if (!v) return null;

  // [IPv6]:port
  const bracketMatch = v.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) {
    v = bracketMatch[1];
  } else {
    // IPv4:port
    const ipv4PortMatch = v.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
    if (ipv4PortMatch) {
      v = ipv4PortMatch[1];
    }
  }

  // Убираем zone id у IPv6 (например, fe80::1%eth0)
  const zoneIndex = v.indexOf('%');
  if (zoneIndex > -1) {
    v = v.slice(0, zoneIndex);
  }

  // Unmap IPv4 from IPv6-mapped form
  if (v.startsWith('::ffff:')) {
    const mapped = v.slice(7);
    if (net.isIP(mapped) === 4) return mapped;
  }

  if (net.isIP(v)) return v;
  return null;
};

export const createRequestId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
};

export const writeAuthAudit = async (req, event, options = {}) => {
  const { userId = null, success = true, details = {} } = options;
  const ip = getClientIp(req);
  const requestId = req.requestId || null;
  const userAgent = req.get('user-agent') || null;

  try {
    await pool.query(
      `INSERT INTO auth_audit (
         event, success, user_id, ip_address, user_agent, request_id, details
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [event, success, userId, ip, userAgent, requestId, JSON.stringify(details || {})]
    );
  } catch (error) {
    logError('Ошибка записи auth_audit', error, { event, userId, requestId });
  }
};

