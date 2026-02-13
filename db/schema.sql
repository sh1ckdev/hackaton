-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    photo_url TEXT,
    phone VARCHAR(32),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

-- Обновление CHECK constraint для роли (если таблица уже существует)
-- Удаляем старый constraint, если он существует, и создаем новый
DO $$
BEGIN
    -- Удаляем существующие constraints на role, если они есть
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE 'users_role_check%' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        -- Также пытаемся удалить constraint с другим именем, если он был создан автоматически
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'users'::regclass 
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%role%IN%'
        LOOP
            EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        END LOOP;
    END IF;
    
    -- Создаем новый constraint с правильными значениями
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('user', 'moderator', 'admin'));
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint уже существует, ничего не делаем
        NULL;
END $$;

-- Создание таблицы кейсов
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    max_participants INTEGER DEFAULT 0,
    current_participants INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    opens_at TIMESTAMP, -- Дата и время открытия кейса (null = открыт сразу)
    links JSONB DEFAULT '[]'::jsonb, -- Массив ссылок [{label: string, url: string}]
    attachments JSONB DEFAULT '[]'::jsonb, -- Массив файлов [{name: string, url: string}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS opens_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Создание таблицы решений
CREATE TABLE IF NOT EXISTS solutions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    github_url TEXT, -- Ссылка на GitHub репозиторий
    presentation_file_path TEXT, -- Путь к файлу презентации
    demo_url TEXT,
    file_path TEXT, -- Оставлено для обратной совместимости
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reviewing')),
    admin_comment TEXT,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, case_id)
);

ALTER TABLE solutions ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS presentation_file_path TEXT;

-- Таблица команд
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_code VARCHAR(6) UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_code VARCHAR(6);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS assigned_case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL;

-- Участники команд (один пользователь в одной команде)
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Таблица одноразовых токенов для входа через бота
CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица refresh токенов
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    replaced_by VARCHAR(128),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_solutions_user_id ON solutions(user_id);
CREATE INDEX IF NOT EXISTS idx_solutions_case_id ON solutions(case_id);
CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_opens_at ON cases(opens_at) WHERE opens_at IS NOT NULL;

-- Таблица настроек рассылок
CREATE TABLE IF NOT EXISTS broadcast_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Название настройки рассылки
    type VARCHAR(50) NOT NULL CHECK (type IN ('case_opening', 'general', 'scheduled', 'event')), -- Тип рассылки
    enabled BOOLEAN DEFAULT TRUE, -- Включена ли рассылка
    target_audience JSONB DEFAULT '{"all": true}'::jsonb, -- Целевая аудитория: {all: true} или {roles: [], teams: [], users: []}
    message_template TEXT NOT NULL, -- Шаблон сообщения (поддерживает переменные типа {{case_title}})
    schedule_cron VARCHAR(100), -- Cron выражение для запланированных рассылок
    schedule_time TIMESTAMP, -- Конкретное время для одноразовой рассылки
    conditions JSONB DEFAULT '{}'::jsonb, -- Условия отправки (например, для кейсов: {case_status: 'active'})
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE, -- Связь с конкретным кейсом (если применимо)
    last_sent_at TIMESTAMP, -- Когда последний раз отправлялась
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcast_settings_type ON broadcast_settings(type);
CREATE INDEX IF NOT EXISTS idx_broadcast_settings_enabled ON broadcast_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_broadcast_settings_case_id ON broadcast_settings(case_id);