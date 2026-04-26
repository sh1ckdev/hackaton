import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { logInfo, logError } from '../utils/logger.js';

const router = express.Router();

const CATEGORIES = ['competitions', 'site', 'general'];

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, rating, text } = req.body;
    const userId = req.user?.id;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Текст отзыва обязателен' });
    }

    const cat = category && CATEGORIES.includes(category) ? category : 'general';
    const r = rating != null ? Math.min(5, Math.max(1, parseInt(rating, 10) || 0)) : null;

    const result = await pool.query(
      `INSERT INTO feedback (user_id, category, rating, text)
       VALUES ($1, $2, $3, $4) RETURNING id, category, rating, created_at`,
      [userId, cat, r, text.trim().slice(0, 5000)]
    );

    logInfo('Новый отзыв', { id: result.rows[0].id, userId, category: cat });
    res.status(201).json({ feedback: result.rows[0], success: true });
  } catch (error) {
    logError('Ошибка отправки отзыва', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
