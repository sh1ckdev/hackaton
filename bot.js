import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import pool from './db/index.js';
import { logError, logWarn, logInfo } from './utils/logger.js';

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!token) {
    logWarn('TELEGRAM_BOT_TOKEN не задан, бот не запущен');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  const upsertUser = async (from, photoUrl = null) => {
    const telegramId = from.id;
    const existing = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (existing.rows.length === 0) {
      const result = await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          telegramId,
          from.username || null,
          from.first_name || null,
          from.last_name || null,
          photoUrl
        ]
      );
      return result.rows[0];
    }

    const result = await pool.query(
      `UPDATE users
       SET username = $1,
           first_name = $2,
           last_name = $3,
           photo_url = COALESCE($4, photo_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $5
       RETURNING *`,
      [
        from.username || null,
        from.first_name || null,
        from.last_name || null,
        photoUrl,
        telegramId
      ]
    );
    return result.rows[0];
  };

  const getPhotoUrl = async (telegramId) => {
    try {
      const photos = await bot.getUserProfilePhotos(telegramId, { limit: 1 });
      if (!photos.total_count) return null;
      const fileId = photos.photos[0][0].file_id;
      const file = await bot.getFile(fileId);
      return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    } catch (error) {
      return null;
    }
  };

  const createLoginToken = async (userId) => {
    const loginToken = crypto.randomBytes(24).toString('hex');
    await pool.query(
      `INSERT INTO auth_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [userId, loginToken]
    );
    return loginToken;
  };

  const isHttpsUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };

  bot.onText(/\/start/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const from = msg.from;
      const photoUrl = await getPhotoUrl(from.id);
      const user = await upsertUser(from, photoUrl);
      const loginToken = await createLoginToken(user.id);
      const loginUrl = `${clientUrl}/login?token=${loginToken}`;

      if (isHttpsUrl(loginUrl)) {
        // Отправляем сообщение с кнопкой Web App (автоматическая авторизация через initData)
        // и кнопкой для входа по ссылке (через токен)
        await bot.sendMessage(
          chatId,
          'Добро пожаловать! Нажмите кнопку ниже, чтобы открыть сайт и автоматически войти.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ 
                  text: '🚀 Открыть сайт', 
                  web_app: { url: `${clientUrl}/login` }
                }],
                [{ 
                  text: '🔗 Войти по ссылке', 
                  url: loginUrl 
                }]
              ]
            }
          }
        );
      } else {
        await bot.sendMessage(
          chatId,
          'Для входа нужен HTTPS-адрес сайта. Задайте CLIENT_URL с https (например, через ngrok).'
        );
        await bot.sendMessage(
          chatId,
          `Ваш одноразовый токен: ${loginToken}\n` +
            `Откройте вручную: ${clientUrl}/login?token=${loginToken}`
        );
      }

      // Проверяем, есть ли уже телефон у пользователя
      const userWithPhone = await pool.query(
        'SELECT phone FROM users WHERE telegram_id = $1',
        [from.id]
      );
      
      // Предлагаем телефон только если его нет
      if (!userWithPhone.rows[0]?.phone) {
        await bot.sendMessage(chatId, 'Также можно отправить номер телефона, чтобы он отображался в профиле.', {
          reply_markup: {
            keyboard: [[{ text: 'Отправить телефон', request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        });
      }
    } catch (error) {
      logError('Ошибка /start в боте', error, { chatId: msg.chat.id });
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.contact) return;
    try {
      await pool.query(
        'UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2',
        [msg.contact.phone_number, msg.from.id]
      );
      await bot.sendMessage(msg.chat.id, 'Телефон сохранен.');
    } catch (error) {
      logError('Ошибка сохранения телефона в боте', error, { telegramId: msg.from.id });
    }
  });

  logInfo('Telegram бот запущен');
  
  return bot;
}

// Глобальная переменная для хранения экземпляра бота
let botInstance = null;

// Функция для установки экземпляра бота
export function setBotInstance(bot) {
  botInstance = bot;
}

// Функция для получения экземпляра бота
export function getBotInstance() {
  return botInstance;
}

// Функция для рассылки сообщений всем участникам
export async function broadcastMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }

  // Используем существующий экземпляр бота или создаем новый
  const bot = botInstance || new TelegramBot(token);
  
  try {
    // Получаем всех пользователей, у которых есть telegram_id и которые не снялись с соревнований
    // Отправляем рассылку всем пользователям, у которых есть telegram_id
    // (включая тех, кто имеет решения, и тех, кто никогда не отправлял)
    const result = await pool.query(
      `SELECT DISTINCT u.telegram_id 
       FROM users u
       WHERE u.telegram_id IS NOT NULL`
    );

    const telegramIds = result.rows.map(row => row.telegram_id);
    let successCount = 0;
    let failCount = 0;

    // Рассылаем сообщения с задержкой, чтобы не превысить лимиты API
    for (const telegramId of telegramIds) {
      try {
        await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
        successCount++;
        // Небольшая задержка между сообщениями
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
