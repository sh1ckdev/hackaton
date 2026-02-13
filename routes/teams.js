import express from 'express';
import pool from '../db/index.js';
import { authenticateToken, requireModerator } from '../middleware/auth.js';
import { containsProfanity, getProfanityErrorMessage } from '../utils/profanityFilter.js';
import { teamCreationLimiter, teamJoinLimiter, checkDuplicate, logSuspiciousActivity } from '../middleware/security.js';
import { validateTeamCreation, validateTeamJoin } from '../middleware/validation.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

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
      `SELECT u.id, u.username, u.first_name, u.last_name, u.photo_url, tm.role
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.role DESC, u.first_name ASC`,
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

    const existing = await pool.query(
      'SELECT 1 FROM team_members WHERE user_id = $1',
      [req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже состоите в команде' });
    }

    const teamCode = await generateTeamCode();
    const teamResult = await pool.query(
      `INSERT INTO teams (team_code, name, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [teamCode, teamName, req.user.id]
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

    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [teamResult.rows[0].id, req.user.id]
    );

    res.json({
      team: {
        id: teamResult.rows[0].id,
        code: teamResult.rows[0].team_code,
        name: teamResult.rows[0].name,
        role: 'member'
      }
    });
  } catch (error) {
    logError('Ошибка вступления в команду', error, { userId: req.user?.id, teamCode: req.body?.team_code });
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
        'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1 AND user_id != $2',
        [member.team_id, req.user.id]
      );

      if (parseInt(otherMembers.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Капитан не может покинуть команду, пока в ней есть другие участники. Сначала передайте права капитана другому участнику или удалите других участников.' 
        });
      }


      await pool.query('DELETE FROM teams WHERE id = $1', [member.team_id]);
    } else {

      await pool.query('DELETE FROM team_members WHERE user_id = $1 AND team_id = $2', [req.user.id, member.team_id]);
    }

    res.json({ message: 'Вы покинули команду' });
  } catch (error) {
    logError('Ошибка выхода из команды', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/all', authenticateToken, requireModerator, async (req, res) => {
  try {
    const teamsResult = await pool.query(
      `SELECT t.id, t.team_code, t.name, t.created_at, 
              COUNT(tm.user_id) as members_count,
              t.assigned_case_id,
              c.title as assigned_case_title
       FROM teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       LEFT JOIN cases c ON t.assigned_case_id = c.id
       GROUP BY t.id, t.team_code, t.name, t.created_at, t.assigned_case_id, c.title
       ORDER BY t.created_at DESC`
    );

    const teams = teamsResult.rows;
    

    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const membersResult = await pool.query(
          `SELECT u.id, u.username, u.first_name, u.last_name, u.photo_url, tm.role
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1
           ORDER BY tm.role DESC, u.first_name ASC`,
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
