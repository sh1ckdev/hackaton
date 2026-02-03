import pool from '../db/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const telegramId = process.argv[2];

  if (!telegramId) {
    console.error('Использование: node createAdmin.js <telegram_id>');
    process.exit(1);
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE telegram_id = $2 RETURNING *',
      ['admin', telegramId]
    );

    if (result.rows.length === 0) {
      console.log('Пользователь с таким Telegram ID не найден. Создайте пользователя через вход в систему, затем запустите этот скрипт.');
    } else {
      console.log('Пользователь успешно назначен администратором:', result.rows[0]);
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
