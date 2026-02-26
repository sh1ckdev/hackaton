import TelegramBot from 'node-telegram-bot-api';
import { logError, logWarn, logInfo } from './utils/logger.js';

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

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
