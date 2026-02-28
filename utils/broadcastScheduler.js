import cron from 'node-cron';
import pool from '../db/index.js';
import { broadcastMessage } from '../bot.js';
import { logInfo, logError, logWarn } from './logger.js';

/**
 * Проверяет и выполняет запланированные рассылки (тип 'scheduled').
 * Ищет записи, у которых:
 *   - enabled = TRUE
 *   - type = 'scheduled'
 *   - schedule_time <= NOW() (время наступило)
 *   - last_sent_at IS NULL (ещё ни разу не отправлялась)
 *      ИЛИ last_sent_at < schedule_time (schedule_time обновили после последней отправки)
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
        logInfo('Запуск запланированной рассылки', { id: setting.id, name: setting.name, schedule_time: setting.schedule_time });

        const { success, failed, total } = await broadcastMessage(setting.message_template);

        // Помечаем как отправленную — обновляем last_sent_at
        await pool.query(
          `UPDATE broadcast_settings
           SET last_sent_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [setting.id]
        );

        logInfo('Запланированная рассылка выполнена', {
          id: setting.id,
          name: setting.name,
          sent: success,
          failed,
          total,
        });
      } catch (err) {
        logError('Ошибка выполнения запланированной рассылки', err, { id: setting.id, name: setting.name });
      }
    }
  } catch (err) {
    logError('Ошибка проверки запланированных рассылок', err);
  }
}

export function startBroadcastScheduler() {
  // Проверяем каждую минуту
  cron.schedule('* * * * *', () => {
    checkAndSendScheduled().catch(err =>
      logError('Ошибка в планировщике рассылок', err)
    );
  }, {
    scheduled: true,
    timezone: 'Europe/Moscow',
  });

  // Проверяем сразу при старте
  checkAndSendScheduled().catch(err =>
    logError('Ошибка при первоначальной проверке рассылок', err)
  );

  logInfo('Планировщик рассылок запущен');
}
