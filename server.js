import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { initDB } from './db/index.js';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import solutionsRoutes from './routes/solutions.js';
import adminRoutes from './routes/admin.js';
import teamsRoutes from './routes/teams.js';
import { startBot } from './bot.js';
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

// Инициализация БД и запуск сервера
async function startServer() {
  try {
    await initDB();
    startBot();
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

startServer();
