import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS info_content (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  
  const { rows } = await pool.query('SELECT id FROM info_content LIMIT 1');
  if (rows.length === 0) {
    await pool.query(`INSERT INTO info_content (content) VALUES ('')`);
  }
};

ensureTable().catch(() => {});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT content, updated_at FROM info_content ORDER BY id LIMIT 1');
    res.json({ content: rows[0]?.content || '', updated_at: rows[0]?.updated_at || null });
  } catch (error) {
    logError('Ошибка получения info-контента', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content должен быть строкой' });
    }
    await pool.query(
      `UPDATE info_content SET content = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2`,
      [content, req.user.id]
    );
    res.json({ ok: true });
  } catch (error) {
    logError('Ошибка сохранения info-контента', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
