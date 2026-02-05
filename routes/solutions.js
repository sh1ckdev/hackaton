import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { solutionCreationLimiter, checkMassOperation, logSuspiciousActivity } from '../middleware/security.js';
import { validateSolutionCreation, validateIdParam } from '../middleware/validation.js';
import { logError } from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB для презентаций
  fileFilter: (req, file, cb) => {
    // Разрешаем презентации: PDF, PPT, PPTX, ODP
    const allowedTypes = /pdf|ppt|pptx|odp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/vnd.ms-powerpoint' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                     file.mimetype === 'application/vnd.oasis.opendocument.presentation';
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только презентации (PDF, PPT, PPTX, ODP)'));
    }
  }
});

// Получение решений пользователя
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.title as case_title 
       FROM solutions s
       JOIN cases c ON s.case_id = c.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ solutions: result.rows });
  } catch (error) {
    logError('Ошибка получения решений', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение всех решений (для админа)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, case_id } = req.query;
    let query = `
      SELECT s.*, 
             u.username, u.first_name, u.last_name,
             c.title as case_title
      FROM solutions s
      JOIN users u ON s.user_id = u.id
      JOIN cases c ON s.case_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    if (case_id) {
      paramCount++;
      query += ` AND s.case_id = $${paramCount}`;
      params.push(case_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ solutions: result.rows });
  } catch (error) {
    logError('Ошибка получения решений', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение решения по ID
router.get('/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, 
              u.username, u.first_name, u.last_name,
              c.title as case_title
       FROM solutions s
       JOIN users u ON s.user_id = u.id
       JOIN cases c ON s.case_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Решение не найдено' });
    }

    const solution = result.rows[0];
    
    // Проверка прав доступа
    if (solution.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    res.json({ solution });
  } catch (error) {
    logError('Ошибка получения решения', error, { solutionId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание/обновление решения
router.post('/', 
  authenticateToken, 
  solutionCreationLimiter,
  validateSolutionCreation,
  upload.single('presentation'), 
  async (req, res) => {
  try {
    const { case_id, title, description, github_url, demo_url } = req.body;

    if (!case_id || !title) {
      return res.status(400).json({ error: 'ID кейса и название обязательны' });
    }

    // Проверка на массовые операции
    const canProceed = await checkMassOperation(req, 'solution_creation', 5);
    if (!canProceed) {
      await logSuspiciousActivity(req, 'too_many_solutions', {
        case_id: case_id
      });
      return res.status(429).json({ error: 'Слишком много решений за короткое время. Попробуйте позже.' });
    }

    // Проверка существования кейса
    const caseResult = await pool.query('SELECT * FROM cases WHERE id = $1', [case_id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    // Проверка, открыт ли кейс
    const caseData = caseResult.rows[0];
    if (caseData.opens_at && new Date(caseData.opens_at) > new Date()) {
      return res.status(403).json({ error: 'Кейс еще не открыт' });
    }

    // Проверка, не отправил ли пользователь уже решение
    const existingSolution = await pool.query(
      'SELECT * FROM solutions WHERE user_id = $1 AND case_id = $2',
      [req.user.id, case_id]
    );

    let solution;
    if (existingSolution.rows.length > 0) {
      // Обновление существующего решения
      const presentationPath = req.file ? req.file.path : existingSolution.rows[0].presentation_file_path;
      const result = await pool.query(
        `UPDATE solutions 
         SET title = $1, description = $2, github_url = $3, demo_url = $4,
             presentation_file_path = $5, status = 'pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [title, description || null, github_url, demo_url || null, presentationPath, existingSolution.rows[0].id]
      );
      solution = result.rows[0];
    } else {
      // Создание нового решения
      const result = await pool.query(
        `INSERT INTO solutions (user_id, case_id, title, description, github_url, demo_url, presentation_file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.user.id,
          case_id,
          title,
          description || null,
          github_url,
          demo_url || null,
          req.file ? req.file.path : null
        ]
      );
      solution = result.rows[0];

      // Увеличение счетчика участников кейса
      await pool.query(
        'UPDATE cases SET current_participants = current_participants + 1 WHERE id = $1',
        [case_id]
      );
    }

    res.status(201).json({ solution });
  } catch (error) {
    logError('Ошибка создания решения', error, { caseId: req.body?.case_id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Модерация решения (админ или модератор)
router.put('/:id/moderate', authenticateToken, requireModerator, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comment, score } = req.body;

    if (!status || !['approved', 'rejected', 'reviewing'].includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    const result = await pool.query(
      `UPDATE solutions 
       SET status = $1, admin_comment = $2, score = COALESCE($3, score), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, admin_comment || null, score || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Решение не найдено' });
    }

    res.json({ solution: result.rows[0] });
  } catch (error) {
    logError('Ошибка модерации', error, { solutionId: req.params.id, moderatorId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление решения
router.delete('/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка прав
    const solutionResult = await pool.query('SELECT * FROM solutions WHERE id = $1', [id]);
    if (solutionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Решение не найдено' });
    }

    if (solutionResult.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав на удаление' });
    }

    const caseId = solutionResult.rows[0].case_id;

    // Удаляем решение
    await pool.query('DELETE FROM solutions WHERE id = $1', [id]);

    // Уменьшаем счетчик участников кейса
    await pool.query(
      'UPDATE cases SET current_participants = GREATEST(0, current_participants - 1) WHERE id = $1',
      [caseId]
    );

    res.json({ message: 'Решение удалено' });
  } catch (error) {
    logError('Ошибка удаления решения', error, { solutionId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
