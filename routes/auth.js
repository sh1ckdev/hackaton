import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db/index.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

const signAccessToken = (user) => jwt.sign(
  { id: user.id, telegram_id: user.telegram_id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const createRefreshToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [userId, tokenHash]
  );
  return { token, tokenHash };
};

const verifyCaptcha = async (captchaToken) => {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!captchaToken) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: captchaToken
    })
  });
  const data = await response.json();
  return !!data.success;
};

router.post('/telegram', async (req, res) => {
  try {
    const { initData, captcha_token } = req.body;
    const captchaOk = await verifyCaptcha(captcha_token);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Капча не пройдена' });
    }

    if (!initData) {
      return res.status(400).json({ error: 'Данные Telegram отсутствуют' });
    }



    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    
    if (!userStr) {
      return res.status(400).json({ error: 'Данные пользователя отсутствуют' });
    }

    const telegramUser = JSON.parse(userStr);
    const telegramId = telegramUser.id;


    let result = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    let user;
    if (result.rows.length === 0) {

      result = await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          telegramId,
          telegramUser.username || null,
          telegramUser.first_name || null,
          telegramUser.last_name || null,
          telegramUser.photo_url || null
        ]
      );
      user = result.rows[0];
    } else {

      result = await pool.query(
        `UPDATE users 
         SET username = $1, first_name = $2, last_name = $3, photo_url = $4, updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $5
         RETURNING *`,
        [
          telegramUser.username || null,
          telegramUser.first_name || null,
          telegramUser.last_name || null,
          telegramUser.photo_url || null,
          telegramId
        ]
      );
      user = result.rows[0];
    }

    const accessToken = signAccessToken(user);
    const refresh = await createRefreshToken(user.id);

    res.json({ token: accessToken, refresh_token: refresh.token, user });
  } catch (error) {
    logError('Ошибка аутентификации', error);
    res.status(500).json({ error: 'Ошибка сервера при аутентификации' });
  }
});


router.post('/bot', async (req, res) => {
  try {
    const { token, captcha_token } = req.body;
    const captchaOk = await verifyCaptcha(captcha_token);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Капча не пройдена' });
    }
    if (!token) {
      return res.status(400).json({ error: 'Токен отсутствует' });
    }

    const tokenResult = await pool.query(
      `SELECT a.id as auth_id, a.user_id, a.used, a.expires_at, u.*
       FROM auth_tokens a
       JOIN users u ON a.user_id = u.id
       WHERE a.token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Токен не найден' });
    }

    const row = tokenResult.rows[0];
    if (row.used) {
      return res.status(400).json({ error: 'Токен уже использован' });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Токен истек' });
    }

    await pool.query(
      `UPDATE auth_tokens
       SET used = TRUE, used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [row.auth_id]
    );

    const jwtToken = signAccessToken(row);
    const refresh = await createRefreshToken(row.user_id);

    const user = {
      id: row.user_id,
      telegram_id: row.telegram_id,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      photo_url: row.photo_url,
      phone: row.phone,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    res.json({ token: jwtToken, refresh_token: refresh.token, user });
  } catch (error) {
    logError('Ошибка входа через бота', error, { token: req.body?.token ? 'present' : 'missing' });
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});


router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh токен отсутствует' });
    }

    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const tokenResult = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Refresh токен не найден' });
    }
    const tokenRow = tokenResult.rows[0];
    if (tokenRow.revoked) {
      return res.status(400).json({ error: 'Refresh токен отозван' });
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Refresh токен истек' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [tokenRow.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const user = userResult.rows[0];

    const accessToken = signAccessToken(user);
    const newRefresh = await createRefreshToken(user.id);

    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE, replaced_by = $1 WHERE id = $2`,
      [newRefresh.tokenHash, tokenRow.id]
    );

    res.json({ token: accessToken, refresh_token: newRefresh.token });
  } catch (error) {
    logError('Ошибка обновления токена', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении токена' });
  }
});


router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh токен отсутствует' });
    }
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [tokenHash]);
    res.json({ ok: true });
  } catch (error) {
    logError('Ошибка выхода', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера при выходе' });
  }
});


router.get('/me', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Токен отсутствует' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

export default router;
