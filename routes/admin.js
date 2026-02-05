import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { broadcastMessage } from '../bot.js';

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
    console.error('Ошибка получения статистики:', error);
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
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменение роли пользователя (только админ)
// Использует telegram_id вместо id из БД
router.put('/users/:telegramId/role', requireAdmin, async (req, res) => {
  try {
    const telegramIdParam = req.params.telegramId;
    const { role } = req.body;
    const MAIN_ADMIN_ID = 1046635419; // ID главного администратора (число)

    console.log('[Admin] Изменение роли:', { telegramId: telegramIdParam, role, body: req.body });

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
      console.error('[Admin] Некорректный Telegram ID:', telegramIdParam);
      return res.status(400).json({ error: 'Некорректный Telegram ID пользователя' });
    }

    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      console.error('[Admin] Некорректная роль:', role);
      return res.status(400).json({ error: 'Некорректная роль. Допустимые значения: user, moderator, admin' });
    }

    // Проверяем, существует ли пользователь по telegram_id
    const userCheck = await pool.query('SELECT id, telegram_id, role FROM users WHERE telegram_id = $1', [telegramId]);
    if (userCheck.rows.length === 0) {
      console.error('[Admin] Пользователь не найден по Telegram ID:', telegramId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const currentUser = userCheck.rows[0];
    console.log('[Admin] Текущий пользователь:', { 
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
      if (telegramIdStr === mainAdminIdStr && role !== 'admin') {
        console.warn('[Admin] Попытка снять роль у главного админа:', telegramId);
        return res.status(403).json({ error: 'Нельзя снять роль администратора у главного администратора' });
      }
    }

    // Обновляем роль по telegram_id
    console.log('[Admin] Обновление роли:', { telegramId, newRole: role });

    try {
      const result = await pool.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING *',
        [role, telegramId]
      );

      if (result.rows.length === 0) {
        console.error('[Admin] Пользователь не найден после обновления:', telegramId);
        return res.status(404).json({ error: 'Пользователь не найден после обновления' });
      }

      console.log('[Admin] Роль успешно обновлена:', result.rows[0]);
      res.json({ user: result.rows[0] });
    } catch (dbError) {
      console.error('[Admin] Ошибка SQL запроса:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint
      });
      throw dbError; // Пробрасываем ошибку в общий catch блок
    }
  } catch (error) {
    console.error('[Admin] Ошибка изменения роли:', {
      message: error.message,
      stack: error.stack,
      telegramId: req.params.telegramId,
      role: req.body?.role
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
    console.error('Ошибка рассылки сообщений:', error);
    res.status(500).json({ error: 'Ошибка сервера при рассылке сообщений' });
  }
});

export default router;
