import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hackathon_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Инициализация базы данных
export async function initDB() {
  const dbName = process.env.DB_NAME || 'hackathon_db';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;

  // Сначала подключаемся к БД postgres для создания нужной БД
  const adminPool = new Pool({
    host: dbHost,
    port: dbPort,
    database: 'postgres', // Подключаемся к системной БД
    user: dbUser,
    password: dbPassword,
  });

  try {
    // Проверяем, существует ли БД
    const dbCheck = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    // Создаём БД, если её нет
    if (dbCheck.rows.length === 0) {
      console.log(`Создание базы данных ${dbName}...`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`База данных ${dbName} создана успешно`);
    } else {
      console.log(`База данных ${dbName} уже существует`);
    }

    await adminPool.end();
  } catch (error) {
    await adminPool.end();
    // Если ошибка не связана с существованием БД, пробрасываем дальше
    if (error.code !== '42P04') { // 42P04 = database already exists
      console.error('Ошибка при создании БД:', error);
      throw error;
    }
  }

  // Теперь применяем схему к нужной БД
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('База данных инициализирована успешно');
  } catch (error) {
    console.error('Ошибка инициализации БД:', error);
    throw error;
  }
}

export default pool;
