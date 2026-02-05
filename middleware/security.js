/**
 * Дополнительные middleware для безопасности
 */

import rateLimit from 'express-rate-limit';
import pool from '../db/index.js';
import { logSecurity, logError } from '../utils/logger.js';

/**
 * Валидация и санитизация входных данных
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Удаляем потенциально опасные символы
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

/**
 * Валидация URL
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Разрешаем только http и https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Проверяем длину URL
    if (url.length > 2048) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Валидация GitHub URL
 */
export const validateGitHubUrl = (url) => {
  if (!validateUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('github.com');
  } catch {
    return false;
  }
};

/**
 * Проверка длины текстовых полей
 */
export const validateFieldLength = (field, maxLength, fieldName) => {
  if (field && typeof field === 'string' && field.length > maxLength) {
    throw new Error(`${fieldName} превышает максимальную длину ${maxLength} символов`);
  }
};

/**
 * Rate limiter для создания решений
 */
export const solutionCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 решений за 15 минут
  message: 'Слишком много попыток создания решений. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем для админов и модераторов
    return req.user && (req.user.role === 'admin' || req.user.role === 'moderator');
  }
});

/**
 * Rate limiter для создания команд
 */
export const teamCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // максимум 3 команды в час
  message: 'Слишком много попыток создания команд. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter для вступления в команды
 */
export const teamJoinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 10, // максимум 10 попыток вступления в 10 минут
  message: 'Слишком много попыток вступления в команды. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter для админских операций
 */
export const adminOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // максимум 20 операций в минуту
  message: 'Слишком много операций. Подождите немного.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Логирование подозрительной активности
 */
export const logSuspiciousActivity = async (req, activity, details = {}) => {
  try {
    logSecurity(`Подозрительная активность: ${activity}`, req, details);
    // Можно добавить сохранение в БД для анализа
    // await pool.query(
    //   'INSERT INTO security_logs (ip, user_id, activity, details, created_at) VALUES ($1, $2, $3, $4, NOW())',
    //   [req.ip, req.user?.id, activity, JSON.stringify(details)]
    // );
  } catch (error) {
    logError('Ошибка логирования подозрительной активности', error);
  }
};

/**
 * Проверка на массовые операции
 */
export const checkMassOperation = async (req, operation, maxPerHour = 10) => {
  try {
    const userId = req.user?.id;
    if (!userId) return true;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Проверяем количество операций за последний час
    // Это пример для решений, можно адаптировать для других операций
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

/**
 * Защита от path traversal
 */
export const preventPathTraversal = (path) => {
  if (!path || typeof path !== 'string') return false;
  // Проверяем на наличие .. в пути
  if (path.includes('..') || path.includes('//')) {
    return false;
  }
  // Проверяем на абсолютные пути
  if (path.startsWith('/') && !path.startsWith('/uploads/')) {
    return false;
  }
  return true;
};

/**
 * Валидация ID (только числа)
 */
export const validateId = (id) => {
  if (!id) return false;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return !isNaN(numId) && numId > 0 && numId <= Number.MAX_SAFE_INTEGER;
};

/**
 * Проверка на дубликаты (защита от спама)
 */
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

/**
 * Middleware для проверки размера тела запроса
 */
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

/**
 * Защита от enumeration attacks (скрытие информации о существовании ресурсов)
 */
export const preventEnumeration = (req, res, next) => {
  // Сохраняем оригинальный метод send
  const originalSend = res.send;
  
  res.send = function(data) {
    // Для 404 ошибок не раскрываем детали
    if (res.statusCode === 404) {
      return originalSend.call(this, { error: 'Ресурс не найден' });
    }
    return originalSend.call(this, data);
  };
  
  next();
};
