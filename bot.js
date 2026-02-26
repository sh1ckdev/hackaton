import TelegramBot from 'node-telegram-bot-api';
import pool from './db/index.js';
import { logError, logWarn, logInfo } from './utils/logger.js';

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const supportGroupId = process.env.SUPPORT_GROUP_ID;

  if (!token) {
    logWarn('TELEGRAM_BOT_TOKEN не задан, бот не запущен');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  // /start — приветствие
  bot.onText(/\/start/, async (msg) => {
    try {
      await bot.sendMessage(
        msg.chat.id,
        `Добро пожаловать!\n\nЗдесь вы можете написать в поддержку — просто отправьте сообщение.\n\nДля входа в личный кабинет используйте сайт.\n\n🌐 ${clientUrl}/login`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'Перейти на сайт', url: clientUrl + '/login' }]]
          }
        }
      );
    } catch (error) {
      logError('Ошибка /start в боте', error, { chatId: msg.chat.id });
    }
  });

  bot.on('message', async (msg) => {
    try {
      if (!msg.text && !msg.caption) return;
      if (msg.text?.startsWith('/')) return; // команды обрабатываются отдельно

      // ── Сообщение из группы поддержки (reply администратора) ──────────────
      if (supportGroupId && String(msg.chat.id) === String(supportGroupId)) {
        if (!msg.reply_to_message) return;

        const replyToMsgId = msg.reply_to_message.message_id;
        const adminText = msg.text || msg.caption;

        // Ищем сообщение поддержки по tg_message_id
        const msgRow = (await pool.query(
          `SELECT sm.ticket_id, st.user_id
           FROM support_messages sm
           JOIN support_tickets st ON st.id = sm.ticket_id
           WHERE sm.tg_message_id = $1
           LIMIT 1`,
          [replyToMsgId]
        )).rows[0];

        if (!msgRow) return;

        const { ticket_id, user_id } = msgRow;

        // Сохраняем ответ в БД
        await pool.query(
          `INSERT INTO support_messages (ticket_id, sender, text) VALUES ($1, 'admin', $2)`,
          [ticket_id, adminText]
        );
        await pool.query(
          `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [ticket_id]
        );

        // Отправляем ответ пользователю в личку
        const userRow = (await pool.query(
          `SELECT telegram_id FROM users WHERE id = $1`,
          [user_id]
        )).rows[0];

        if (userRow?.telegram_id) {
          await bot.sendMessage(
            userRow.telegram_id,
            `💬 <b>Ответ от поддержки</b>\n\n${adminText}\n\n<i>Тикет #${ticket_id} · Ответить можно на сайте или здесь в боте</i>`,
            { parse_mode: 'HTML' }
          );
        }

        await bot.sendMessage(
          supportGroupId,
          `✅ Ответ отправлен пользователю (тикет #${ticket_id})`,
          { reply_to_message_id: msg.message_id }
        );
        return;
      }

      // ── Личное сообщение пользователя боту → поддержка ───────────────────
      if (msg.chat.type !== 'private') return;

      const telegramId = String(msg.from.id);
      const text = msg.text || msg.caption;

      // Ищем пользователя по telegram_id
      const userRow = (await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.username, u.participant_category,
                t.name AS team_name, t.team_code
         FROM users u
         LEFT JOIN team_members tm ON tm.user_id = u.id
         LEFT JOIN teams t ON t.id = tm.team_id
         WHERE u.telegram_id = $1
         LIMIT 1`,
        [telegramId]
      )).rows[0];

      if (!userRow) {
        // Пользователь не зарегистрирован на сайте
        await bot.sendMessage(
          msg.chat.id,
          `⚠️ Ваш аккаунт Telegram не привязан к платформе.\n\nПожалуйста, войдите на сайте через Telegram Login:\n🌐 ${clientUrl}/login`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: 'Войти на сайте', url: clientUrl + '/login' }]]
            }
          }
        );
        return;
      }

      const userId = userRow.id;

      // Получаем или создаём открытый тикет
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

      // Сохраняем сообщение в БД
      const savedMsg = (await pool.query(
        `INSERT INTO support_messages (ticket_id, sender, text) VALUES ($1, 'user', $2) RETURNING *`,
        [ticket.id, text.trim()]
      )).rows[0];

      await pool.query(
        `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [ticket.id]
      );

      // Подтверждение пользователю
      await bot.sendMessage(
        msg.chat.id,
        `✅ Сообщение получено! Мы ответим вам здесь.\n\nТакже историю переписки можно посмотреть на сайте: ${clientUrl}/profile`,
        { reply_to_message_id: msg.message_id }
      );

      // Пересылаем в группу поддержки
      if (supportGroupId) {
        const name = [userRow.first_name, userRow.last_name].filter(Boolean).join(' ') || userRow.username || `User #${userId}`;
        const tgHandle = userRow.username ? `@${userRow.username}` : `tg_id: ${telegramId}`;
        const category = userRow.participant_category === 'student' ? '🎓 Студент' : userRow.participant_category === 'school' ? '🏫 Школьник' : '';
        const teamInfo = userRow.team_name
          ? `🏷 Команда: <b>${userRow.team_name}</b> (${userRow.team_code})`
          : '🏷 Команда: не найдена';

        const groupMsg =
          `📩 <b>Обращение через Telegram</b>\n` +
          `👤 <b>${name}</b> (${tgHandle})${category ? ` · ${category}` : ''}\n` +
          `${teamInfo}\n` +
          `🔖 Тикет #${ticket.id}\n\n` +
          `💬 ${text.trim()}`;

        try {
          const sent = await bot.sendMessage(supportGroupId, groupMsg, { parse_mode: 'HTML' });
          // Сохраняем tg_message_id для связи reply → тикет
          await pool.query(
            `UPDATE support_messages SET tg_message_id = $1 WHERE id = $2`,
            [sent.message_id, savedMsg.id]
          );
        } catch (tgErr) {
          logError('Ошибка отправки в группу поддержки', tgErr);
        }
      }
    } catch (error) {
      logError('Ошибка обработки сообщения в боте', error);
    }
  });

  logInfo('Telegram бот запущен');

  return bot;
}


let botInstance = null;


export function setBotInstance(bot) {
  botInstance = bot;
}


export function getBotInstance() {
  return botInstance;
}


export async function broadcastMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }

  const bot = botInstance || new TelegramBot(token);

  const result = await pool.query(
    `SELECT DISTINCT u.telegram_id 
     FROM users u
     WHERE u.telegram_id IS NOT NULL`
  );

  const telegramIds = result.rows.map(row => row.telegram_id);
  let successCount = 0;
  let failCount = 0;

  for (const telegramId of telegramIds) {
    try {
      await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      logError('Ошибка отправки сообщения пользователю', error, { telegramId });
      failCount++;
    }
  }

  return { success: successCount, failed: failCount, total: telegramIds.length };
}
