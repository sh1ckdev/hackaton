import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { solutionCreationLimiter, checkMassOperation, logSuspiciousActivity } from '../middleware/security.js';
import { validateSolutionCreation, validateIdParam } from '../middleware/validation.js';
import { logError } from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadToS3, buildKey, isS3Configured, decodeFilename } from '../utils/s3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB для презентаций
  fileFilter: (req, file, cb) => {

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

const router = express.Router();

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.title as case_title 
       FROM solutions s
       JOIN cases c ON s.case_id = c.id
       JOIN team_members tm ON tm.team_id = s.team_id AND tm.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ solutions: result.rows });
  } catch (error) {
    logError('Ошибка получения решений', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, case_id } = req.query;
    let query = `
      SELECT s.*, 
             u.username, u.first_name, u.last_name,
             t.name as team_name,
             c.title as case_title
      FROM solutions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN teams t ON s.team_id = t.id
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


router.get('/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, 
              u.username, u.first_name, u.last_name,
              c.title as case_title
       FROM solutions s
       LEFT JOIN users u ON s.user_id = u.id
       JOIN cases c ON s.case_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Решение не найдено' });
    }

    const solution = result.rows[0];
    
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      const memberCheck = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [solution.team_id, req.user.id]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
    }

    res.json({ solution });
  } catch (error) {
    logError('Ошибка получения решения', error, { solutionId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/', 
  authenticateToken, 
  solutionCreationLimiter,
  upload.single('presentation'),
  validateSolutionCreation,
  async (req, res) => {
  try {
    let { case_id, title, description, github_url, demo_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Название решения обязательно' });
    }

    const teamResult = await pool.query(
      `SELECT t.id as team_id, t.assigned_case_id
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1`,
      [req.user.id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(403).json({ error: 'Для отправки решения нужна команда' });
    }

    const teamId = teamResult.rows[0].team_id;
    const assignedCaseId = teamResult.rows[0].assigned_case_id;
    if (!assignedCaseId) {
      return res.status(403).json({ error: 'Кейс вашей команде еще не назначен' });
    }

    case_id = assignedCaseId;

    const canProceed = await checkMassOperation(req, 'solution_creation', 5);
    if (!canProceed) {
      await logSuspiciousActivity(req, 'too_many_solutions', {
        case_id: case_id
      });
      return res.status(429).json({ error: 'Слишком много решений за короткое время. Попробуйте позже.' });
    }


    const caseResult = await pool.query('SELECT * FROM cases WHERE id = $1', [case_id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    const caseData = caseResult.rows[0];

    const globalOpenResult = await pool.query(`
      SELECT schedule_time
      FROM broadcast_settings
      WHERE type = 'case_opening'
        AND enabled = TRUE
        AND schedule_time IS NOT NULL
        AND case_id IS NULL
      ORDER BY schedule_time DESC
      LIMIT 1
    `);
    const globalOpenTime = globalOpenResult.rows[0]?.schedule_time || null;
    if (globalOpenTime && new Date(globalOpenTime) > new Date()) {
      return res.status(403).json({ error: 'Кейсы еще не открыты' });
    }

    const existingSolution = await pool.query(
      'SELECT * FROM solutions WHERE team_id = $1 AND case_id = $2',
      [teamId, case_id]
    );

    let presentationUrl = null;
    if (req.file) {
      const originalName = decodeFilename(req.file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      if (isS3Configured()) {
        const key = buildKey('presentations', originalName, uniqueSuffix);
        presentationUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
      }
      if (!presentationUrl) {
        const filename = `presentation-${uniqueSuffix}${path.extname(originalName)}`;
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        presentationUrl = `/uploads/${filename}`;
      }
    }

    let solution;
    if (existingSolution.rows.length > 0) {

      const presentationPath = presentationUrl || existingSolution.rows[0].presentation_file_path;
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

      const result = await pool.query(
        `INSERT INTO solutions (team_id, user_id, case_id, title, description, github_url, demo_url, presentation_file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          teamId,
          req.user.id,
          case_id,
          title,
          description || null,
          github_url,
          demo_url || null,
          presentationUrl
        ]
      );
      solution = result.rows[0];


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


router.delete('/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    

    const solutionResult = await pool.query('SELECT * FROM solutions WHERE id = $1', [id]);
    if (solutionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Решение не найдено' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      const memberCheck = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [solutionResult.rows[0].team_id, req.user.id]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Нет прав на удаление' });
      }
    }

    const caseId = solutionResult.rows[0].case_id;


    await pool.query('DELETE FROM solutions WHERE id = $1', [id]);


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
