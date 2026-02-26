import express from 'express';
import pool from '../db/index.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

// Получить дату дедлайна для таймера (синхронна с таймером на главной)
router.get('/deadline', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_timeline
      WHERE show_countdown = TRUE
      ORDER BY date ASC
      LIMIT 1
    `);
    let targetDate = null;
    if (result.rows.length > 0) {
      const item = result.rows[0];
      const baseDate = new Date(item.date_to || item.date);
      const now = new Date();
      if (now >= baseDate) {
        targetDate = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
      } else {
        targetDate = baseDate.toISOString();
      }
    } else {
      const fallback = await pool.query(`
        SELECT date FROM hackathon_timeline
        WHERE type = 'hacking_begins'
        ORDER BY date ASC
        LIMIT 1
      `);
      if (fallback.rows.length > 0) {
        targetDate = new Date(fallback.rows[0].date).toISOString();
      }
    }
    res.json({ target_date: targetDate });
  } catch (error) {
    logError('Ошибка получения дедлайна', error);
    res.json({ target_date: null });
  }
});

// Получить таймлайн для лендинга (публичный доступ)
router.get('/timeline', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_timeline
      ORDER BY date ASC, created_at ASC
    `);
    res.json({ timeline: result.rows });
  } catch (error) {
    logError('Ошибка получения таймлайна для лендинга', error);
    res.json({ timeline: [] });
  }
});

// Получить призы для лендинга (публичный доступ)
router.get('/prizes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_prizes
      ORDER BY rank ASC
    `);
    res.json({ prizes: result.rows });
  } catch (error) {
    logError('Ошибка получения призов для лендинга', error);
    res.json({ prizes: [] });
  }
});

// Получить треки для лендинга (публичный доступ)
router.get('/tracks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_tracks
      ORDER BY created_at ASC
    `);
    res.json({ tracks: result.rows });
  } catch (error) {
    logError('Ошибка получения треков для лендинга', error);
    res.json({ tracks: [] });
  }
});

export default router;
