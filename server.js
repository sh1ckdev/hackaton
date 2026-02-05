import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { initDB } from './db/index.js';
import pool from './db/index.js';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import solutionsRoutes from './routes/solutions.js';
import adminRoutes from './routes/admin.js';
import teamsRoutes from './routes/teams.js';
import { startBot, setBotInstance } from './bot.js';
import { startCaseOpenerScheduler } from './utils/caseOpener.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.set('etag', false);
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 1);
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;

// Создание папки для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(helmet({
  contentSecurityPolicy: false
}));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false
});

const speedLimiter = slowDown({
  windowMs: Number(process.env.SLOWDOWN_WINDOW_MS || 10 * 60 * 1000),
  delayAfter: Number(process.env.SLOWDOWN_AFTER || 100),
  delayMs: (hits) => Math.min((hits - 100) * 100, 2000)
});

app.use(limiter);
app.use(speedLimiter);
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((v) => v.trim()) : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Статические файлы для загрузок
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/solutions', solutionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Frontend (SPA) в production: раздаём статические файлы и делаем fallback на index.html
// Это устраняет 404 на прямых переходах вида /cases, /profile и т.п.
const clientDistPath = process.env.CLIENT_DIST_PATH
  ? path.resolve(process.env.CLIENT_DIST_PATH)
  : path.join(__dirname, 'public');
const clientIndexHtml = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientIndexHtml)) {
  app.use(express.static(clientDistPath));

  // SPA fallback: все не-API запросы ведём в index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(clientIndexHtml);
  });
} else {
  console.warn(
    `[frontend] dist не найден: ${clientIndexHtml}. ` +
      'Если нужен фронт на этом же домене — соберите client и положите dist в server/public ' +
      'или установите CLIENT_DIST_PATH.'
  );
}

// Автоматическое создание главного админа
async function ensureMainAdmin() {
  const mainAdminTelegramId = process.env.MAIN_ADMIN_TELEGRAM_ID;
  
  if (!mainAdminTelegramId) {
    console.warn('MAIN_ADMIN_TELEGRAM_ID не задан. Главный админ не будет создан автоматически.');
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, role FROM users WHERE telegram_id = $1',
      [mainAdminTelegramId]
    );

    if (result.rows.length === 0) {
      // Создаем пользователя-админа если его нет
      await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (telegram_id) DO UPDATE SET role = $4`,
        [mainAdminTelegramId, 'admin', 'Главный администратор', 'admin']
      );
      console.log(`Главный админ создан/обновлен: Telegram ID ${mainAdminTelegramId}`);
    } else {
      // Обновляем роль если пользователь существует
      if (result.rows[0].role !== 'admin') {
        await pool.query(
          'UPDATE users SET role = $1 WHERE telegram_id = $2',
          ['admin', mainAdminTelegramId]
        );
        console.log(`Роль пользователя обновлена на админа: Telegram ID ${mainAdminTelegramId}`);
      } else {
        console.log(`Главный админ уже существует: Telegram ID ${mainAdminTelegramId}`);
      }
    }
  } catch (error) {
    console.error('Ошибка при создании главного админа:', error);
  }
}

// Инициализация БД и запуск сервера
async function startServer() {
  try {
    await initDB();
    await ensureMainAdmin();
    const bot = startBot();
    setBotInstance(bot);
    
    // Запускаем планировщик открытия кейсов
    startCaseOpenerScheduler();
    
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

startServer();
