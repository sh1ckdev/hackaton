import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Получение всех активных кейсов
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM cases';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    } else {
      query += ' WHERE status = $1';
      params.push('active');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ cases: result.rows });
  } catch (error) {
    console.error('Ошибка получения кейсов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение кейса по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cases WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    res.json({ case: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения кейса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание кейса (только админ)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, requirements, difficulty, max_participants } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Название и описание обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO cases (title, description, requirements, difficulty, max_participants)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, requirements || null, difficulty || 'medium', max_participants || 0]
    );

    res.status(201).json({ case: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания кейса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление кейса (только админ)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, requirements, difficulty, max_participants, status } = req.body;

    const result = await pool.query(
      `UPDATE cases 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           requirements = COALESCE($3, requirements),
           difficulty = COALESCE($4, difficulty),
           max_participants = COALESCE($5, max_participants),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, description, requirements, difficulty, max_participants, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    res.json({ case: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления кейса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление кейса (только админ)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cases WHERE id = $1', [id]);
    res.json({ message: 'Кейс удален' });
  } catch (error) {
    console.error('Ошибка удаления кейса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
