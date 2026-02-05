import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { adminOperationLimiter } from '../middleware/security.js';
import { validateCaseCreation, validateIdParam } from '../middleware/validation.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

// Получение всех активных кейсов
router.get('/', async (req, res) => {
  try {
    const { status, include_future } = req.query;
    let query = 'SELECT * FROM cases WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Фильтр по статусу
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    } else {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push('active');
    }

    // Показываем все кейсы, включая будущие (убрали фильтрацию по дате открытия)
    // Кейсы с opens_at > NOW будут показаны с обратным отсчетом на фронтенде

    query += ' ORDER BY COALESCE(opens_at, created_at) DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json({ cases: result.rows });
  } catch (error) {
    logError('Ошибка получения кейсов', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение кейса по ID
router.get('/:id', validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cases WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    res.json({ case: result.rows[0] });
  } catch (error) {
    logError('Ошибка получения кейса', error, { id: req.params.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание кейса (админ или модератор)
router.post('/', authenticateToken, requireModerator, adminOperationLimiter, validateCaseCreation, async (req, res) => {
  try {
    const { title, description, requirements, difficulty, max_participants, opens_at } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Название и описание обязательны' });
    }

    // Валидация даты открытия
    let opensAtValue = null;
    if (opens_at) {
      opensAtValue = new Date(opens_at);
      if (isNaN(opensAtValue.getTime())) {
        return res.status(400).json({ error: 'Некорректная дата открытия' });
      }
    }

    const result = await pool.query(
      `INSERT INTO cases (title, description, requirements, difficulty, max_participants, opens_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, requirements || null, difficulty || 'medium', max_participants || 0, opensAtValue]
    );

    res.status(201).json({ case: result.rows[0] });
  } catch (error) {
    logError('Ошибка создания кейса', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление кейса (админ или модератор)
router.put('/:id', authenticateToken, requireModerator, adminOperationLimiter, validateIdParam, validateCaseCreation, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, requirements, difficulty, max_participants, status, opens_at } = req.body;

    // Валидация даты открытия
    let opensAtValue = undefined;
    if (opens_at !== undefined) {
      if (opens_at === null) {
        opensAtValue = null;
      } else {
        opensAtValue = new Date(opens_at);
        if (isNaN(opensAtValue.getTime())) {
          return res.status(400).json({ error: 'Некорректная дата открытия' });
        }
      }
    }

    const result = await pool.query(
      `UPDATE cases 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           requirements = COALESCE($3, requirements),
           difficulty = COALESCE($4, difficulty),
           max_participants = COALESCE($5, max_participants),
           status = COALESCE($6, status),
           opens_at = CASE WHEN $7 IS NOT NULL THEN $7::timestamp ELSE opens_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [title, description, requirements, difficulty, max_participants, status, opensAtValue, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    res.json({ case: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления кейса', error, { caseId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление кейса (только админ)
router.delete('/:id', authenticateToken, requireAdmin, adminOperationLimiter, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cases WHERE id = $1', [id]);
    res.json({ message: 'Кейс удален' });
  } catch (error) {
    logError('Ошибка удаления кейса', error, { caseId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
