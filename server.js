import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import { sanitizeInput } from './middleware/security.js';
import { logInfo, logError, logWarn } from './utils/logger.js';
import { initDB } from './db/index.js';
import pool from './db/index.js';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import solutionsRoutes from './routes/solutions.js';
import adminRoutes from './routes/admin.js';
import teamsRoutes from './routes/teams.js';
import profileRoutes from './routes/profile.js';
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


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  compression({
    threshold: 1024, // не трогаем совсем маленькие ответы
  })
);
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


app.use(sanitizeInput);


app.use('/uploads', express.static(uploadsDir));


app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/solutions', solutionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/profile', profileRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});



const clientDistPath = process.env.CLIENT_DIST_PATH
  ? path.resolve(process.env.CLIENT_DIST_PATH)
  : path.join(__dirname, 'public');
const clientIndexHtml = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientIndexHtml)) {
  app.use(express.static(clientDistPath));


  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(clientIndexHtml);
  });
} else {
  logWarn('Frontend dist не найден', { 
    path: clientIndexHtml,
    message: 'Если нужен фронт на этом же домене — соберите client и положите dist в server/public или установите CLIENT_DIST_PATH'
  });
}


async function ensureMainAdmin() {
  const mainAdminTelegramId = process.env.MAIN_ADMIN_TELEGRAM_ID;
  
  if (!mainAdminTelegramId) {
    logWarn('MAIN_ADMIN_TELEGRAM_ID не задан. Главный админ не будет создан автоматически');
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, role FROM users WHERE telegram_id = $1',
      [mainAdminTelegramId]
    );

    if (result.rows.length === 0) {

      await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (telegram_id) DO UPDATE SET role = $4`,
        [mainAdminTelegramId, 'admin', 'Главный администратор', 'admin']
      );
      logInfo('Главный админ создан/обновлен', { telegramId: mainAdminTelegramId });
    } else {

      if (result.rows[0].role !== 'admin') {
        await pool.query(
          'UPDATE users SET role = $1 WHERE telegram_id = $2',
          ['admin', mainAdminTelegramId]
        );
        logInfo('Роль пользователя обновлена на админа', { telegramId: mainAdminTelegramId });
      } else {
        logInfo('Главный админ уже существует', { telegramId: mainAdminTelegramId });
      }
    }
  } catch (error) {
    logError('Ошибка при создании главного админа', error, { telegramId: mainAdminTelegramId });
  }
}


async function startServer() {
  try {
    await initDB();
    await ensureMainAdmin();
    const bot = startBot();
    setBotInstance(bot);
    

    startCaseOpenerScheduler();
    
    app.listen(PORT, () => {
      logInfo('Сервер запущен', { port: PORT, nodeEnv: process.env.NODE_ENV });
    });
  } catch (error) {
    logError('Ошибка запуска сервера', error);
    process.exit(1);
  }
}

startServer();
