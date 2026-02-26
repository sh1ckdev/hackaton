import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth.js';
import { broadcastMessage } from '../bot.js';
import { adminOperationLimiter, logSuspiciousActivity } from '../middleware/security.js';
import { validateIdParam } from '../middleware/validation.js';
import { logInfo, logError, logWarn, logDatabase } from '../utils/logger.js';

const router = express.Router();
const MAIN_ADMIN_ID = 1046635419; // ID главного администратора (число)

const normalizeTelegramId = (telegramIdParam) => {
  if (typeof telegramIdParam === 'string') {
    if (telegramIdParam.includes('.') || !/^\d+$/.test(telegramIdParam)) {
      return null;
    }
    const parsed = Number(telegramIdParam);
    if (parsed > Number.MAX_SAFE_INTEGER) {
      return telegramIdParam;
    }
    return parsed;
  }
  if (typeof telegramIdParam === 'number') {
    if (!Number.isFinite(telegramIdParam) || telegramIdParam <= 0) {
      return null;
    }
    return telegramIdParam;
  }
  return null;
};


router.use(authenticateToken);


router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [usersCount, studentsCount, schoolCount, casesCount, solutionsCount, solutionsByStatus] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM users WHERE COALESCE(role, 'user') NOT IN ('admin', 'moderator')"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE COALESCE(role, 'user') NOT IN ('admin', 'moderator') AND participant_category = 'student'"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE COALESCE(role, 'user') NOT IN ('admin', 'moderator') AND participant_category = 'school'"),
      pool.query('SELECT COUNT(*) as count FROM cases'),
      pool.query('SELECT COUNT(*) as count FROM solutions'),
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM solutions 
        GROUP BY status
      `)
    ]);

    res.json({
      users: parseInt(usersCount.rows[0].count),
      participants_students: parseInt(studentsCount.rows[0].count),
      participants_school: parseInt(schoolCount.rows[0].count),
      cases: parseInt(casesCount.rows[0].count),
      solutions: parseInt(solutionsCount.rows[0].count),
      solutionsByStatus: solutionsByStatus.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {})
    });
  } catch (error) {
    logError('Ошибка получения статистики', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const [solutionsByStatus, solutionsByCase, usersByDate, solutionsByDate] = await Promise.all([
      pool.query(`
        SELECT status, COUNT(*) as count FROM solutions GROUP BY status ORDER BY count DESC
      `),
      pool.query(`
        SELECT c.id, c.title, COUNT(s.id) as count
        FROM cases c
        LEFT JOIN solutions s ON s.case_id = c.id
        GROUP BY c.id, c.title
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE COALESCE(role, 'user') NOT IN ('admin', 'moderator')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM solutions
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)
    ]);

    res.json({
      solutionsByStatus: solutionsByStatus.rows.map(r => ({ name: r.status, value: parseInt(r.count) })),
      solutionsByCase: solutionsByCase.rows.map(r => ({ name: r.title || 'Без кейса', count: parseInt(r.count) })),
      usersByDate: usersByDate.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      solutionsByDate: solutionsByDate.rows.map(r => ({ date: r.date, count: parseInt(r.count) }))
    });
  } catch (error) {
    logError('Ошибка получения аналитики', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { participant_category } = req.query;
    let query = `
      SELECT u.*, COUNT(s.id) as solutions_count
       FROM users u
       LEFT JOIN solutions s ON u.id = s.user_id
    `;
    const params = [];
    if (participant_category === 'student' || participant_category === 'school') {
      params.push(participant_category);
      query += ` WHERE u.participant_category = $1`;
    }
    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;
    const result = params.length
      ? await pool.query(query, params)
      : await pool.query(query);
    res.json({ users: result.rows });
  } catch (error) {
    logError('Ошибка получения пользователей', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});



router.put('/users/:telegramId/role', requireAdmin, adminOperationLimiter, async (req, res) => {
  try {
    const telegramIdParam = req.params.telegramId;
    const { role } = req.body;

    logInfo('[Admin] Изменение роли', { telegramId: telegramIdParam, role, adminId: req.user?.id });


    let telegramId;
    try {
      if (typeof telegramIdParam === 'string') {

        if (telegramIdParam.includes('.') || !/^\d+$/.test(telegramIdParam)) {
          throw new Error('Некорректный формат');
        }

        const parsed = Number(telegramIdParam);
        if (parsed > Number.MAX_SAFE_INTEGER) {

          telegramId = telegramIdParam;
        } else {
          telegramId = parsed;
        }
      } else {
        telegramId = Number(telegramIdParam);
      }
      

      if (typeof telegramId === 'number' && (isNaN(telegramId) || telegramId <= 0)) {
        throw new Error('Некорректное значение');
      }
      if (typeof telegramId === 'string' && (!/^\d+$/.test(telegramId) || telegramId === '0')) {
        throw new Error('Некорректное значение');
      }
    } catch (error) {
      logError('[Admin] Некорректный Telegram ID', null, { telegramId: telegramIdParam, adminId: req.user?.id });
      return res.status(400).json({ error: 'Некорректный Telegram ID пользователя' });
    }


    const normalizedRole = role ? String(role).toLowerCase().trim() : null;
    
    if (!normalizedRole || !['user', 'moderator', 'admin'].includes(normalizedRole)) {
      logError('[Admin] Некорректная роль', null, { 
        original: role, 
        normalized: normalizedRole,
        type: typeof role 
      });
      return res.status(400).json({ error: 'Некорректная роль. Допустимые значения: user, moderator, admin' });
    }
    

    const roleToSet = normalizedRole;


    const userCheck = await pool.query('SELECT id, telegram_id, role FROM users WHERE telegram_id = $1', [telegramId]);
    if (userCheck.rows.length === 0) {
      logError('[Admin] Пользователь не найден по Telegram ID', null, { telegramId, adminId: req.user?.id });
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const currentUser = userCheck.rows[0];
    logInfo('[Admin] Текущий пользователь', { 
      id: currentUser.id, 
      telegram_id: currentUser.telegram_id, 
      currentRole: currentUser.role 
    });


    const userTelegramId = currentUser.telegram_id;
    if (userTelegramId != null) {

      const telegramIdStr = String(userTelegramId);
      const mainAdminIdStr = String(MAIN_ADMIN_ID);
      if (telegramIdStr === mainAdminIdStr && roleToSet !== 'admin') {
        logWarn('[Admin] Попытка снять роль у главного админа', { telegramId, adminId: req.user?.id });
        return res.status(403).json({ error: 'Нельзя снять роль администратора у главного администратора' });
      }
    }


    logInfo('[Admin] Обновление роли', { 
      telegramId, 
      telegramIdType: typeof telegramId,
      newRole: roleToSet,
      roleType: typeof roleToSet,
      currentUserRole: currentUser.role
    });

    try {
      logDatabase('UPDATE', 'users', {
        role: roleToSet,
        telegramId: telegramId,
        telegramIdType: typeof telegramId
      });

      const result = await pool.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING *',
        [roleToSet, telegramId]
      );

      if (result.rows.length === 0) {
        logError('[Admin] Пользователь не найден после обновления', null, { telegramId });
        return res.status(404).json({ error: 'Пользователь не найден после обновления' });
      }

      logInfo('[Admin] Роль успешно обновлена', {
        id: result.rows[0].id,
        telegram_id: result.rows[0].telegram_id,
        role: result.rows[0].role,
        roleType: typeof result.rows[0].role
      });
      res.json({ user: result.rows[0] });
    } catch (dbError) {
      logError('[Admin] Ошибка SQL запроса', dbError, {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint,
        hint: dbError.hint,
        role: role,
        telegramId: telegramId
      });
      

      if (dbError.code === '23514' || dbError.constraint) {
        logError('[Admin] Ошибка constraint в БД', dbError, { telegramId, role });
        return res.status(400).json({ 
          error: 'Некорректная роль. Проверьте, что роль соответствует допустимым значениям: user, moderator, admin',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
      throw dbError; // Пробрасываем ошибку в общий catch блок
    }
  } catch (error) {
    logError('[Admin] Ошибка изменения роли', error, {
      message: error.message,
      stack: error.stack,
      telegramId: req.params.telegramId,
      role: req.body?.role,
      errorCode: error.code
    });
    res.status(500).json({ 
      error: 'Ошибка сервера при изменении роли',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Получить решение конкретной команды
router.get('/teams/:id/solution', requireModerator, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.username
       FROM solutions s
       JOIN users u ON s.user_id = u.id
       JOIN team_members tm ON tm.user_id = s.user_id
       WHERE tm.team_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [teamId]
    );
    res.json({ solution: result.rows[0] || null });
  } catch (error) {
    logError('Ошибка получения решения команды', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/broadcast', requireModerator, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Сообщение обязательно' });
    }

    const result = await broadcastMessage(message.trim());
    res.json({
      success: true,
      sent: result.success,
      failed: result.failed,
      total: result.total
    });
  } catch (error) {
    logError('Ошибка рассылки сообщений', error);
    res.status(500).json({ error: 'Ошибка сервера при рассылке сообщений' });
  }
});

// Получить все настройки рассылок
router.get('/broadcast-settings', requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bs.*, c.title as case_title
      FROM broadcast_settings bs
      LEFT JOIN cases c ON bs.case_id = c.id
      ORDER BY bs.created_at DESC
    `);
    res.json({ settings: result.rows });
  } catch (error) {
    logError('Ошибка получения настроек рассылок', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Роуты по user id — для VK-пользователей (у них нет telegram_id)
router.put('/users/by-id/:userId/role', requireAdmin, adminOperationLimiter, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { role } = req.body;
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }
    const normalizedRole = role ? String(role).toLowerCase().trim() : null;
    if (!normalizedRole || !['user', 'moderator', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }
    const userCheck = await pool.query('SELECT id, telegram_id, role FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const currentUser = userCheck.rows[0];
    if (currentUser.telegram_id && String(currentUser.telegram_id) === String(MAIN_ADMIN_ID) && normalizedRole !== 'admin') {
      return res.status(403).json({ error: 'Нельзя снять роль у главного администратора' });
    }
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [normalizedRole, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    logError('Ошибка изменения роли (by-id)', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/users/by-id/:userId/participant-category', requireAdmin, adminOperationLimiter, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { participant_category } = req.body;
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }
    const cat = participant_category === 'student' || participant_category === 'school' ? participant_category : null;
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const result = await pool.query(
      'UPDATE users SET participant_category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [cat, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    logError('Ошибка изменения категории участника', error);
    res.status(500).json({ error: 'Ошибка сервера при изменении категории' });
  }
});

router.delete('/users/by-id/:userId', requireAdmin, adminOperationLimiter, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }
    const userCheck = await pool.query('SELECT id, telegram_id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const u = userCheck.rows[0];
    if (u.telegram_id && String(u.telegram_id) === String(MAIN_ADMIN_ID)) {
      return res.status(403).json({ error: 'Нельзя удалить главного администратора' });
    }
    if (req.user?.id === userId) {
      return res.status(403).json({ error: 'Нельзя удалить самого себя' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    logInfo('[Admin] Пользователь удален (by-id)', { userId, adminId: req.user?.id });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка удаления пользователя (by-id)', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/users/:telegramId', requireAdmin, adminOperationLimiter, async (req, res) => {
  try {
    const telegramIdParam = req.params.telegramId;
    const telegramId = normalizeTelegramId(telegramIdParam);

    if (!telegramId) {
      return res.status(400).json({ error: 'Некорректный Telegram ID пользователя' });
    }

    if (String(telegramId) === String(MAIN_ADMIN_ID)) {
      return res.status(403).json({ error: 'Нельзя удалить главного администратора' });
    }

    if (req.user?.telegram_id && String(req.user.telegram_id) === String(telegramId)) {
      return res.status(403).json({ error: 'Нельзя удалить самого себя' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE telegram_id = $1 RETURNING id, telegram_id',
      [telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    logInfo('[Admin] Пользователь удален', { telegramId, adminId: req.user?.id });
    res.json({ success: true });
  } catch (error) {
    logError('[Admin] Ошибка удаления пользователя', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить настройку рассылки по ID
router.get('/broadcast-settings/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT bs.*, c.title as case_title
      FROM broadcast_settings bs
      LEFT JOIN cases c ON bs.case_id = c.id
      WHERE bs.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }
    
    res.json({ setting: result.rows[0] });
  } catch (error) {
    logError('Ошибка получения настройки рассылки', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую настройку рассылки
router.post('/broadcast-settings', requireModerator, async (req, res) => {
  try {
    const {
      name,
      type,
      enabled = true,
      target_audience = { all: true },
      message_template,
      schedule_cron,
      schedule_time,
      conditions = {},
      case_id
    } = req.body;

    if (!name || !type || !message_template) {
      return res.status(400).json({ error: 'Название, тип и шаблон сообщения обязательны' });
    }

    if (!['case_opening', 'general', 'scheduled', 'event'].includes(type)) {
      return res.status(400).json({ error: 'Некорректный тип рассылки' });
    }

    const result = await pool.query(`
      INSERT INTO broadcast_settings (
        name, type, enabled, target_audience, message_template,
        schedule_cron, schedule_time, conditions, case_id
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9)
      RETURNING *
    `, [
      name,
      type,
      enabled,
      JSON.stringify(target_audience),
      message_template,
      schedule_cron || null,
      schedule_time || null,
      JSON.stringify(conditions),
      case_id || null
    ]);

    logInfo('Создана настройка рассылки', { id: result.rows[0].id, name, type });
    res.json({ setting: result.rows[0] });
  } catch (error) {
    logError('Ошибка создания настройки рассылки', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить настройку рассылки
router.put('/broadcast-settings/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      enabled,
      target_audience,
      message_template,
      schedule_cron,
      schedule_time,
      conditions,
      case_id
    } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (type !== undefined) {
      if (!['case_opening', 'general', 'scheduled', 'event'].includes(type)) {
        return res.status(400).json({ error: 'Некорректный тип рассылки' });
      }
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(enabled);
    }
    if (target_audience !== undefined) {
      updates.push(`target_audience = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(target_audience));
    }
    if (message_template !== undefined) {
      updates.push(`message_template = $${paramIndex++}`);
      values.push(message_template);
    }
    if (schedule_cron !== undefined) {
      updates.push(`schedule_cron = $${paramIndex++}`);
      values.push(schedule_cron || null);
    }
    if (schedule_time !== undefined) {
      updates.push(`schedule_time = $${paramIndex++}`);
      values.push(schedule_time || null);
    }
    if (conditions !== undefined) {
      updates.push(`conditions = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(conditions));
    }
    if (case_id !== undefined) {
      updates.push(`case_id = $${paramIndex++}`);
      values.push(case_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE broadcast_settings
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }

    logInfo('Обновлена настройка рассылки', { id, updates: updates.length });
    res.json({ setting: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления настройки рассылки', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить настройку рассылки
router.delete('/broadcast-settings/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM broadcast_settings WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }

    logInfo('Удалена настройка рассылки', { id });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка удаления настройки рассылки', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить список кейсов для выбора
router.get('/cases/list', requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, opens_at, status
      FROM cases
      ORDER BY created_at DESC
    `);
    res.json({ cases: result.rows });
  } catch (error) {
    logError('Ошибка получения списка кейсов', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== НАСТРОЙКИ ХАКАТОНА ==========

// Получить таймлайн
router.get('/settings/timeline', requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_timeline
      ORDER BY date ASC, created_at ASC
    `);
    res.json({ timeline: result.rows });
  } catch (error) {
    logError('Ошибка получения таймлайна', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать пункт таймлайна
router.post('/settings/timeline', requireModerator, async (req, res) => {
  try {
    const { type, title, description, date, date_to, active, show_countdown } = req.body;
    
    if (!type || !title || !description) {
      return res.status(400).json({ error: 'Название, тип и описание обязательны' });
    }

    const dateFrom = date && date.trim() ? date : new Date().toISOString();

    const result = await pool.query(`
      INSERT INTO hackathon_timeline (type, title, description, date, date_to, active, show_countdown)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [type, title, description, dateFrom, date_to || null, active || false, !!show_countdown]);

    logInfo('Создан пункт таймлайна', { id: result.rows[0].id, title });
    res.json({ timeline_item: result.rows[0] });
  } catch (error) {
    logError('Ошибка создания пункта таймлайна', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить пункт таймлайна
router.put('/settings/timeline/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, date, date_to, active, show_countdown } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date && String(date).trim() ? date : new Date().toISOString());
    }
    if (date_to !== undefined) {
      updates.push(`date_to = $${paramIndex++}`);
      values.push(date_to || null);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      values.push(active);
    }
    if (show_countdown !== undefined) {
      updates.push(`show_countdown = $${paramIndex++}`);
      values.push(!!show_countdown);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE hackathon_timeline
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пункт таймлайна не найден' });
    }

    logInfo('Обновлен пункт таймлайна', { id });
    res.json({ timeline_item: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления пункта таймлайна', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить пункт таймлайна
router.delete('/settings/timeline/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM hackathon_timeline WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пункт таймлайна не найден' });
    }

    logInfo('Удален пункт таймлайна', { id });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка удаления пункта таймлайна', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить призы
router.get('/settings/prizes', requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_prizes
      ORDER BY rank ASC
    `);
    res.json({ prizes: result.rows });
  } catch (error) {
    logError('Ошибка получения призов', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать приз
router.post('/settings/prizes', requireModerator, async (req, res) => {
  try {
    const { rank, name, amount, benefits, featured } = req.body;
    
    if (!rank || !name || amount === undefined) {
      return res.status(400).json({ error: 'Ранг, название и сумма обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO hackathon_prizes (rank, name, amount, benefits, featured)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING *
    `, [rank, name, amount, JSON.stringify(benefits || []), featured || false]);

    logInfo('Создан приз', { id: result.rows[0].id, name });
    res.json({ prize: result.rows[0] });
  } catch (error) {
    logError('Ошибка создания приза', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить приз
router.put('/settings/prizes/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { rank, name, amount, benefits, featured } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`);
      values.push(rank);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (benefits !== undefined) {
      updates.push(`benefits = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(benefits));
    }
    if (featured !== undefined) {
      updates.push(`featured = $${paramIndex++}`);
      values.push(featured);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE hackathon_prizes
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Приз не найден' });
    }

    logInfo('Обновлен приз', { id });
    res.json({ prize: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления приза', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить приз
router.delete('/settings/prizes/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM hackathon_prizes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Приз не найден' });
    }

    logInfo('Удален приз', { id });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка удаления приза', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить треки
router.get('/settings/tracks', requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_tracks
      ORDER BY created_at ASC
    `);
    res.json({ tracks: result.rows });
  } catch (error) {
    logError('Ошибка получения треков', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать трек
router.post('/settings/tracks', requireModerator, async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ error: 'Название и описание обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO hackathon_tracks (name, description, tags)
      VALUES ($1, $2, $3::jsonb)
      RETURNING *
    `, [name, description, JSON.stringify(tags || [])]);

    logInfo('Создан трек', { id: result.rows[0].id, name });
    res.json({ track: result.rows[0] });
  } catch (error) {
    logError('Ошибка создания трека', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить трек
router.put('/settings/tracks/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tags } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(tags));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE hackathon_tracks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    logInfo('Обновлен трек', { id });
    res.json({ track: result.rows[0] });
  } catch (error) {
    logError('Ошибка обновления трека', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить трек
router.delete('/settings/tracks/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM hackathon_tracks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    logInfo('Удален трек', { id });
    res.json({ success: true });
  } catch (error) {
    logError('Ошибка удаления трека', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Рандомное распределение команд по кейсам (учитывает participant_category: школьники/студенты)
router.post('/cases/assign-random', requireModerator, adminOperationLimiter, async (req, res) => {
  let transactionStarted = false;
  try {
    const casesResult = await pool.query(`
      SELECT id, participant_category
      FROM cases
      ORDER BY id ASC
    `);
    const teamsResult = await pool.query(`
      SELECT t.id, t.participant_category, COUNT(tm.user_id) as members_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      GROUP BY t.id, t.participant_category
      ORDER BY t.id ASC
    `);

    if (casesResult.rows.length === 0) {
      return res.status(400).json({ error: 'Нет кейсов для распределения' });
    }

    if (teamsResult.rows.length === 0) {
      return res.json({ assigned: 0, assignments: [] });
    }

    const cases = casesResult.rows;
    const teams = teamsResult.rows.map((team) => ({
      ...team,
      members_count: parseInt(team.members_count, 10) || 0
    }));

    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    const caseLoads = new Map(cases.map((c) => [c.id, 0]));
    const assignments = [];

    for (const team of teams) {
      const teamCat = team.participant_category || null;
      const eligibleCases = cases.filter((c) => {
        const caseCat = c.participant_category || null;
        if (!caseCat) return true;
        if (!teamCat) return true;
        return caseCat === teamCat;
      });
      if (eligibleCases.length === 0) continue;

      const minLoad = Math.min(...eligibleCases.map((c) => caseLoads.get(c.id)));
      const candidateCases = eligibleCases.filter((c) => caseLoads.get(c.id) === minLoad);
      const selected = candidateCases[Math.floor(Math.random() * candidateCases.length)];

      assignments.push({ team_id: team.id, case_id: selected.id });
      caseLoads.set(selected.id, caseLoads.get(selected.id) + team.members_count);
    }

    await pool.query('BEGIN');
    transactionStarted = true;
    await pool.query('UPDATE teams SET assigned_case_id = NULL');

    for (const assignment of assignments) {
      await pool.query(
        'UPDATE teams SET assigned_case_id = $1 WHERE id = $2',
        [assignment.case_id, assignment.team_id]
      );
    }

    await pool.query('COMMIT');
    transactionStarted = false;

    logInfo('Рандомное распределение команд по кейсам', {
      teamsAssigned: assignments.length,
      casesCount: cases.length
    });

    res.json({ assigned: assignments.length, assignments });
  } catch (error) {
    if (transactionStarted) {
      try {
        await pool.query('ROLLBACK');
      } catch (rollbackError) {
        logError('Ошибка отката транзакции', rollbackError);
      }
    }
    logError('Ошибка распределения команд по кейсам', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
