import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { adminOperationLimiter } from '../middleware/security.js';
import { validateCaseCreation, validateIdParam } from '../middleware/validation.js';
import { logError } from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const uploadsCasesDir = path.join(__dirname, '../uploads/cases');
if (!fs.existsSync(uploadsCasesDir)) {
  fs.mkdirSync(uploadsCasesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsCasesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `case-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {

    const allowedTypes = /pdf|doc|docx|zip|rar|txt|md|jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.mimetype === 'application/zip' ||
                     file.mimetype === 'application/x-rar-compressed' ||
                     file.mimetype === 'text/plain' ||
                     file.mimetype === 'text/markdown' ||
                     file.mimetype.startsWith('image/');
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  }
});

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const { status, include_future } = req.query;
    let query = 'SELECT * FROM cases WHERE 1=1';
    const params = [];
    let paramCount = 0;


    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    } else {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push('active');
    }




    query += ' ORDER BY COALESCE(opens_at, created_at) DESC, created_at DESC';

    const result = await pool.query(query, params);
    

    const cases = result.rows.map(caseItem => {
      if (caseItem.links && typeof caseItem.links === 'object') {
        caseItem.links = Array.isArray(caseItem.links) ? caseItem.links : [];
      }
      if (caseItem.attachments && typeof caseItem.attachments === 'object') {
        caseItem.attachments = Array.isArray(caseItem.attachments) ? caseItem.attachments : [];
      }
      return caseItem;
    });
    
    res.json({ cases });
  } catch (error) {
    logError('Ошибка получения кейсов', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/:id', validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cases WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    const caseItem = result.rows[0];

    if (caseItem.links && typeof caseItem.links === 'object') {
      caseItem.links = Array.isArray(caseItem.links) ? caseItem.links : [];
    }
    if (caseItem.attachments && typeof caseItem.attachments === 'object') {
      caseItem.attachments = Array.isArray(caseItem.attachments) ? caseItem.attachments : [];
    }

    res.json({ case: caseItem });
  } catch (error) {
    logError('Ошибка получения кейса', error, { id: req.params.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/', 
  authenticateToken, 
  requireModerator, 
  adminOperationLimiter, 
  validateCaseCreation,
  upload.array('attachments', 10), // До 10 файлов
  async (req, res) => {
  try {
    let { title, description, requirements, difficulty, max_participants, opens_at, links } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Название и описание обязательны' });
    }


    let linksArray = [];
    if (links) {
      try {
        linksArray = typeof links === 'string' ? JSON.parse(links) : links;
        if (!Array.isArray(linksArray)) {
          linksArray = [];
        }
      } catch (e) {
        linksArray = [];
      }
    }


    let opensAtValue = null;
    if (opens_at) {
      opensAtValue = new Date(opens_at);
      if (isNaN(opensAtValue.getTime())) {
        return res.status(400).json({ error: 'Некорректная дата открытия' });
      }
    }



    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          name: file.originalname,
          url: `/uploads/cases/${path.basename(file.filename)}`
        });
      });
    }

    const result = await pool.query(
      `INSERT INTO cases (title, description, requirements, difficulty, max_participants, opens_at, links, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
       RETURNING *`,
      [
        title, 
        description, 
        requirements || null, 
        difficulty || 'medium', 
        max_participants || 0, 
        opensAtValue,
        JSON.stringify(linksArray),
        JSON.stringify(attachments)
      ]
    );

    const caseItem = result.rows[0];

    if (caseItem.links && typeof caseItem.links === 'object') {
      caseItem.links = Array.isArray(caseItem.links) ? caseItem.links : [];
    }
    if (caseItem.attachments && typeof caseItem.attachments === 'object') {
      caseItem.attachments = Array.isArray(caseItem.attachments) ? caseItem.attachments : [];
    }

    res.status(201).json({ case: caseItem });
  } catch (error) {
    logError('Ошибка создания кейса', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.put('/:id', 
  authenticateToken, 
  requireModerator, 
  adminOperationLimiter, 
  validateIdParam, 
  validateCaseCreation,
  upload.array('attachments', 10),
  async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, requirements, difficulty, max_participants, status, opens_at, links } = req.body;


    const currentCase = await pool.query('SELECT attachments FROM cases WHERE id = $1', [id]);
    let existingAttachments = [];
    if (currentCase.rows.length > 0 && currentCase.rows[0].attachments) {
      try {
        existingAttachments = Array.isArray(currentCase.rows[0].attachments) 
          ? currentCase.rows[0].attachments 
          : JSON.parse(currentCase.rows[0].attachments || '[]');
      } catch (e) {
        existingAttachments = [];
      }
    }


    let linksArray = undefined;
    if (links !== undefined) {
      try {
        linksArray = typeof links === 'string' ? JSON.parse(links) : links;
        if (!Array.isArray(linksArray)) {
          linksArray = [];
        }
      } catch (e) {
        linksArray = [];
      }
    }


    const newAttachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        newAttachments.push({
          name: file.originalname,
          url: `/uploads/cases/${path.basename(file.filename)}`
        });
      });
    }



    const preservedAttachments = [];
    const urlIndices = new Set();
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('attachment_url_')) {
        const idx = key.replace('attachment_url_', '');
        urlIndices.add(idx);
      }
    });
    
    urlIndices.forEach(idx => {
      const url = req.body[`attachment_url_${idx}`];
      const name = req.body[`attachment_name_${idx}`] || 'Файл';
      if (url) {
        preservedAttachments.push({ name, url });
      }
    });

    const allAttachments = [...preservedAttachments, ...newAttachments];


    let opensAtValue = undefined;
    if (opens_at !== undefined) {
      if (opens_at === null || opens_at === '') {
        opensAtValue = null;
      } else {
        opensAtValue = new Date(opens_at);
        if (isNaN(opensAtValue.getTime())) {
          return res.status(400).json({ error: 'Некорректная дата открытия' });
        }
      }
    }


    const updates = [];
    const params = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (requirements !== undefined) {
      paramCount++;
      updates.push(`requirements = $${paramCount}`);
      params.push(requirements);
    }
    if (difficulty !== undefined) {
      paramCount++;
      updates.push(`difficulty = $${paramCount}`);
      params.push(difficulty);
    }
    if (max_participants !== undefined) {
      paramCount++;
      updates.push(`max_participants = $${paramCount}`);
      params.push(max_participants);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (opensAtValue !== undefined) {
      paramCount++;
      updates.push(`opens_at = $${paramCount}`);
      params.push(opensAtValue);
    }
    if (linksArray !== undefined) {
      paramCount++;
      updates.push(`links = $${paramCount}::jsonb`);
      params.push(JSON.stringify(linksArray));
    }
    if (allAttachments.length > 0 || preservedAttachments.length === 0) {
      paramCount++;
      updates.push(`attachments = $${paramCount}::jsonb`);
      params.push(JSON.stringify(allAttachments));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    updates.push(`id = $${paramCount}`);
    params.push(id);

    const result = await pool.query(
      `UPDATE cases 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    const caseItem = result.rows[0];

    if (caseItem.links && typeof caseItem.links === 'object') {
      caseItem.links = Array.isArray(caseItem.links) ? caseItem.links : [];
    }
    if (caseItem.attachments && typeof caseItem.attachments === 'object') {
      caseItem.attachments = Array.isArray(caseItem.attachments) ? caseItem.attachments : [];
    }

    res.json({ case: caseItem });
  } catch (error) {
    logError('Ошибка обновления кейса', error, { caseId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


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
