import { Bot, Keyboard } from '@maxhub/max-bot-api';
import crypto from 'crypto';
import pool from './db/index.js';
import { logError, logWarn, logInfo } from './utils/logger.js';

export function startMaxBot() {
  const token = process.env.MAX_BOT_TOKEN;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!token) {
    logWarn('MAX_BOT_TOKEN не задан, MAX бот не запущен');
    return null;
  }

  const bot = new Bot(token);

  const upsertUser = async (user) => {
    const maxId = user.user_id;
    const nameParts = (user.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    const photoUrl = user.full_avatar_url || user.avatar_url || null;

    const existing = await pool.query('SELECT * FROM users WHERE max_id = $1', [maxId]);
    if (existing.rows.length === 0) {
      const result = await pool.query(
        `INSERT INTO users (max_id, username, first_name, last_name, photo_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [maxId, user.username || null, firstName, lastName, photoUrl]
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
       WHERE max_id = $5
       RETURNING *`,
      [user.username || null, firstName, lastName, photoUrl, maxId]
    );
    return result.rows[0];
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
    } catch {
      return false;
    }
  };

  const handleStart = async (ctx) => {
    try {
      const user = ctx.user;
      if (!user) {
        logError('MAX бот: user отсутствует в ctx', null, { updateType: ctx.updateType });
        return;
      }

      const dbUser = await upsertUser(user);
      const loginToken = await createLoginToken(dbUser.id);
      const loginUrl = `${clientUrl}/login?token=${loginToken}`;

      const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.link('Войти на сайт', loginUrl)]
      ]);

      if (isHttpsUrl(loginUrl)) {
        await ctx.reply('Для входа на сайт нажмите кнопку ниже.', {
          attachments: [keyboard]
        });
      } else {
        await ctx.reply(
          'Для входа нужен HTTPS-адрес сайта. Задайте CLIENT_URL с https (например, через ngrok).'
        );
        await ctx.reply(
          `Ваш одноразовый токен: ${loginToken}\nОткройте вручную: ${loginUrl}`
        );
      }

      const userWithPhone = await pool.query(
        'SELECT phone FROM users WHERE max_id = $1',
        [user.user_id]
      );
      if (!userWithPhone.rows[0]?.phone) {
        const contactKeyboard = Keyboard.inlineKeyboard([
          [Keyboard.button.requestContact('Отправить телефон')]
        ]);
        await ctx.reply('Также можно отправить номер телефона, чтобы он отображался в профиле.', {
          attachments: [contactKeyboard]
        });
      }
    } catch (error) {
      logError('Ошибка /start в MAX боте', error, { chatId: ctx.chatId });
    }
  };

  bot.on('bot_started', handleStart);
  bot.command('start', handleStart);

  bot.on('message_created', async (ctx) => {
    const contactInfo = ctx.contactInfo;
    if (!contactInfo?.tel || !ctx.user) return;
    try {
      await pool.query(
        'UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE max_id = $2',
        [contactInfo.tel, ctx.user.user_id]
      );
      await ctx.reply('Телефон сохранён.');
    } catch (error) {
      logError('Ошибка сохранения телефона в MAX боте', error, { maxId: ctx.user?.user_id });
    }
  });

  bot.catch((err) => {
    logError('MAX бот: необработанная ошибка', err);
  });

  bot.start();
  logInfo('MAX бот запущен');
  return bot;
}
