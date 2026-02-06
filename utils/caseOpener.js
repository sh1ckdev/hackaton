

import pool from '../db/index.js';
import { getBotInstance } from '../bot.js';
import { logInfo, logError, logWarn } from './logger.js';
import cron from 'node-cron';


export async function checkAndOpenCases() {
  try {

    const result = await pool.query(`
      SELECT id, title, opens_at, status, notification_sent
      FROM cases
      WHERE opens_at IS NOT NULL
        AND opens_at <= CURRENT_TIMESTAMP
        AND status = 'active'
        AND (notification_sent IS NULL OR notification_sent = FALSE)
        AND (opens_at::date = CURRENT_DATE OR opens_at::date = CURRENT_DATE - INTERVAL '1 day')
      ORDER BY opens_at ASC
    `);

    const casesToOpen = result.rows;
    
    if (casesToOpen.length === 0) {
      return { opened: 0, notified: 0 };
    }

    let notifiedCount = 0;


    for (const caseItem of casesToOpen) {
      try {

        const notified = await notifyUsersAboutCase(caseItem);
        notifiedCount += notified;
        
        // Помечаем, что уведомление отправлено
        await pool.query(
          'UPDATE cases SET notification_sent = TRUE WHERE id = $1',
          [caseItem.id]
        );
        
        logInfo('Кейс открыт, уведомления отправлены', { caseId: caseItem.id, caseTitle: caseItem.title, notified });
      } catch (error) {
        logError('Ошибка при открытии кейса', error, { caseId: caseItem.id });
      }
    }

    return { opened: casesToOpen.length, notified: notifiedCount };
  } catch (error) {
    logError('Ошибка проверки кейсов для открытия', error);
    throw error;
  }
}


async function notifyUsersAboutCase(caseItem) {
  const bot = getBotInstance();
  
  if (!bot) {
    logWarn('Бот не инициализирован, уведомления не отправлены', { caseId: caseItem.id });
    return 0;
  }

  try {

    const usersResult = await pool.query(`
      SELECT DISTINCT telegram_id 
      FROM users
      WHERE telegram_id IS NOT NULL
    `);

    const telegramIds = usersResult.rows.map(row => row.telegram_id);
    let successCount = 0;

    const message = `🎯 <b>Новый кейс открыт!</b>\n\n` +
                   `📋 <b>${caseItem.title}</b>\n\n` +
                   `Кейс теперь доступен для решения. Переходите на сайт, чтобы принять участие!`;


    for (const telegramId of telegramIds) {
      try {
        await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
        successCount++;

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {

        if (!error.message.includes('blocked') && !error.message.includes('chat not found')) {
          logWarn('Ошибка отправки уведомления пользователю', { telegramId, error: error.message });
        }
      }
    }

    return successCount;
  } catch (error) {
    logError('Ошибка отправки уведомлений о кейсе', error, { caseId: caseItem.id });
    return 0;
  }
}


export function startCaseOpenerScheduler() {

  checkAndOpenCases().catch(err => {
      logError('Ошибка при первоначальной проверке кейсов', err);
  });


  // Используем node-cron для более надежного планирования
  // Проверяем каждую минуту
  cron.schedule('* * * * *', () => {
    checkAndOpenCases().catch(err => {
      logError('Ошибка при периодической проверке кейсов', err);
    });
  }, {
    scheduled: true,
    timezone: "Europe/Moscow"
  });

  logInfo('Планировщик открытия кейсов запущен (node-cron)');
}
