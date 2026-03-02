import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireModerator } from '../middleware/auth.js';
import { containsProfanity, getProfanityErrorMessage } from '../utils/profanityFilter.js';
import { teamCreationLimiter, teamJoinLimiter, checkDuplicate, logSuspiciousActivity } from '../middleware/security.js';
import { validateTeamCreation, validateTeamJoin } from '../middleware/validation.js';
import { logError } from '../utils/logger.js';

const router = express.Router();
const MAX_TEAM_MEMBERS = 5;

const generateTeamCode = async () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const makeCode = () => Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');

  for (let i = 0; i < 10; i++) {
    const code = makeCode();
    const existing = await pool.query('SELECT 1 FROM teams WHERE team_code = $1', [code]);
    if (existing.rows.length === 0) {
      return code;
    }
  }
  throw new Error('Не удалось сгенерировать уникальный код команды');
};


router.get('/me', authenticateToken, async (req, res) => {
  try {
    const memberResult = await pool.query(
      `SELECT tm.team_id, tm.role, t.name, t.assigned_case_id, c.title as assigned_case_title
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       LEFT JOIN cases c ON t.assigned_case_id = c.id
       WHERE tm.user_id = $1`,
      [req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.json({ team: null });
    }

    const team = memberResult.rows[0];

    let teamCodeResult = await pool.query('SELECT team_code FROM teams WHERE id = $1', [team.team_id]);
    let teamCode = teamCodeResult.rows[0]?.team_code || null;
    if (!teamCode) {
      teamCode = await generateTeamCode();
      await pool.query('UPDATE teams SET team_code = $1 WHERE id = $2', [teamCode, team.team_id]);
    }
    const membersResult = await pool.query(
      `SELECT u.id, u.user_code, u.username, u.first_name, u.last_name, u.photo_url, u.vk_id, u.last_activity_at, tm.role, tm.joined_at, tm.specialty
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY CASE WHEN tm.role = 'captain' THEN 0 ELSE 1 END, tm.joined_at ASC NULLS LAST`,
      [team.team_id]
    );

    res.json({
      team: {
        id: team.team_id,
        code: teamCode,
        name: team.name,
        role: team.role,
        assigned_case_id: team.assigned_case_id || null,
        assigned_case_title: team.assigned_case_title || null,
        members: membersResult.rows
      }
    });
  } catch (error) {
    logError('Ошибка получения команды', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/create', authenticateToken, teamCreationLimiter, validateTeamCreation, async (req, res) => {
  try {
    const { name } = req.body;
    const teamName = (name || '').trim();

    if (!teamName) {
      return res.status(400).json({ error: 'Название команды обязательно' });
    }


    if (containsProfanity(teamName)) {
      await logSuspiciousActivity(req, 'profanity_detected', {
        team_name: teamName
      });
      return res.status(400).json({ error: getProfanityErrorMessage() });
    }


    const isNotDuplicate = await checkDuplicate(req, 'teams', 'name', teamName, 60000);
    if (!isNotDuplicate) {
      await logSuspiciousActivity(req, 'duplicate_team_creation', {
        team_name: teamName
      });
      return res.status(429).json({ error: 'Недавно была создана команда с таким названием. Подождите немного.' });
    }

    const existingName = await pool.query(
      'SELECT 1 FROM teams WHERE LOWER(TRIM(name)) = LOWER($1)',
      [teamName]
    );
    if (existingName.rows.length > 0) {
      return res.status(400).json({ error: 'Команда с таким названием уже существует' });
    }

    const existing = await pool.query(
      'SELECT 1 FROM team_members WHERE user_id = $1',
      [req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже состоите в команде' });
    }

    const userRow = await pool.query('SELECT participant_category FROM users WHERE id = $1', [req.user.id]);
    const userCategory = userRow.rows[0]?.participant_category || null;

    const teamCode = await generateTeamCode();
    const teamResult = await pool.query(
      `INSERT INTO teams (team_code, name, created_by, participant_category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teamCode, teamName, req.user.id, userCategory]
    );
    const team = teamResult.rows[0];

    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'captain')`,
      [team.id, req.user.id]
    );

    res.status(201).json({ team: { id: team.id, code: team.team_code, name: team.name, role: 'captain' } });
  } catch (error) {
    logError('Ошибка создания команды', error, { userId: req.user?.id, teamName: req.body?.name });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/join', authenticateToken, teamJoinLimiter, validateTeamJoin, async (req, res) => {
  try {
    const { team_code } = req.body;
    if (!team_code) {
      return res.status(400).json({ error: 'Код команды обязателен' });
    }

    const existing = await pool.query(
      'SELECT 1 FROM team_members WHERE user_id = $1',
      [req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже состоите в команде' });
    }

    const teamResult = await pool.query('SELECT * FROM teams WHERE team_code = $1', [team_code.toUpperCase()]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Команда не найдена' });
    }

    const team = teamResult.rows[0];
    const memberCount = await pool.query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
      [team.id]
    );
    if (parseInt(memberCount.rows[0].count, 10) >= MAX_TEAM_MEMBERS) {
      return res.status(400).json({ error: `В команде уже ${MAX_TEAM_MEMBERS} участников` });
    }

    const userCat = (await pool.query('SELECT participant_category FROM users WHERE id = $1', [req.user.id])).rows[0]?.participant_category;
    if (team.participant_category && (!userCat || team.participant_category !== userCat)) {
      return res.status(403).json({ error: 'Вы не можете присоединиться к команде другой категории (школьники и студенты в разных командах)' });
    }

    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [team.id, req.user.id]
    );

    res.json({
      team: {
        id: team.id,
        code: team.team_code,
        name: team.name,
        role: 'member'
      }
    });
  } catch (error) {
    logError('Ошибка вступления в команду', error, { userId: req.user?.id, teamCode: req.body?.team_code });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/preview-invite/:userCode', authenticateToken, async (req, res) => {
  try {
    const code = String(req.params.userCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) {
      return res.status(400).json({ error: 'Код должен быть 6 символов (буквы и цифры)' });
    }

    const captainCheck = await pool.query(
      `SELECT 1 FROM team_members WHERE user_id = $1 AND role = 'captain'`,
      [req.user.id]
    );
    if (captainCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Только капитан может приглашать' });
    }

    const result = await pool.query(
      `SELECT id, user_code, username, first_name, last_name, photo_url FROM users WHERE user_code = $1`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const userId = result.rows[0].id;
    const alreadyInTeam = await pool.query(
      'SELECT 1 FROM team_members WHERE user_id = $1',
      [userId]
    );
    if (alreadyInTeam.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже в команде' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    logError('Ошибка превью приглашения', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const userCode = String(req.body.user_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (userCode.length !== 6) {
      return res.status(400).json({ error: 'Укажите 6-значный код пользователя' });
    }

    const captainResult = await pool.query(
      `SELECT tm.team_id, t.name, t.participant_category as team_category FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND tm.role = 'captain'`,
      [req.user.id]
    );
    if (captainResult.rows.length === 0) {
      return res.status(403).json({ error: 'Только капитан может приглашать' });
    }

    const teamId = captainResult.rows[0].team_id;
    const teamCategory = captainResult.rows[0].team_category;

    const userResult = await pool.query('SELECT id, participant_category FROM users WHERE user_code = $1', [userCode]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const inviteeId = userResult.rows[0].id;
    const inviteeCategory = userResult.rows[0].participant_category;

    if (teamCategory && inviteeCategory && teamCategory !== inviteeCategory) {
      return res.status(400).json({ error: 'Нельзя пригласить участника другой категории (студенты/школьники)' });
    }

    const alreadyInTeam = await pool.query(
      'SELECT 1 FROM team_members WHERE user_id = $1',
      [inviteeId]
    );
    if (alreadyInTeam.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже состоит в команде' });
    }

    const memberCount = await pool.query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
      [teamId]
    );
    if (parseInt(memberCount.rows[0].count, 10) >= MAX_TEAM_MEMBERS) {
      return res.status(400).json({ error: `В команде уже ${MAX_TEAM_MEMBERS} участников` });
    }

    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [teamId, inviteeId]
    );

    res.json({ message: 'Пользователь добавлен в команду' });
  } catch (error) {
    logError('Ошибка приглашения в команду', error, { userId: req.user?.id, userCode: req.body?.user_code });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/leave', authenticateToken, async (req, res) => {
  try {
    const memberResult = await pool.query(
      'SELECT tm.*, t.id as team_id FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE tm.user_id = $1',
      [req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: 'Вы не состоите в команде' });
    }

    const member = memberResult.rows[0];

    if (member.role === 'captain') {
      const otherMembers = await pool.query(
        `SELECT user_id FROM team_members 
         WHERE team_id = $1 AND user_id != $2 
         ORDER BY joined_at ASC LIMIT 1`,
        [member.team_id, req.user.id]
      );

      if (otherMembers.rows.length > 0) {
        const newCaptainId = otherMembers.rows[0].user_id;
        await pool.query(
          'UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3',
          ['captain', member.team_id, newCaptainId]
        );
      } else {
        await pool.query('DELETE FROM teams WHERE id = $1', [member.team_id]);
        await pool.query('DELETE FROM team_members WHERE team_id = $1', [member.team_id]);
        return res.json({ message: 'Вы покинули команду' });
      }
    }

    await pool.query('DELETE FROM team_members WHERE user_id = $1 AND team_id = $2', [req.user.id, member.team_id]);
    res.json({ message: 'Вы покинули команду' });
  } catch (error) {
    logError('Ошибка выхода из команды', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

const SPECIALTIES = ['fullstack', 'frontend', 'backend', 'design', 'mobile', 'devops'];

router.put('/me/specialty', authenticateToken, async (req, res) => {
  try {
    const specialty = String(req.body.specialty || 'fullstack').toLowerCase();
    if (!SPECIALTIES.includes(specialty)) {
      return res.status(400).json({ error: `Специализация должна быть одной из: ${SPECIALTIES.join(', ')}` });
    }

    const memberResult = await pool.query(
      'SELECT id FROM team_members WHERE user_id = $1',
      [req.user.id]
    );
    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: 'Вы не состоите в команде' });
    }

    await pool.query(
      'UPDATE team_members SET specialty = $1 WHERE user_id = $2',
      [specialty, req.user.id]
    );

    res.json({ specialty });
  } catch (error) {
    logError('Ошибка обновления специализации', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/kick', authenticateToken, async (req, res) => {
  try {
    const userCode = String(req.body.user_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (userCode.length !== 6) {
      return res.status(400).json({ error: 'Укажите 6-значный код пользователя' });
    }

    const captainResult = await pool.query(
      `SELECT tm.team_id FROM team_members tm 
       WHERE tm.user_id = $1 AND tm.role = 'captain'`,
      [req.user.id]
    );
    if (captainResult.rows.length === 0) {
      return res.status(403).json({ error: 'Только капитан может удалять участников' });
    }

    const teamId = captainResult.rows[0].team_id;

    const targetResult = await pool.query(
      `SELECT u.id FROM users u 
       JOIN team_members tm ON tm.user_id = u.id 
       WHERE u.user_code = $1 AND tm.team_id = $2`,
      [userCode, teamId]
    );
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Участник не найден в команде' });
    }

    const targetUserId = targetResult.rows[0].id;
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Чтобы выйти, используйте кнопку «Выйти»' });
    }

    await pool.query(
      'DELETE FROM team_members WHERE user_id = $1 AND team_id = $2',
      [targetUserId, teamId]
    );

    res.json({ message: 'Участник удалён из команды' });
  } catch (error) {
    logError('Ошибка удаления участника', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/all', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { participant_category } = req.query;
    let query = `
      SELECT t.id, t.team_code, t.name, t.created_at, t.participant_category,
             COUNT(tm.user_id) as members_count,
             t.assigned_case_id,
             c.title as assigned_case_title
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN cases c ON t.assigned_case_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (participant_category && ['student', 'school'].includes(participant_category)) {
      params.push(participant_category);
      query += ` AND t.participant_category = $${params.length}`;
    }
    query += `
      GROUP BY t.id, t.team_code, t.name, t.created_at, t.participant_category, t.assigned_case_id, c.title
      ORDER BY t.created_at DESC
    `;
    const teamsResult = await pool.query(query, params);

    const teams = teamsResult.rows;
    

    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const membersResult = await pool.query(
          `SELECT u.id, u.username, u.first_name, u.last_name, u.photo_url, u.vk_id, tm.role, tm.joined_at
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1
           ORDER BY CASE WHEN tm.role = 'captain' THEN 0 ELSE 1 END, tm.joined_at ASC NULLS LAST`,
          [team.id]
        );

        return {
          ...team,
          members: membersResult.rows
        };
      })
    );

    res.json({ teams: teamsWithMembers });
  } catch (error) {
    logError('Ошибка получения команд', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
