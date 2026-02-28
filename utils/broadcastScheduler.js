import cron from 'node-cron';
import pool from '../db/index.js';
import { getBotInstance } from '../bot.js';
import TelegramBot from 'node-telegram-bot-api';
import { logInfo, logError } from './logger.js';

/**
 * Возвращает telegram_id пользователей с учётом target_audience.
 * target_audience: { all: true } — все
 *                  { all: false, roles: ['moderator'] } — только по ролям
 */
async function getTargetTelegramIds(targetAudience) {
  let query;
  let params = [];

  const audience = targetAudience || { all: true };

  if (audience.all) {
    query = `SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL`;
  } else if (audience.roles && audience.roles.length > 0) {
    query = `SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL AND role = ANY($1)`;
    params = [audience.roles];
  } else {
    // Аудитория задана, но пустая — никому не отправляем
    return [];
  }

  const result = await pool.query(query, params);
  return result.rows.map(r => r.telegram_id);
}

async function sendToIds(telegramIds, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN не задан');

  const bot = getBotInstance() || new TelegramBot(token);

  let successCount = 0;
  let failCount = 0;

  for (const telegramId of telegramIds) {
    try {
      await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      if (!err.message?.includes('blocked') && !err.message?.includes('chat not found')) {
        logError('Ошибка отправки сообщения', err, { telegramId });
      }
      failCount++;
    }
  }

  return { success: successCount, failed: failCount, total: telegramIds.length };
}

/**
 * Проверяет и выполняет запланированные рассылки (тип 'scheduled').
 * Учитывает target_audience (all / roles).
 */
async function checkAndSendScheduled() {
  try {
    const result = await pool.query(`
      SELECT *
      FROM broadcast_settings
      WHERE type = 'scheduled'
        AND enabled = TRUE
        AND schedule_time IS NOT NULL
        AND schedule_time <= NOW()
        AND (last_sent_at IS NULL OR last_sent_at < schedule_time)
    `);

    if (result.rows.length === 0) return;

    for (const setting of result.rows) {
      try {
        logInfo('Запуск запланированной рассылки', {
          id: setting.id,
          name: setting.name,
          schedule_time: setting.schedule_time,
          target_audience: setting.target_audience,
        });

        const telegramIds = await getTargetTelegramIds(setting.target_audience);

        if (telegramIds.length === 0) {
          logInfo('Рассылка: нет получателей', { id: setting.id, name: setting.name });
        } else {
          const { success, failed, total } = await sendToIds(telegramIds, setting.message_template);
          logInfo('Запланированная рассылка выполнена', { id: setting.id, name: setting.name, sent: success, failed, total });
        }

        // Помечаем как отправленную независимо от числа получателей
        await pool.query(
          `UPDATE broadcast_settings SET last_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [setting.id]
        );
      } catch (err) {
        logError('Ошибка выполнения запланированной рассылки', err, { id: setting.id, name: setting.name });
      }
    }
  } catch (err) {
    logError('Ошибка проверки запланированных рассылок', err);
  }
}

export function startBroadcastScheduler() {
  cron.schedule('* * * * *', () => {
    checkAndSendScheduled().catch(err =>
      logError('Ошибка в планировщике рассылок', err)
    );
  }, {
    scheduled: true,
    timezone: 'Europe/Moscow',
  });

  checkAndSendScheduled().catch(err =>
    logError('Ошибка при первоначальной проверке рассылок', err)
  );

  logInfo('Планировщик рассылок запущен');
}
