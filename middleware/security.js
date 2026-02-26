
import pool from '../db/index.js';
import { logSecurity, logError } from '../utils/logger.js';


export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {

      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};


export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    if (url.length > 2048) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};


export const validateGitHubUrl = (url) => {
  if (!validateUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('github.com');
  } catch {
    return false;
  }
};


export const validateFieldLength = (field, maxLength, fieldName) => {
  if (field && typeof field === 'string' && field.length > maxLength) {
    throw new Error(`${fieldName} превышает максимальную длину ${maxLength} символов`);
  }
};


const noopLimiter = (req, res, next) => next();
export const solutionCreationLimiter = noopLimiter;
export const teamCreationLimiter = noopLimiter;
export const teamJoinLimiter = noopLimiter;
export const adminOperationLimiter = noopLimiter;


export const logSuspiciousActivity = async (req, activity, details = {}) => {
  try {
    logSecurity(`Подозрительная активность: ${activity}`, req, details);





  } catch (error) {
    logError('Ошибка логирования подозрительной активности', error);
  }
};


export const checkMassOperation = async (req, operation, maxPerHour = 10) => {
  try {
    const userId = req.user?.id;
    if (!userId) return true;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    


    const result = await pool.query(
      `SELECT COUNT(*) as count FROM solutions 
       WHERE user_id = $1 AND created_at > $2`,
      [userId, oneHourAgo]
    );

    const count = parseInt(result.rows[0].count);
    if (count >= maxPerHour) {
      await logSuspiciousActivity(req, 'mass_operation', {
        operation,
        count,
        maxPerHour
      });
      return false;
    }

    return true;
  } catch (error) {
    logError('Ошибка проверки массовых операций', error, { operation });
    return true; // В случае ошибки разрешаем операцию
  }
};


export const preventPathTraversal = (path) => {
  if (!path || typeof path !== 'string') return false;

  if (path.includes('..') || path.includes('//')) {
    return false;
  }

  if (path.startsWith('/') && !path.startsWith('/uploads/')) {
    return false;
  }
  return true;
};


export const validateId = (id) => {
  if (!id) return false;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return !isNaN(numId) && numId > 0 && numId <= Number.MAX_SAFE_INTEGER;
};


export const checkDuplicate = async (req, table, field, value, timeWindow = 60000) => {
  try {
    const userId = req.user?.id;
    if (!userId) return false;

    const timeAgo = new Date(Date.now() - timeWindow);
    
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM ${table} 
       WHERE user_id = $1 AND ${field} = $2 AND created_at > $3`,
      [userId, value, timeAgo]
    );

    return parseInt(result.rows[0].count) === 0;
  } catch (error) {
    logError('Ошибка проверки дубликатов', error, { table, field, value });
    return true; // В случае ошибки разрешаем
  }
};


export const validateRequestSize = (maxSize = 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    if (contentLength > maxSize) {
      return res.status(413).json({ 
        error: `Размер запроса превышает максимально допустимый (${maxSize / 1024}KB)` 
      });
    }
    next();
  };
};


export const preventEnumeration = (req, res, next) => {

  const originalSend = res.send;
  
  res.send = function(data) {

    if (res.statusCode === 404) {
      return originalSend.call(this, { error: 'Ресурс не найден' });
    }
    return originalSend.call(this, data);
  };
  
  next();
};
