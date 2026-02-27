import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError, logWarn } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

function parseConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hackathon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

const pool = new Pool(parseConnectionConfig());


export async function initDB() {
  let dbName, dbUser, dbPassword, dbHost, dbPort;

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbHost = url.hostname;
    dbPort = url.port || 5432;
    dbUser = url.username;
    dbPassword = url.password;
    dbName = url.pathname.replace(/^\//, '');
  } else {
    dbName = process.env.DB_NAME || 'hackathon_db';
    dbUser = process.env.DB_USER || 'postgres';
    dbPassword = process.env.DB_PASSWORD || 'postgres';
    dbHost = process.env.DB_HOST || 'localhost';
    dbPort = process.env.DB_PORT || 5432;
  }

  const adminPool = new Pool({
    host: dbHost,
    port: dbPort,
    database: 'postgres',
    user: dbUser,
    password: dbPassword,
  });

  try {

    const dbCheck = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );


    if (dbCheck.rows.length === 0) {
      logInfo(`Создание базы данных ${dbName}`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      logInfo(`База данных ${dbName} создана успешно`);
    } else {
      logInfo(`База данных ${dbName} уже существует`);
    }

    await adminPool.end();
  } catch (error) {
    await adminPool.end();

    if (error.code !== '42P04') { // 42P04 = database already exists
      logError('Ошибка при создании БД', error, { dbName });
      throw error;
    }
  }


  try {

    const { runMigrations } = await import('./migrations.js');
    await runMigrations();
    logInfo('База данных инициализирована и миграции применены успешно');
  } catch (error) {
    logError('Ошибка инициализации БД', error);
    throw error;
  }
}

export default pool;
