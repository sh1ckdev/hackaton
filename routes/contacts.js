import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireModerator } from '../middleware/auth.js';
import { logInfo, logError } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contacts ORDER BY sort_order ASC, created_at ASC'
    );
    res.json({ contacts: result.rows });
  } catch (error) {
    logError('Ошибка получения контактов', error);
    res.json({ contacts: [] });
  }
});

router.post('/', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { type, label, url, sort_order } = req.body;
    if (!type || !label || !url) {
      return res.status(400).json({ error: 'Тип, название и ссылка обязательны' });
    }
    const result = await pool.query(
      `INSERT INTO contacts (type, label, url, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [type, label, url, sort_order ?? 0]
    );
    logInfo('Создан контакт', { id: result.rows[0].id, label });
    res.json({ contact: result.rows[0] });
  } catch (error) {
    logError('Ошибка создания контакта', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/:id', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, label, url, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE contacts SET type=$1, label=$2, url=$3, sort_order=$4, updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,
      [type, label, url, sort_order ?? 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Контакт не найден' });
    logInfo('Обновлён контакт', { id });
    res.json({ contact: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления контакта', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Контакт не найден' });
    logInfo('Удалён контакт', { id });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка удаления контакта', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
