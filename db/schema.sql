
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    vk_id BIGINT UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    middle_name VARCHAR(255),
    photo_url TEXT,
    phone VARCHAR(32),
    student_course VARCHAR(30),
    institution VARCHAR(255),
    school_name VARCHAR(255),
    school_class VARCHAR(50),
    user_code VARCHAR(6) UNIQUE,
    participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_course VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_class VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vk_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code VARCHAR(6) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL);

DO $$
BEGIN
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE 'users_role_check%' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'users'::regclass 
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%role%IN%'
        LOOP
            EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        END LOOP;
    END IF;
    
    
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('user', 'moderator', 'admin'));
EXCEPTION
    WHEN duplicate_object THEN
        
        NULL;
END $$;

CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    max_participants INTEGER DEFAULT 0,
    current_participants INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    opens_at TIMESTAMP, 
    participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL), 
    links JSONB DEFAULT '[]'::jsonb, 
    attachments JSONB DEFAULT '[]'::jsonb, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS opens_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS participant_category VARCHAR(20) CHECK (participant_category IN ('student', 'school') OR participant_category IS NULL);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS solutions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    github_url TEXT, 
    presentation_file_path TEXT, 
    demo_url TEXT,
    file_path TEXT, 
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reviewing')),
    admin_comment TEXT,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, case_id)
);

ALTER TABLE solutions ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS presentation_file_path TEXT;

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

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    replaced_by VARCHAR(128),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS broadcast_settings (
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
);

CREATE INDEX IF NOT EXISTS idx_broadcast_settings_type ON broadcast_settings(type);
CREATE INDEX IF NOT EXISTS idx_broadcast_settings_enabled ON broadcast_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_broadcast_settings_case_id ON broadcast_settings(case_id);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO system_settings (key, value) VALUES ('registration_closed', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS request_audit (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(64) NOT NULL,
    ip_address INET,
    method VARCHAR(10),
    path TEXT,
    query_string TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    content_length INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(20),
    user_agent TEXT,
    origin TEXT
);

CREATE TABLE IF NOT EXISTS auth_audit (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event VARCHAR(50) NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(100) NOT NULL,
    ip_address INET,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    path TEXT,
    method VARCHAR(10),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_request_audit_created_at ON request_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_audit_ip_created_at ON request_audit(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_audit_user_created_at ON request_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON auth_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_ip_created_at ON auth_audit(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_created_at ON auth_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_created_at ON security_events(ip_address, created_at DESC);