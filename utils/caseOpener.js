/**
 * Система автоматического открытия кейсов и отправки уведомлений
 */

import pool from '../db/index.js';
import { getBotInstance } from '../bot.js';
import { logInfo, logError, logWarn } from './logger.js';

/**
 * Проверяет и открывает кейсы, которые должны быть открыты
 * Отправляет уведомления всем пользователям через Telegram бота
 */
export async function checkAndOpenCases() {
  try {
    // Находим кейсы, которые должны быть открыты (opens_at <= NOW и status = 'active')
    const result = await pool.query(`
      SELECT id, title, opens_at, status
      FROM cases
      WHERE opens_at IS NOT NULL
        AND opens_at <= CURRENT_TIMESTAMP
        AND status = 'active'
        AND (opens_at::date = CURRENT_DATE OR opens_at::date = CURRENT_DATE - INTERVAL '1 day')
      ORDER BY opens_at ASC
    `);

    const casesToOpen = result.rows;
    
    if (casesToOpen.length === 0) {
      return { opened: 0, notified: 0 };
    }

    let notifiedCount = 0;

    // Открываем каждый кейс и отправляем уведомления
    for (const caseItem of casesToOpen) {
      try {
        // Отправляем уведомления через бота
        const notified = await notifyUsersAboutCase(caseItem);
        notifiedCount += notified;
        
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

/**
 * Отправляет уведомление всем пользователям о новом открытом кейсе
 */
async function notifyUsersAboutCase(caseItem) {
  const bot = getBotInstance();
  
  if (!bot) {
    logWarn('Бот не инициализирован, уведомления не отправлены', { caseId: caseItem.id });
    return 0;
  }

  try {
    // Получаем всех пользователей с telegram_id
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

    // Отправляем сообщения с задержкой
    for (const telegramId of telegramIds) {
      try {
        await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
        successCount++;
        // Небольшая задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        // Игнорируем ошибки отправки отдельным пользователям
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

/**
 * Запускает периодическую проверку кейсов для открытия
 * Проверяет каждую минуту
 */
export function startCaseOpenerScheduler() {
  // Проверяем сразу при запуске
  checkAndOpenCases().catch(err => {
      logError('Ошибка при первоначальной проверке кейсов', err);
  });

  // Затем проверяем каждую минуту
  setInterval(() => {
    checkAndOpenCases().catch(err => {
      logError('Ошибка при периодической проверке кейсов', err);
    });
  }, 60 * 1000); // Каждую минуту

  logInfo('Планировщик открытия кейсов запущен');
}
