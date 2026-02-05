import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

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

// Получить команду текущего пользователя
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const memberResult = await pool.query(
      `SELECT tm.team_id, tm.role, t.name
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
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
        members: membersResult.rows
      }
    });
  } catch (error) {
    console.error('Ошибка получения команды:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать команду
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const teamName = (name || '').trim() || `Команда ${req.user.id}`;

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
    console.error('Ошибка создания команды:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вступить в команду по ID
router.post('/join', authenticateToken, async (req, res) => {
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
    console.error('Ошибка вступления в команду:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
