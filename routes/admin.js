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
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const MAIN_ADMIN_ID = '1046635419'; // ID главного администратора

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    // Проверяем, существует ли пользователь
    const userCheck = await pool.query('SELECT id, telegram_id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Защита главного админа от снятия роли
    const userTelegramId = userCheck.rows[0].telegram_id?.toString();
    if (userTelegramId === MAIN_ADMIN_ID && role !== 'admin') {
      return res.status(403).json({ error: 'Нельзя снять роль администратора у главного администратора' });
    }

    // Обновляем роль
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Ошибка изменения роли:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
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
