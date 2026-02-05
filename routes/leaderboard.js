import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// Публичный лидерборд по командам и участникам
router.get('/', async (_req, res) => {
  try {
    const teamsResult = await pool.query(
      `
      SELECT t.id,
             t.name,
             t.team_code,
             COALESCE(SUM(s.score), 0) AS total_score,
             COUNT(DISTINCT tm.user_id) AS members_count
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      LEFT JOIN solutions s 
        ON s.user_id = tm.user_id 
       AND s.status = 'approved'
      GROUP BY t.id
      HAVING COUNT(tm.user_id) > 0
      ORDER BY total_score DESC, t.created_at ASC
      LIMIT 10
      `
    );

    const usersResult = await pool.query(
      `
      SELECT u.id,
             u.username,
             u.first_name,
             u.last_name,
             COALESCE(SUM(s.score), 0) AS total_score
      FROM users u
      LEFT JOIN solutions s 
        ON s.user_id = u.id 
       AND s.status = 'approved'
      GROUP BY u.id
      HAVING SUM(s.score) IS NOT NULL
      ORDER BY total_score DESC, u.created_at ASC
      LIMIT 10
      `
    );

    res.json({
      teams: teamsResult.rows,
      users: usersResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения лидерборда:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

