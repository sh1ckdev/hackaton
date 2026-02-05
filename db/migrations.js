/**
 * Система автоматических миграций базы данных
 * 
 * Эта система автоматически применяет изменения схемы БД при деплое:
 * - Отслеживает версии схемы через таблицу schema_migrations
 * - Определяет изменения по хешу файла schema.sql (дата модификации + размер)
 * - Применяет все команды из schema.sql инкрементально
 * - Проверяет и обновляет constraints, колонки и индексы
 * 
 * Использование:
 * - Миграции запускаются автоматически при старте сервера (через initDB)
 * - Для принудительного применения: установите FORCE_DB_MIGRATE=true
 * 
 * Принцип работы:
 * 1. При каждом запуске проверяется хеш schema.sql
 * 2. Если хеш изменился или FORCE_DB_MIGRATE=true, применяются миграции
 * 3. Все команды из schema.sql выполняются с обработкой ошибок "уже существует"
 * 4. Дополнительно проверяются и обновляются constraints, колонки, индексы
 */

import pool from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Создает таблицу для отслеживания версий схемы
 */
async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `);
}

/**
 * Получает текущую версию схемы из БД
 */
async function getCurrentSchemaVersion() {
  try {
    const result = await pool.query(
      'SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1'
    );
    return result.rows.length > 0 ? result.rows[0].version : null;
  } catch (error) {
    return null;
  }
}

/**
 * Сохраняет версию примененной миграции
 */
async function saveMigrationVersion(version, description) {
  await pool.query(
    'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
    [version, description]
  );
}

/**
 * Вычисляет хеш схемы для отслеживания изменений
 */
function getSchemaHash(schemaContent) {
  // Простой способ отслеживания изменений - используем дату модификации файла и размер
  const schemaPath = path.join(__dirname, 'schema.sql');
  const stats = fs.statSync(schemaPath);
  return `${stats.mtime.getTime()}-${stats.size}`;
}

/**
 * Парсит SQL файл на отдельные команды, учитывая DO блоки и другие сложные конструкции
 */
function parseSQLStatements(sqlContent) {
  const statements = [];
  let currentStatement = '';
  let inDollarQuote = false;
  let dollarQuoteTag = null;
  let pos = 0;

  while (pos < sqlContent.length) {
    const char = sqlContent[pos];
    const nextChar = pos + 1 < sqlContent.length ? sqlContent[pos + 1] : '';

    // Пропускаем комментарии
    if (char === '-' && nextChar === '-') {
      // Пропускаем до конца строки
      while (pos < sqlContent.length && sqlContent[pos] !== '\n') {
        pos++;
      }
      continue;
    }

    // Обработка dollar quoting ($$ ... $$)
    if (char === '$' && !inDollarQuote) {
      // Ищем закрывающий $
      let tagEnd = pos + 1;
      while (tagEnd < sqlContent.length && sqlContent[tagEnd] !== '$') {
        tagEnd++;
      }
      if (tagEnd < sqlContent.length) {
        dollarQuoteTag = sqlContent.substring(pos, tagEnd + 1);
        inDollarQuote = true;
        currentStatement += dollarQuoteTag;
        pos = tagEnd + 1;
        continue;
      }
    } else if (inDollarQuote && sqlContent.substring(pos).startsWith(dollarQuoteTag)) {
      // Закрывающий тег
      currentStatement += dollarQuoteTag;
      pos += dollarQuoteTag.length;
      inDollarQuote = false;
      dollarQuoteTag = null;
      continue;
    }

    // Добавляем символ к текущей команде
    currentStatement += char;

    // Если мы не в dollar quote блоке и встретили ;, это конец команды
    if (!inDollarQuote && char === ';') {
      const stmt = currentStatement.trim();
      if (stmt && stmt.length > 0 && !stmt.match(/^\s*$/)) {
        statements.push(stmt);
      }
      currentStatement = '';
    }

    pos++;
  }

  // Добавляем последнюю команду, если она есть
  const lastStmt = currentStatement.trim();
  if (lastStmt && lastStmt.length > 0) {
    statements.push(lastStmt);
  }

  return statements.filter(s => s.length > 0 && !s.match(/^\s*--/));
}

/**
 * Применяет изменения схемы инкрементально
 */
async function applySchemaChanges() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.warn('Файл schema.sql не найден, пропускаю миграции');
    return;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schemaHash = getSchemaHash(schemaContent);
  const currentVersion = await getCurrentSchemaVersion();

  // Принудительное применение миграций (для деплоя)
  const forceMigrate = process.env.FORCE_DB_MIGRATE === 'true';

  // Если схема не изменилась и не требуется принудительное применение, пропускаем
  if (currentVersion === schemaHash && !forceMigrate) {
    console.log('Схема БД актуальна, миграции не требуются');
    return;
  }

  if (forceMigrate) {
    console.log('Принудительное применение миграций (FORCE_DB_MIGRATE=true)...');
  } else {
    console.log('Обнаружены изменения в схеме БД, применяю миграции...');
  }

  // Парсим SQL на отдельные команды
  const statements = parseSQLStatements(schemaContent);

  // Применяем каждую команду
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.trim().length === 0) {
      continue;
    }

    try {
      await pool.query(statement);
      console.log(`Применена команда ${i + 1}/${statements.length}`);
    } catch (error) {
      // Игнорируем ошибки "уже существует" и подобные
      if (
        error.code === '42P07' || // relation already exists
        error.code === '42710' || // duplicate object
        error.code === '42P16' || // invalid table definition
        error.code === '42723' || // function already exists
        error.code === '42P17' || // invalid column definition
        error.message.includes('already exists') ||
        error.message.includes('duplicate') ||
        error.message.includes('уже существует')
      ) {
        // Это нормально, объект уже существует
        console.log(`Команда ${i + 1}/${statements.length} пропущена (объект уже существует)`);
        continue;
      }
      // Для других ошибок логируем, но продолжаем
      console.warn(`Предупреждение при применении команды ${i + 1}/${statements.length}:`, error.message);
      console.warn('Код ошибки:', error.code);
    }
  }

  // Применяем дополнительные проверки и обновления
  await applyAdditionalMigrations();

  // Сохраняем версию
  await saveMigrationVersion(schemaHash, `Схема обновлена: ${new Date().toISOString()}`);
  console.log('Миграции схемы применены успешно');
}

/**
 * Применяет дополнительные проверки и обновления структуры
 */
async function applyAdditionalMigrations() {
  // Обновление CHECK constraint для роли пользователя
  try {
    const constraintCheck = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%role%IN%' OR conname LIKE '%role%')
    `);

    let hasCorrectConstraint = false;
    for (const row of constraintCheck.rows) {
      const def = row.definition.toLowerCase();
      if (def.includes("'moderator'") && def.includes("'admin'") && def.includes("'user'")) {
        hasCorrectConstraint = true;
        break;
      }
    }

    if (!hasCorrectConstraint) {
      console.log('Обновление CHECK constraint для роли пользователя...');
      // Удаляем старые constraints
      for (const row of constraintCheck.rows) {
        try {
          await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${row.conname}`);
        } catch (e) {
          // Игнорируем ошибки удаления
        }
      }
      // Создаем новый правильный constraint
      await pool.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('user', 'moderator', 'admin'))
      `);
      console.log('CHECK constraint для роли обновлен успешно');
    }
  } catch (error) {
    console.warn('Предупреждение при проверке constraint для роли:', error.message);
  }

  // Проверка и добавление недостающих колонок
  await ensureColumnsExist();

  // Проверка и создание недостающих индексов
  await ensureIndexesExist();
}

/**
 * Проверяет и добавляет недостающие колонки
 */
async function ensureColumnsExist() {
  const requiredColumns = {
    users: [
      { name: 'phone', type: 'VARCHAR(32)' },
    ],
    teams: [
      { name: 'team_code', type: 'VARCHAR(6)' },
    ],
  };

  for (const [tableName, columns] of Object.entries(requiredColumns)) {
    // Проверяем существование таблицы
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);

    if (!tableExists.rows[0].exists) {
      continue;
    }

    for (const column of columns) {
      try {
        await pool.query(`
          ALTER TABLE ${tableName} 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
      } catch (error) {
        // Игнорируем ошибки, если колонка уже существует
        if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.warn(`Предупреждение при добавлении колонки ${tableName}.${column.name}:`, error.message);
        }
      }
    }
  }
}

/**
 * Проверяет и создает недостающие индексы
 */
async function ensureIndexesExist() {
  const requiredIndexes = [
    { name: 'idx_users_telegram_id', table: 'users', column: 'telegram_id', unique: false },
    { name: 'idx_solutions_user_id', table: 'solutions', column: 'user_id', unique: false },
    { name: 'idx_solutions_case_id', table: 'solutions', column: 'case_id', unique: false },
    { name: 'idx_solutions_status', table: 'solutions', column: 'status', unique: false },
    { name: 'idx_team_members_team_id', table: 'team_members', column: 'team_id', unique: false },
    { name: 'idx_teams_team_code', table: 'teams', column: 'team_code', unique: true },
    { name: 'idx_auth_tokens_token', table: 'auth_tokens', column: 'token', unique: false },
    { name: 'idx_auth_tokens_user_id', table: 'auth_tokens', column: 'user_id', unique: false },
    { name: 'idx_refresh_tokens_user_id', table: 'refresh_tokens', column: 'user_id', unique: false },
  ];

  for (const index of requiredIndexes) {
    try {
      // Проверяем существование таблицы
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [index.table]);

      if (!tableExists.rows[0].exists) {
        continue;
      }

      // Проверяем существование колонки
      const columnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
        )
      `, [index.table, index.column]);

      if (!columnExists.rows[0].exists) {
        continue;
      }

      // Создаем индекс
      const uniqueClause = index.unique ? 'UNIQUE' : '';
      await pool.query(`
        CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} 
        ON ${index.table}(${index.column})
      `);
    } catch (error) {
      // Игнорируем ошибки создания индекса, если он уже существует
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn(`Предупреждение при создании индекса ${index.name}:`, error.message);
      }
    }
  }
}

/**
 * Инициализирует систему миграций и применяет изменения
 */
export async function runMigrations() {
  try {
    await ensureMigrationsTable();
    await applySchemaChanges();
  } catch (error) {
    console.error('Ошибка при выполнении миграций:', error);
    throw error;
  }
}
