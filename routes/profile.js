import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { logError, logInfo } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

// Получить статистику профиля
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Здесь можно добавить реальную логику подсчета статистики
    // Пока возвращаем заглушку
    res.json({
      reputation: 0,
      attendance: 0
    });
  } catch (error) {
    logError('Ошибка получения статистики профиля', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить метрики профиля
router.get('/metrics', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Здесь можно добавить реальную логику подсчета метрик
    // Пока возвращаем заглушку
    res.json({
      commits: 0,
      commits_change: 0,
      hours: 0,
      current_session: null,
      rank: null,
      rank_percentile: null
    });
  } catch (error) {
    logError('Ошибка получения метрик профиля', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить био
router.put('/bio', async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio } = req.body;

    if (bio && bio.length > 500) {
      return res.status(400).json({ error: 'Био не должно превышать 500 символов' });
    }

    const result = await pool.query(
      'UPDATE users SET bio = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [bio || null, userId]
    );

    logInfo('Обновлено био пользователя', { userId });
    res.json({ user: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления био', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить навыки
router.put('/skills', async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Навыки должны быть массивом' });
    }

    // Валидация навыков
    for (const skill of skills) {
      if (!skill.name || !skill.type) {
        return res.status(400).json({ error: 'Каждый навык должен иметь name и type' });
      }
      if (!['language', 'framework'].includes(skill.type)) {
        return res.status(400).json({ error: 'Тип навыка должен быть language или framework' });
      }
    }

    const result = await pool.query(
      'UPDATE users SET skills = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(skills), userId]
    );

    logInfo('Обновлены навыки пользователя', { userId, skillsCount: skills.length });
    res.json({ user: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления навыков', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Синхронизация профиля
router.post('/resync', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Здесь можно добавить логику синхронизации с внешними сервисами
    // Пока просто возвращаем успех
    logInfo('Синхронизация профиля', { userId });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка синхронизации профиля', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
