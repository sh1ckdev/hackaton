

import pool from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logWarn, logError } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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


async function saveMigrationVersion(version, description) {
  await pool.query(
    'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
    [version, description]
  );
}


function getSchemaHash(schemaContent) {

  const schemaPath = path.join(__dirname, 'schema.sql');
  const stats = fs.statSync(schemaPath);
  return `${stats.mtime.getTime()}-${stats.size}`;
}


function parseSQLStatements(sqlContent) {
  const statements = [];
  let currentStatement = '';
  let inDollarQuote = false;
  let dollarQuoteTag = null;
  let pos = 0;

  while (pos < sqlContent.length) {
    const char = sqlContent[pos];
    const nextChar = pos + 1 < sqlContent.length ? sqlContent[pos + 1] : '';


    if (char === '-' && nextChar === '-') {

      while (pos < sqlContent.length && sqlContent[pos] !== '\n') {
        pos++;
      }
      continue;
    }


    if (char === '$' && !inDollarQuote) {

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

      currentStatement += dollarQuoteTag;
      pos += dollarQuoteTag.length;
      inDollarQuote = false;
      dollarQuoteTag = null;
      continue;
    }


    currentStatement += char;


    if (!inDollarQuote && char === ';') {
      const stmt = currentStatement.trim();
      if (stmt && stmt.length > 0 && !stmt.match(/^\s*$/)) {
        statements.push(stmt);
      }
      currentStatement = '';
    }

    pos++;
  }


  const lastStmt = currentStatement.trim();
  if (lastStmt && lastStmt.length > 0) {
    statements.push(lastStmt);
  }

  return statements.filter(s => s.length > 0 && !s.match(/^\s*--/));
}


async function applySchemaChanges() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    logWarn('Файл schema.sql не найден, пропускаю миграции');
    return;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schemaHash = getSchemaHash(schemaContent);
  const currentVersion = await getCurrentSchemaVersion();


  const forceMigrate = process.env.FORCE_DB_MIGRATE === 'true';


  if (currentVersion === schemaHash && !forceMigrate) {
    logInfo('Схема БД актуальна, миграции schema.sql не требуются');
  } else {

  if (forceMigrate) {
    logInfo('Принудительное применение миграций (FORCE_DB_MIGRATE=true)');
  } else {
    logInfo('Обнаружены изменения в схеме БД, применяю миграции');
  }


  const statements = parseSQLStatements(schemaContent);


  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.trim().length === 0) {
      continue;
    }

    try {
      await pool.query(statement);
      logInfo(`Применена команда ${i + 1}/${statements.length}`, { total: statements.length, current: i + 1 });
    } catch (error) {

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

        logInfo(`Команда ${i + 1}/${statements.length} пропущена (объект уже существует)`, { total: statements.length, current: i + 1 });
        continue;
      }

      logWarn(`Предупреждение при применении команды ${i + 1}/${statements.length}`, { error: error.message, code: error.code, total: statements.length, current: i + 1 });
    }
  }


  await applyAdditionalMigrations();

    await saveMigrationVersion(schemaHash, `Схема обновлена: ${new Date().toISOString()}`);
    logInfo('Миграции схемы применены успешно');
  }
}


async function applyAdditionalMigrations() {

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
      logInfo('Обновление CHECK constraint для роли пользователя');

      for (const row of constraintCheck.rows) {
        try {
          await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${row.conname}`);
        } catch (e) {

        }
      }

      await pool.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('user', 'moderator', 'admin'))
      `);
      logInfo('CHECK constraint для роли обновлен успешно');
    }
  } catch (error) {
    logWarn('Предупреждение при проверке constraint для роли', { error: error.message });
  }


  await ensureColumnsExist();
  

  await ensureNewFieldsExist();


  await ensureIndexesExist();
}


async function ensureColumnsExist() {
  const requiredColumns = {
    users: [
      { name: 'phone', type: 'VARCHAR(32)' },
    ],
    teams: [
      { name: 'team_code', type: 'VARCHAR(6)' },
      { name: 'assigned_case_id', type: 'INTEGER REFERENCES cases(id) ON DELETE SET NULL' },
    ],
  };

  for (const [tableName, columns] of Object.entries(requiredColumns)) {

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

        if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
          logWarn(`Предупреждение при добавлении колонки ${tableName}.${column.name}`, { error: error.message, table: tableName, column: column.name });
        }
      }
    }
  }
}


async function ensureNewFieldsExist() {
  try {

    const casesOpensAtExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'opens_at'
      )
    `);

    if (!casesOpensAtExists.rows[0].exists) {
      await pool.query('ALTER TABLE cases ADD COLUMN opens_at TIMESTAMP');
      logInfo('Добавлено поле opens_at в таблицу cases');
    }

    const casesNotificationSentExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'notification_sent'
      )
    `);

    if (!casesNotificationSentExists.rows[0].exists) {
      await pool.query('ALTER TABLE cases ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE');
      logInfo('Добавлено поле notification_sent в таблицу cases');
    }


    const solutionsGithubExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'github_url'
      )
    `);

    if (!solutionsGithubExists.rows[0].exists) {
      await pool.query('ALTER TABLE solutions ADD COLUMN github_url TEXT');
      logInfo('Добавлено поле github_url в таблицу solutions');
    }


    const solutionsPresentationExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'presentation_file_path'
      )
    `);

    if (!solutionsPresentationExists.rows[0].exists) {
      await pool.query('ALTER TABLE solutions ADD COLUMN presentation_file_path TEXT');
      logInfo('Добавлено поле presentation_file_path в таблицу solutions');
    }

    const solutionsTeamIdExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'team_id'
      )
    `);

    if (!solutionsTeamIdExists.rows[0].exists) {
      await pool.query('ALTER TABLE solutions ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE');
      await pool.query(`
        UPDATE solutions s SET team_id = (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = s.user_id LIMIT 1
        )
      `);
      await pool.query('DELETE FROM solutions WHERE team_id IS NULL');
      await pool.query('ALTER TABLE solutions ALTER COLUMN team_id SET NOT NULL');
      await pool.query('ALTER TABLE solutions ADD CONSTRAINT solutions_team_id_case_id_key UNIQUE (team_id, case_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_solutions_team_id ON solutions(team_id)');
      logInfo('Добавлено поле team_id в таблицу solutions, решения привязаны к командам');
    }

    if (solutionsTeamIdExists.rows[0].exists) {
      await pool.query(`
        UPDATE solutions s SET team_id = (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = s.user_id LIMIT 1
        ) WHERE s.team_id IS NULL
      `);
      await pool.query('DELETE FROM solutions WHERE team_id IS NULL');

      const oldConstraintExists = await pool.query(`
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'solutions'::regclass AND conname = 'solutions_user_id_case_id_key'
      `);
      if (oldConstraintExists.rows.length > 0) {
        await pool.query('ALTER TABLE solutions DROP CONSTRAINT solutions_user_id_case_id_key');
        logInfo('Удалён старый UNIQUE(user_id, case_id)');
      }

      const newConstraintExists = await pool.query(`
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'solutions'::regclass AND conname = 'solutions_team_id_case_id_key'
      `);
      if (newConstraintExists.rows.length === 0) {
        await pool.query('ALTER TABLE solutions ADD CONSTRAINT solutions_team_id_case_id_key UNIQUE (team_id, case_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_solutions_team_id ON solutions(team_id)');
        logInfo('Добавлен UNIQUE(team_id, case_id)');
      }
    }

    // Проверка существования таблицы broadcast_settings
    const broadcastSettingsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'broadcast_settings'
      )
    `);

    if (!broadcastSettingsExists.rows[0].exists) {
      await pool.query(`
        CREATE TABLE broadcast_settings (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('case_opening', 'general', 'scheduled', 'event')),
          enabled BOOLEAN DEFAULT TRUE,
          target_audience JSONB DEFAULT '{"all": true}'::jsonb,
          message_template TEXT NOT NULL,
          schedule_cron VARCHAR(100),
          schedule_time TIMESTAMP,
          conditions JSONB DEFAULT '{}'::jsonb,
          case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
          last_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logInfo('Создана таблица broadcast_settings');
    }

    // Проверка полей bio и skills в таблице users
    const usersBioExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'bio'
      )
    `);

    if (!usersBioExists.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN bio TEXT');
      logInfo('Добавлено поле bio в таблицу users');
    }

    const usersSkillsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'skills'
      )
    `);

    if (!usersSkillsExists.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN skills JSONB DEFAULT \'[]\'::jsonb');
      logInfo('Добавлено поле skills в таблицу users');
    }

    // email для VK ID и др.
    const usersEmailExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'email'
      )
    `);
    if (!usersEmailExists.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
      logInfo('Добавлено поле email в таблицу users');
    }

    // vk_id для входа через VK ID
    const usersVkIdExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'vk_id'
      )
    `);

    if (!usersVkIdExists.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN vk_id BIGINT UNIQUE');
      try {
        await pool.query('ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL');
      } catch (e) {
        if (!e.message.includes('does not exist') && !e.message.includes('is not nullable')) {
          logWarn('telegram_id DROP NOT NULL', { error: e.message });
        }
      }
      try {
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_has_auth');
        await pool.query(`
          ALTER TABLE users ADD CONSTRAINT users_has_auth
          CHECK (telegram_id IS NOT NULL OR vk_id IS NOT NULL)
        `);
      } catch (e) {
        if (!e.message.includes('already exists')) logWarn('users_has_auth constraint', { error: e.message });
      }
      logInfo('Добавлено поле vk_id в таблицу users');
    }

    // user_code — 6-значный буквенно-цифровой код пользователя
    const usersUserCodeExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'user_code'
      )
    `);
    if (!usersUserCodeExists.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN user_code VARCHAR(6) UNIQUE');
      const genCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      };
      const rows = (await pool.query('SELECT id FROM users WHERE user_code IS NULL')).rows;
      for (const row of rows) {
        let code;
        for (let i = 0; i < 20; i++) {
          code = genCode();
          const taken = await pool.query('SELECT 1 FROM users WHERE user_code = $1', [code]);
          if (taken.rows.length === 0) break;
        }
        await pool.query('UPDATE users SET user_code = $1 WHERE id = $2', [code, row.id]);
      }
      try {
        await pool.query('ALTER TABLE users ALTER COLUMN user_code SET NOT NULL');
      } catch (e) {
        logWarn('user_code NOT NULL', { error: e.message });
      }
      logInfo('Добавлено поле user_code в users');
    }

    // participant_category — студент / школьник для разделения команд
    const usersParticipantCategoryExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'participant_category'
      )
    `);
    if (!usersParticipantCategoryExists.rows[0].exists) {
      await pool.query(`ALTER TABLE users ADD COLUMN participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL)`);
      logInfo('Добавлено поле participant_category в users');
    }

    const teamsParticipantCategoryExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'participant_category'
      )
    `);
    if (!teamsParticipantCategoryExists.rows[0].exists) {
      await pool.query(`ALTER TABLE teams ADD COLUMN participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL)`);
      logInfo('Добавлено поле participant_category в teams');
    }

    await pool.query(`
      UPDATE teams t SET participant_category = (
        SELECT u.participant_category FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = t.id AND tm.role = 'captain'
        LIMIT 1
      ) WHERE t.participant_category IS NULL
    `);

    // participant_category в cases — школьники / студенты
    const casesParticipantCategoryExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'participant_category'
      )
    `);
    if (!casesParticipantCategoryExists.rows[0].exists) {
      await pool.query(`ALTER TABLE cases ADD COLUMN participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL)`);
      logInfo('Добавлено поле participant_category в cases');
    }

    // last_activity_at — время последней активности на сайте (для статуса онлайн)
    const usersLastActivityAtExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_activity_at'
      )
    `);
    if (!usersLastActivityAtExists.rows[0].exists) {
      await pool.query('ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMP');
      logInfo('Добавлено поле last_activity_at в users');
    }

    // specialty в team_members (fullstack, frontend, backend, design, mobile, devops)
    const teamMembersSpecialtyExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_members' 
        AND column_name = 'specialty'
      )
    `);
    if (!teamMembersSpecialtyExists.rows[0].exists) {
      await pool.query(`ALTER TABLE team_members ADD COLUMN specialty VARCHAR(30) DEFAULT 'fullstack'`);
      logInfo('Добавлено поле specialty в team_members');
    }

    // Индекс для vk_id
    const idxVkIdExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'idx_users_vk_id'
      )
    `);
    if (!idxVkIdExists.rows[0].exists) {
      try {
        await pool.query('CREATE INDEX idx_users_vk_id ON users(vk_id)');
        logInfo('Создан индекс idx_users_vk_id');
      } catch (e) {
        if (!e.message.includes('already exists')) logWarn('Индекс idx_users_vk_id', { error: e.message });
      }
    }

    // Проверка существования таблицы hackathon_timeline
    const timelineExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathon_timeline'
      )
    `);

    if (!timelineExists.rows[0].exists) {
      await pool.query(`
        CREATE TABLE hackathon_timeline (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          date TIMESTAMP NOT NULL,
          active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logInfo('Создана таблица hackathon_timeline');
    }

    // date_to и show_countdown для таймлайна (от/до, таймер на главной)
    const timelineDateToExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathon_timeline' 
        AND column_name = 'date_to'
      )
    `);
    if (!timelineDateToExists.rows[0].exists) {
      await pool.query('ALTER TABLE hackathon_timeline ADD COLUMN date_to TIMESTAMP');
      logInfo('Добавлено поле date_to в hackathon_timeline');
    }
    const timelineShowCountdownExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathon_timeline' 
        AND column_name = 'show_countdown'
      )
    `);
    if (!timelineShowCountdownExists.rows[0].exists) {
      await pool.query('ALTER TABLE hackathon_timeline ADD COLUMN show_countdown BOOLEAN DEFAULT FALSE');
      logInfo('Добавлено поле show_countdown в hackathon_timeline');
    }

    // Проверка существования таблицы hackathon_prizes
    const prizesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathon_prizes'
      )
    `);

    if (!prizesExists.rows[0].exists) {
      await pool.query(`
        CREATE TABLE hackathon_prizes (
          id SERIAL PRIMARY KEY,
          rank INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          amount INTEGER NOT NULL DEFAULT 0,
          benefits JSONB DEFAULT '[]'::jsonb,
          featured BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logInfo('Создана таблица hackathon_prizes');
    }

    // Проверка существования таблицы hackathon_tracks
    const tracksExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathon_tracks'
      )
    `);

    if (!tracksExists.rows[0].exists) {
      await pool.query(`
        CREATE TABLE hackathon_tracks (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          tags JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logInfo('Создана таблица hackathon_tracks');
    }

    // Создание индексов для broadcast_settings
    const indexes = [
      { name: 'idx_broadcast_settings_type', table: 'broadcast_settings', column: 'type' },
      { name: 'idx_broadcast_settings_enabled', table: 'broadcast_settings', column: 'enabled' },
      { name: 'idx_broadcast_settings_case_id', table: 'broadcast_settings', column: 'case_id' },
      { name: 'idx_hackathon_timeline_date', table: 'hackathon_timeline', column: 'date' },
      { name: 'idx_hackathon_timeline_active', table: 'hackathon_timeline', column: 'active' },
      { name: 'idx_hackathon_prizes_rank', table: 'hackathon_prizes', column: 'rank' }
    ];

    for (const index of indexes) {
      try {
        const indexExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = $1
          )
        `, [index.name]);

        if (!indexExists.rows[0].exists) {
          await pool.query(`CREATE INDEX ${index.name} ON ${index.table}(${index.column})`);
          logInfo(`Создан индекс ${index.name}`);
        }
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logWarn(`Предупреждение при создании индекса ${index.name}`, { error: error.message });
        }
      }
    }
  } catch (error) {
    logWarn('Предупреждение при проверке новых полей', { error: error.message });
  }
}


async function ensureIndexesExist() {
  const requiredIndexes = [
    { name: 'idx_users_telegram_id', table: 'users', column: 'telegram_id', unique: false },
    { name: 'idx_users_phone', table: 'users', column: 'phone', unique: false },
    { name: 'idx_solutions_user_id', table: 'solutions', column: 'user_id', unique: false },
    { name: 'idx_solutions_case_id', table: 'solutions', column: 'case_id', unique: false },
    { name: 'idx_solutions_status', table: 'solutions', column: 'status', unique: false },
    { name: 'idx_team_members_team_id', table: 'team_members', column: 'team_id', unique: false },
    { name: 'idx_teams_team_code', table: 'teams', column: 'team_code', unique: true },
    { name: 'idx_teams_assigned_case_id', table: 'teams', column: 'assigned_case_id', unique: false },
    { name: 'idx_auth_tokens_token', table: 'auth_tokens', column: 'token', unique: false },
    { name: 'idx_auth_tokens_user_id', table: 'auth_tokens', column: 'user_id', unique: false },
    { name: 'idx_refresh_tokens_user_id', table: 'refresh_tokens', column: 'user_id', unique: false },
    { name: 'idx_cases_opens_at', table: 'cases', column: 'opens_at', unique: false, partial: true },
  ];

  for (const index of requiredIndexes) {
    try {

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


      const uniqueClause = index.unique ? 'UNIQUE' : '';
      const partialClause = index.partial ? `WHERE ${index.column} IS NOT NULL` : '';
      await pool.query(`
        CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} 
        ON ${index.table}(${index.column}) ${partialClause}
      `);
    } catch (error) {

      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        logWarn(`Предупреждение при создании индекса ${index.name}`, { error: error.message, index: index.name, table: index.table });
      }
    }
  }
}


export async function runMigrations() {
  try {
    await ensureMigrationsTable();
    await applySchemaChanges();
    // Всегда применяем дополнительные миграции (vk_id и др.) — они добавляют отсутствующие столбцы
    await applyAdditionalMigrations();
    await applySupportMigration();
  } catch (error) {
    logError('Ошибка при выполнении миграций', error);
    throw error;
  }
}

async function applySupportMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'admin')),
        text TEXT NOT NULL,
        tg_message_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id)
    `);

    logInfo('Миграция support: таблицы готовы');
  } catch (error) {
    logWarn('Предупреждение при миграции support', { error: error.message });
  }
}
