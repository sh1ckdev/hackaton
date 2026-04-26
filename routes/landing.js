import express from 'express';
import pool from '../db/index.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

router.get('/deadline', async (req, res) => {
  try {
    const phasesResult = await pool.query(`
      SELECT * FROM hackathon_timeline
      WHERE show_countdown = TRUE
      ORDER BY sort_order ASC, date ASC
    `);
    const closingResult = await pool.query(`
      SELECT * FROM hackathon_timeline
      WHERE is_closing = TRUE
      ORDER BY sort_order ASC, date ASC
      LIMIT 1
    `);
    let targetDate = null;
    if (phasesResult.rows.length > 0) {
      const phases = phasesResult.rows
        .map((item) => new Date(item.date_to || item.date).getTime())
        .filter((ts) => !Number.isNaN(ts))
        .sort((a, b) => a - b);
      if (phases.length === 0) {
        return res.json({ target_date: null });
      }
      const baseDateTs = phases[phases.length - 1];
      const baseDate = new Date(baseDateTs);
      const now = new Date();
      if (now >= baseDate) {
        const minimumEnd = baseDateTs + 48 * 60 * 60 * 1000;
        const closingTsRaw = closingResult.rows[0]
          ? new Date(closingResult.rows[0].date_to || closingResult.rows[0].date).getTime()
          : NaN;
        const closingTs = Number.isNaN(closingTsRaw) ? null : closingTsRaw;
        const endTs = closingTs ? Math.max(minimumEnd, closingTs) : minimumEnd;
        targetDate = new Date(endTs).toISOString();
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
        const startTs = new Date(fallback.rows[0].date).getTime();
        const nowTs = Date.now();
        if (nowTs >= startTs) {
          const minimumEnd = startTs + 48 * 60 * 60 * 1000;
          const closingTsRaw = closingResult.rows[0]
            ? new Date(closingResult.rows[0].date_to || closingResult.rows[0].date).getTime()
            : NaN;
          const closingTs = Number.isNaN(closingTsRaw) ? null : closingTsRaw;
          const endTs = closingTs ? Math.max(minimumEnd, closingTs) : minimumEnd;
          targetDate = new Date(endTs).toISOString();
        } else {
          targetDate = new Date(startTs).toISOString();
        }
      }
    }
    res.json({ target_date: targetDate });
  } catch (error) {
    logError('Ошибка получения дедлайна', error);
    res.json({ target_date: null });
  }
});

router.get('/timeline', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hackathon_timeline
      ORDER BY sort_order ASC, date ASC, created_at ASC
    `);
    res.json({ timeline: result.rows });
  } catch (error) {
    logError('Ошибка получения таймлайна для лендинга', error);
    res.json({ timeline: [] });
  }
});

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
