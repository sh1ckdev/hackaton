import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации и прав администратора
router.use(authenticateToken);
router.use(requireAdmin);

// Получение статистики
router.get('/stats', async (req, res) => {
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

// Получение всех пользователей
router.get('/users', async (req, res) => {
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

// Изменение роли пользователя
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

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
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
