import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';
import { getBotInstance } from '../bot.js';

const router = express.Router();

router.get('/ticket', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let ticket = (await pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )).rows[0];

    if (!ticket) {
      ticket = (await pool.query(
        `INSERT INTO support_tickets (user_id) VALUES ($1) RETURNING *`,
        [userId]
      )).rows[0];
    }

    const messages = (await pool.query(
      `SELECT id, sender, text, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticket.id]
    )).rows;

    res.json({ ticket, messages });
  } catch (error) {
    logError('Ошибка получения тикета', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/message', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Сообщение слишком длинное (макс. 2000 символов)' });
    }

    
    let ticket = (await pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )).rows[0];

    if (!ticket) {
      ticket = (await pool.query(
        `INSERT INTO support_tickets (user_id) VALUES ($1) RETURNING *`,
        [userId]
      )).rows[0];
    }

    
    const message = (await pool.query(
      `INSERT INTO support_messages (ticket_id, sender, text) VALUES ($1, 'user', $2) RETURNING *`,
      [ticket.id, text.trim()]
    )).rows[0];

    
    await pool.query(
      `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [ticket.id]
    );

    
    const groupId = process.env.SUPPORT_GROUP_ID;
    if (groupId) {
      try {
        const userRow = (await pool.query(
          `SELECT u.first_name, u.last_name, u.username, u.telegram_id,
                  t.name AS team_name, t.team_code
           FROM users u
           LEFT JOIN team_members tm ON tm.user_id = u.id
           LEFT JOIN teams t ON t.id = tm.team_id
           WHERE u.id = $1
           LIMIT 1`,
          [userId]
        )).rows[0];

        const name = [userRow?.first_name, userRow?.last_name].filter(Boolean).join(' ') || userRow?.username || `User #${userId}`;
        const tgHandle = userRow?.username ? `@${userRow.username}` : `tg_id: ${userRow?.telegram_id || '—'}`;
        const teamInfo = userRow?.team_name ? `🏷 Команда: <b>${userRow.team_name}</b> (${userRow.team_code})` : '🏷 Команда: не найдена';

        const msgText =
          `📩 <b>Обращение в поддержку</b>\n` +
          `👤 <b>${name}</b> (${tgHandle})\n` +
          `${teamInfo}\n` +
          `🔖 Тикет #${ticket.id}\n\n` +
          `💬 ${text.trim()}`;

        const bot = getBotInstance();
        if (bot) {
          const sent = await bot.sendMessage(groupId, msgText, { parse_mode: 'HTML' });
          
          await pool.query(
            `UPDATE support_messages SET tg_message_id = $1 WHERE id = $2`,
            [sent.message_id, message.id]
          );
          
          await pool.query(
            `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [ticket.id]
          );
        }
      } catch (tgErr) {
        logError('Ошибка отправки в Telegram', tgErr);
        
      }
    }

    res.json({ message });
  } catch (error) {
    logError('Ошибка отправки сообщения в поддержку', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
