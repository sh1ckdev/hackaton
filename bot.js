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

  // /start — приветствие + запрос телефона
  bot.onText(/\/start/, async (msg) => {
    try {
      const telegramId = String(msg.from.id);

      // Проверяем, есть ли уже телефон у пользователя в БД
      const userRow = (await pool.query(
        `SELECT id, phone FROM users WHERE telegram_id = $1 LIMIT 1`,
        [telegramId]
      )).rows[0];

      if (userRow && userRow.phone) {
        // Пользователь уже есть и телефон привязан
        await bot.sendMessage(
          msg.chat.id,
          `Добро пожаловать!\n\nЗдесь вы можете написать в поддержку — просто отправьте сообщение.\n\nДля входа в личный кабинет используйте сайт.\n\n🌐 ${clientUrl}/login`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: 'Перейти на сайт', url: clientUrl + '/login' }]]
            }
          }
        );
      } else {
        // Запрашиваем телефон — нужен для связки с VK аккаунтом
        await bot.sendMessage(
          msg.chat.id,
          `Добро пожаловать!\n\nЧтобы связать ваш Telegram с аккаунтом на платформе, пожалуйста, поделитесь номером телефона.\n\nЭто нужно для того, чтобы вход через Telegram и VK ID открывал один и тот же профиль.`,
          {
            reply_markup: {
              keyboard: [[{ text: '📱 Поделиться номером телефона', request_contact: true }]],
              one_time_keyboard: true,
              resize_keyboard: true
            }
          }
        );
      }
    } catch (error) {
      logError('Ошибка /start в боте', error, { chatId: msg.chat.id });
    }
  });

  // Обработка контакта (телефона) от пользователя
  bot.on('contact', async (msg) => {
    try {
      if (!msg.contact) return;

      // Telegram позволяет пересылать чужие контакты — проверяем, что это свой номер
      if (String(msg.contact.user_id) !== String(msg.from.id)) {
        await bot.sendMessage(
          msg.chat.id,
          'Пожалуйста, поделитесь именно своим номером телефона, а не чужим контактом.',
          { reply_markup: { remove_keyboard: true } }
        );
        return;
      }

      const telegramId = String(msg.from.id);
      const rawPhone = msg.contact.phone_number;
      const digits = rawPhone.replace(/\D/g, '');
      const phone = digits.length >= 10 ? digits : null;

      if (!phone) {
        await bot.sendMessage(msg.chat.id, 'Не удалось распознать номер телефона.', {
          reply_markup: { remove_keyboard: true }
        });
        return;
      }

      // Ищем пользователя по telegram_id
      const byTg = (await pool.query(
        `SELECT id, phone FROM users WHERE telegram_id = $1 LIMIT 1`,
        [telegramId]
      )).rows[0];

      // Ищем пользователя по номеру телефона (мог зайти через VK раньше)
      const byPhone = (await pool.query(
        `SELECT id, telegram_id FROM users WHERE REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $1 LIMIT 1`,
        [phone]
      )).rows[0];

      if (byTg && byPhone && byTg.id !== byPhone.id) {
        // Два разных аккаунта — сливаем: оставляем тот, что с VK (byPhone), привязываем telegram_id
        await pool.query(
          `UPDATE users SET telegram_id = $1, phone = COALESCE(phone, $2), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [telegramId, phone, byPhone.id]
        );
        // Удаляем дубликат аккаунта от Telegram (без VK)
        if (!byTg.phone) {
          await pool.query(`DELETE FROM users WHERE id = $1`, [byTg.id]);
        }
        await bot.sendMessage(
          msg.chat.id,
          `✅ Ваш Telegram успешно привязан к существующему аккаунту!\n\nТеперь вы можете входить на платформу и через Telegram, и через VK ID — это будет один профиль.\n\n🌐 ${clientUrl}/login`,
          {
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [[{ text: 'Войти на сайте', url: clientUrl + '/login' }]]
            }
          }
        );
      } else if (byTg) {
        // Аккаунт уже есть по telegram_id — просто сохраняем телефон
        await pool.query(
          `UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [phone, byTg.id]
        );
        await bot.sendMessage(
          msg.chat.id,
          `✅ Номер телефона сохранён!\n\nТеперь если вы войдёте через VK с этим же номером — аккаунты будут объединены.\n\n🌐 ${clientUrl}/login`,
          {
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [[{ text: 'Войти на сайте', url: clientUrl + '/login' }]]
            }
          }
        );
      } else if (byPhone) {
        // Аккаунт есть по телефону (VK) — привязываем telegram_id
        await pool.query(
          `UPDATE users SET telegram_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [telegramId, byPhone.id]
        );
        await bot.sendMessage(
          msg.chat.id,
          `✅ Telegram привязан к вашему аккаунту!\n\nТеперь вы можете входить через Telegram — это тот же профиль что и в VK.\n\n🌐 ${clientUrl}/login`,
          {
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [[{ text: 'Войти на сайте', url: clientUrl + '/login' }]]
            }
          }
        );
      } else {
        // Новый пользователь — сохраняем телефон, аккаунт создастся при входе через сайт
        await bot.sendMessage(
          msg.chat.id,
          `✅ Номер телефона получен!\n\nТеперь зайдите на сайт через Telegram Login — ваш профиль будет создан, а при последующем входе через VK аккаунты объединятся автоматически.\n\n🌐 ${clientUrl}/login`,
          {
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [[{ text: 'Войти на сайте', url: clientUrl + '/login' }]]
            }
          }
        );
      }
    } catch (error) {
      logError('Ошибка обработки контакта в боте', error, { chatId: msg.chat.id });
      try {
        await bot.sendMessage(msg.chat.id, 'Произошла ошибка. Попробуйте позже.', {
          reply_markup: { remove_keyboard: true }
        });
      } catch (e) { /* игнорируем */ }
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


export async function sendMessageToUser(telegramId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }

  const bot = botInstance || new TelegramBot(token);
  await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
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
