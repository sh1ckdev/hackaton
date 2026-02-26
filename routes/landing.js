import express from 'express';
import pool from '../db/index.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

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
