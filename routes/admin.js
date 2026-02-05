import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { broadcastMessage } from '../bot.js';
import { adminOperationLimiter, logSuspiciousActivity } from '../middleware/security.js';
import { validateIdParam } from '../middleware/validation.js';
import { logInfo, logError, logWarn, logDatabase } from '../utils/logger.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получение статистики (только админ)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [usersCount, casesCount, solutionsCount, solutionsByStatus] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM cases'),
      pool.query('SELECT COUNT(*) as count FROM solutions'),
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM solutions 
        GROUP BY status
      `)
    ]);

    res.json({
      users: parseInt(usersCount.rows[0].count),
      cases: parseInt(casesCount.rows[0].count),
      solutions: parseInt(solutionsCount.rows[0].count),
      solutionsByStatus: solutionsByStatus.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {})
    });
  } catch (error) {
    logError('Ошибка получения статистики', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение всех пользователей (только админ)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, COUNT(s.id) as solutions_count
       FROM users u
       LEFT JOIN solutions s ON u.id = s.user_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    logError('Ошибка получения пользователей', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменение роли пользователя (только админ)
// Использует telegram_id вместо id из БД
router.put('/users/:telegramId/role', requireAdmin, adminOperationLimiter, async (req, res) => {
  try {
    const telegramIdParam = req.params.telegramId;
    const { role } = req.body;
    const MAIN_ADMIN_ID = 1046635419; // ID главного администратора (число)

    logInfo('[Admin] Изменение роли', { telegramId: telegramIdParam, role, adminId: req.user?.id });

    // Преобразуем telegram_id в число для сравнения (используем BigInt для больших чисел)
    let telegramId;
    try {
      if (typeof telegramIdParam === 'string') {
        // Проверяем, что это целое число без десятичной точки
        if (telegramIdParam.includes('.') || !/^\d+$/.test(telegramIdParam)) {
          throw new Error('Некорректный формат');
        }
        // Используем Number для чисел, которые помещаются в Number.MAX_SAFE_INTEGER
        const parsed = Number(telegramIdParam);
        if (parsed > Number.MAX_SAFE_INTEGER) {
          // Для очень больших чисел используем строку (PostgreSQL BIGINT примет строку)
          telegramId = telegramIdParam;
        } else {
          telegramId = parsed;
        }
      } else {
        telegramId = Number(telegramIdParam);
      }
      
      // Проверяем валидность значения
      if (typeof telegramId === 'number' && (isNaN(telegramId) || telegramId <= 0)) {
        throw new Error('Некорректное значение');
      }
      if (typeof telegramId === 'string' && (!/^\d+$/.test(telegramId) || telegramId === '0')) {
        throw new Error('Некорректное значение');
      }
    } catch (error) {
      logError('[Admin] Некорректный Telegram ID', null, { telegramId: telegramIdParam, adminId: req.user?.id });
      return res.status(400).json({ error: 'Некорректный Telegram ID пользователя' });
    }

    // Нормализуем роль (приводим к нижнему регистру и убираем пробелы)
    const normalizedRole = role ? String(role).toLowerCase().trim() : null;
    
    if (!normalizedRole || !['user', 'moderator', 'admin'].includes(normalizedRole)) {
      logError('[Admin] Некорректная роль', null, { 
        original: role, 
        normalized: normalizedRole,
        type: typeof role 
      });
      return res.status(400).json({ error: 'Некорректная роль. Допустимые значения: user, moderator, admin' });
    }
    
    // Используем нормализованную роль дальше
    const roleToSet = normalizedRole;

    // Проверяем, существует ли пользователь по telegram_id
    const userCheck = await pool.query('SELECT id, telegram_id, role FROM users WHERE telegram_id = $1', [telegramId]);
    if (userCheck.rows.length === 0) {
      logError('[Admin] Пользователь не найден по Telegram ID', null, { telegramId, adminId: req.user?.id });
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const currentUser = userCheck.rows[0];
    logInfo('[Admin] Текущий пользователь', { 
      id: currentUser.id, 
      telegram_id: currentUser.telegram_id, 
      currentRole: currentUser.role 
    });

    // Защита главного админа от снятия роли
    const userTelegramId = currentUser.telegram_id;
    if (userTelegramId != null) {
      // Преобразуем telegram_id в строку для надежного сравнения
      const telegramIdStr = String(userTelegramId);
      const mainAdminIdStr = String(MAIN_ADMIN_ID);
      if (telegramIdStr === mainAdminIdStr && roleToSet !== 'admin') {
        logWarn('[Admin] Попытка снять роль у главного админа', { telegramId, adminId: req.user?.id });
        return res.status(403).json({ error: 'Нельзя снять роль администратора у главного администратора' });
      }
    }

    // Обновляем роль по telegram_id
    logInfo('[Admin] Обновление роли', { 
      telegramId, 
      telegramIdType: typeof telegramId,
      newRole: roleToSet,
      roleType: typeof roleToSet,
      currentUserRole: currentUser.role
    });

    try {
      logDatabase('UPDATE', 'users', {
        role: roleToSet,
        telegramId: telegramId,
        telegramIdType: typeof telegramId
      });

      const result = await pool.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING *',
        [roleToSet, telegramId]
      );

      if (result.rows.length === 0) {
        logError('[Admin] Пользователь не найден после обновления', null, { telegramId });
        return res.status(404).json({ error: 'Пользователь не найден после обновления' });
      }

      logInfo('[Admin] Роль успешно обновлена', {
        id: result.rows[0].id,
        telegram_id: result.rows[0].telegram_id,
        role: result.rows[0].role,
        roleType: typeof result.rows[0].role
      });
      res.json({ user: result.rows[0] });
    } catch (dbError) {
      logError('[Admin] Ошибка SQL запроса', dbError, {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint,
        hint: dbError.hint,
        role: role,
        telegramId: telegramId
      });
      
      // Если ошибка связана с constraint, даем более понятное сообщение
      if (dbError.code === '23514' || dbError.constraint) {
        logError('[Admin] Ошибка constraint в БД', dbError, { telegramId, role });
        return res.status(400).json({ 
          error: 'Некорректная роль. Проверьте, что роль соответствует допустимым значениям: user, moderator, admin',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
      throw dbError; // Пробрасываем ошибку в общий catch блок
    }
  } catch (error) {
    logError('[Admin] Ошибка изменения роли', error, {
      message: error.message,
      stack: error.stack,
      telegramId: req.params.telegramId,
      role: req.body?.role,
      errorCode: error.code
    });
    res.status(500).json({ 
      error: 'Ошибка сервера при изменении роли',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Рассылка сообщений всем участникам (админ или модератор)
router.post('/broadcast', requireModerator, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Сообщение обязательно' });
    }

    const result = await broadcastMessage(message.trim());
    res.json({
      success: true,
      sent: result.success,
      failed: result.failed,
      total: result.total
    });
  } catch (error) {
    logError('Ошибка рассылки сообщений', error);
    res.status(500).json({ error: 'Ошибка сервера при рассылке сообщений' });
  }
});

export default router;
