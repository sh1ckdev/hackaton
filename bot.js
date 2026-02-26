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

  bot.onText(/\/start/, async (msg) => {
    try {
      await bot.sendMessage(
        msg.chat.id,
        `Добро пожаловать!\n\nДля входа в личный кабинет используйте Telegram Login Widget на сайте.\n\n🌐 ${clientUrl}/login`,
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

  // Обработка reply в группе поддержки → ответ пользователю
  bot.on('message', async (msg) => {
    try {
      // Только reply-сообщения в группе поддержки
      if (!supportGroupId) return;
      if (String(msg.chat.id) !== String(supportGroupId)) return;
      if (!msg.reply_to_message) return;
      if (!msg.text && !msg.caption) return;

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

      if (!msgRow) return; // reply не на сообщение поддержки

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
          `💬 <b>Ответ от поддержки</b>\n\n${adminText}\n\n<i>Тикет #${ticket_id} · Ответить можно на сайте: ${clientUrl}/profile</i>`,
          { parse_mode: 'HTML' }
        );
      }

      // Подтверждаем в группе
      await bot.sendMessage(supportGroupId, `✅ Ответ отправлен пользователю (тикет #${ticket_id})`, {
        reply_to_message_id: msg.message_id
      });
    } catch (error) {
      logError('Ошибка обработки reply в группе поддержки', error);
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
  
  try {



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
  } catch (error) {
    logError('Ошибка рассылки сообщений', error);
    throw error;
  }
}
