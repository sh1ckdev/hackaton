import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { logError, logInfo } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

const trimOrNull = (value) => {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v ? v : null;
};

const isAllowedCategory = (value) => value === 'student' || value === 'school';

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

    const user = result.rows[0];
    // Парсим JSON поля если они есть
    if (user.skills && typeof user.skills === 'string') {
      try {
        user.skills = JSON.parse(user.skills);
      } catch (e) {
        user.skills = [];
      }
    } else if (!user.skills) {
      user.skills = [];
    }

    logInfo('Обновлено био пользователя', { userId });
    res.json({ user });
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
      if (!skill || typeof skill !== 'object') {
        return res.status(400).json({ error: 'Каждый навык должен быть объектом' });
      }
      if (!skill.name || !skill.type) {
        return res.status(400).json({ error: 'Каждый навык должен иметь name и type' });
      }
      if (!['language', 'framework'].includes(skill.type)) {
        return res.status(400).json({ error: 'Тип навыка должен быть language или framework' });
      }
    }

    // Убеждаемся, что поле skills существует в таблице
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'skills'
      )
    `);

    if (!columnCheck.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN skills JSONB DEFAULT \'[]\'::jsonb');
      logInfo('Добавлено поле skills в таблицу users');
    }

    // Подготавливаем данные для сохранения
    const skillsToSave = skills.map(skill => ({
      name: String(skill.name).trim(),
      type: skill.type,
      extension: skill.type === 'language' && skill.extension ? String(skill.extension).trim() : null
    }));

    const result = await pool.query(
      'UPDATE users SET skills = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(skillsToSave), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    // Парсим JSON поля если они есть
    if (user.skills && typeof user.skills === 'string') {
      try {
        user.skills = JSON.parse(user.skills);
      } catch (e) {
        user.skills = [];
      }
    } else if (!user.skills) {
      user.skills = [];
    }

    logInfo('Обновлены навыки пользователя', { userId, skillsCount: skillsToSave.length });
    res.json({ user });
  } catch (error) {
    logError('Ошибка обновления навыков', error, { 
      userId: req.user?.id, 
      skills: req.body?.skills,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetail: error.detail
    });
    res.status(500).json({ 
      error: 'Ошибка сервера при обновлении навыков',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Обновить обязательные поля профиля участника
router.put('/required-fields', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      middle_name,
      participant_category,
      institution,
      school_name,
      school_class
    } = req.body || {};

    const firstName = trimOrNull(first_name);
    const lastName = trimOrNull(last_name);
    const middleName = trimOrNull(middle_name);
    const category = trimOrNull(participant_category);
    const institutionName = trimOrNull(institution);
    const schoolName = trimOrNull(school_name);
    const schoolClass = trimOrNull(school_class);

    if (!firstName || !lastName || !middleName) {
      return res.status(400).json({ error: 'Укажите ФИО полностью' });
    }
    if (!isAllowedCategory(category)) {
      return res.status(400).json({ error: 'Выберите категорию участника' });
    }

    if (category === 'student' && !institutionName) {
      return res.status(400).json({ error: 'Для студентов обязательно указывать учебное заведение' });
    }
    if (category === 'school' && (!schoolName || !schoolClass)) {
      return res.status(400).json({ error: 'Для школьников обязательны школа и класс' });
    }

    if (firstName.length > 100 || lastName.length > 100 || middleName.length > 100) {
      return res.status(400).json({ error: 'ФИО не должно превышать 100 символов в каждом поле' });
    }
    if (institutionName && institutionName.length > 255) {
      return res.status(400).json({ error: 'Название учебного заведения слишком длинное' });
    }
    if (schoolName && schoolName.length > 255) {
      return res.status(400).json({ error: 'Название школы слишком длинное' });
    }
    if (schoolClass && schoolClass.length > 50) {
      return res.status(400).json({ error: 'Класс слишком длинный' });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           middle_name = $3,
           participant_category = $4,
           institution = $5,
           school_name = $6,
           school_class = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        firstName,
        lastName,
        middleName,
        category,
        category === 'student' ? institutionName : null,
        category === 'school' ? schoolName : null,
        category === 'school' ? schoolClass : null,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    if (user.skills && typeof user.skills === 'string') {
      try {
        user.skills = JSON.parse(user.skills);
      } catch (e) {
        user.skills = [];
      }
    } else if (!user.skills) {
      user.skills = [];
    }

    logInfo('Обновлены обязательные поля профиля', { userId, participantCategory: category });
    return res.json({ user });
  } catch (error) {
    logError('Ошибка обновления обязательных полей профиля', error, { userId: req.user?.id });
    return res.status(500).json({ error: 'Ошибка сервера' });
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
