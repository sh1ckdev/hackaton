import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import pool from './db/index.js';

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const mainAdminTelegramId = process.env.MAIN_ADMIN_TELEGRAM_ID ? parseInt(process.env.MAIN_ADMIN_TELEGRAM_ID) : null;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан, бот не запущен.');
    return;
  }

  if (!mainAdminTelegramId) {
    console.warn('MAIN_ADMIN_TELEGRAM_ID не задан. Главный админ не будет создан автоматически.');
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
      const user = result.rows[0];

      // Если это главный админ из env - назначаем админом
      if (mainAdminTelegramId && telegramId === mainAdminTelegramId) {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
        user.role = 'admin';
      }

      return user;
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

  const makeAdmin = async (telegramId) => {
    if (!mainAdminTelegramId || telegramId !== mainAdminTelegramId) {
      return false;
    }
    await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2',
      ['admin', telegramId]
    );
    return true;
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

  // Обычный вход
  bot.onText(/^\/start$/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const from = msg.from;
      
      if (!from) {
        console.error('Нет данных пользователя в сообщении');
        return;
      }
      
      const photoUrl = await getPhotoUrl(from.id);
      const user = await upsertUser(from, photoUrl);
      
      // Если это главный админ из env - автоматически делаем админом
      if (mainAdminTelegramId && from.id === mainAdminTelegramId && user.role !== 'admin') {
        await makeAdmin(from.id);
        user.role = 'admin';
      }
      
      const loginToken = await createLoginToken(user.id);
      const loginUrl = `${clientUrl}/login?token=${loginToken}`;

      if (isHttpsUrl(loginUrl)) {
        await bot.sendMessage(
          chatId,
          'Для входа на сайт нажмите кнопку ниже.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Войти на сайт', url: loginUrl }]
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

      if (!user.phone) {
        await bot.sendMessage(chatId, 'Также можно отправить номер телефона, чтобы он отображался в профиле.', {
          reply_markup: {
            keyboard: [[{ text: 'Отправить телефон', request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        });
      }
    } catch (error) {
      console.error('Ошибка /start:', error);
      try {
        await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке команды. Попробуйте позже.');
      } catch (e) {
        console.error('Не удалось отправить сообщение об ошибке:', e);
      }
    }
  });

  // Функция для обработки входа главного админа
  const handleAdminLogin = async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    
    if (!mainAdminTelegramId || from.id !== mainAdminTelegramId) {
      await bot.sendMessage(chatId, '❌ У вас нет доступа к этой команде.');
      return;
    }

    const photoUrl = await getPhotoUrl(from.id);
    const user = await upsertUser(from, photoUrl);
    
    // Назначаем админом
    const isAdmin = await makeAdmin(from.id);
    if (isAdmin) {
      await bot.sendMessage(chatId, '✅ Вы назначены главным администратором.');
    }
    
    const loginToken = await createLoginToken(user.id);
    const loginUrl = `${clientUrl}/login?token=${loginToken}`;

    if (isHttpsUrl(loginUrl)) {
      await bot.sendMessage(
        chatId,
        '🔐 Для входа в админ-панель нажмите кнопку ниже.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Войти в админ-панель', url: loginUrl }]
            ]
          }
        }
      );
    } else {
      await bot.sendMessage(
        chatId,
        'Для входа нужен HTTPS-адрес сайта. Задайте CLIENT_URL с https.'
      );
      await bot.sendMessage(
        chatId,
        `Ваш одноразовый токен: ${loginToken}\n` +
          `Откройте вручную: ${clientUrl}/login?token=${loginToken}`
      );
    }

    if (!user.phone) {
      await bot.sendMessage(chatId, 'Также можно отправить номер телефона, чтобы он отображался в профиле.', {
        reply_markup: {
          keyboard: [[{ text: 'Отправить телефон', request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
    }
  };

  // Специальный путь для входа главного админа: /start admin
  bot.onText(/\/start\s+admin/, handleAdminLogin);

  // Альтернативная команда для входа главного админа: /admin
  bot.onText(/^\/admin$/, handleAdminLogin);

  bot.on('message', async (msg) => {
    if (!msg.contact) return;
    try {
      await pool.query(
        'UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2',
        [msg.contact.phone_number, msg.from.id]
      );
      await bot.sendMessage(msg.chat.id, 'Телефон сохранен.');
    } catch (error) {
      console.error('Ошибка сохранения телефона:', error);
    }
  });

  // Обработка ошибок бота
  bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
  });

  bot.on('error', (error) => {
    console.error('Ошибка бота:', error);
  });

  console.log('Telegram бот запущен.');
  
  if (!token) {
    console.error('⚠️ TELEGRAM_BOT_TOKEN не установлен!');
  } else {
    console.log('✅ Бот готов к работе. Ожидаю команды...');
  }
}
