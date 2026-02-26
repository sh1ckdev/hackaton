import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db/index.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

const signAccessToken = (user) => jwt.sign(
  { id: user.id, telegram_id: user.telegram_id ?? null, vk_id: user.vk_id ?? null, max_id: user.max_id ?? null, role: user.role },
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

    // Парсим JSON поля если они есть
    if (user.skills && typeof user.skills === 'string') {
      try {
        user.skills = JSON.parse(user.skills);
      } catch (e) {
        user.skills = [];
      }
    } else if (!user.skills) {
      user.skills = [];
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

    // Парсим JSON поля если они есть
    let skills = [];
    if (row.skills) {
      try {
        skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
      } catch (e) {
        skills = [];
      }
    }

    const user = {
      id: row.user_id,
      telegram_id: row.telegram_id,
      vk_id: row.vk_id ?? null,
      max_id: row.max_id ?? null,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      photo_url: row.photo_url,
      phone: row.phone,
      role: row.role,
      bio: row.bio || null,
      skills: skills,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    res.json({ token: jwtToken, refresh_token: refresh.token, user });
  } catch (error) {
    logError('Ошибка входа через бота', error, { token: req.body?.token ? 'present' : 'missing' });
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});


// VK ID OAuth 2.1 (id.vk.ru) — для приложений, созданных в VK ID

const latToCyrMap = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', ž: 'ж', z: 'з', i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', č: 'ч', š: 'ш', ŝ: 'щ', y: 'ы', ė: 'э', ju: 'ю', ja: 'я',
  A: 'А', B: 'Б', V: 'В', G: 'Г', D: 'Д', E: 'Е', Ž: 'Ж', Z: 'З', I: 'И', J: 'Й', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', R: 'Р', S: 'С', T: 'Т', U: 'У', F: 'Ф', H: 'Х', C: 'Ц', Č: 'Ч', Š: 'Ш', Ŝ: 'Щ', Y: 'Ы', Ė: 'Э',
  ā: 'а', ē: 'е', ī: 'и', ō: 'о', ū: 'у', ļ: 'л', Ļ: 'Л', ņ: 'н', Ņ: 'Н', ķ: 'к', Ķ: 'К', ģ: 'г', Ģ: 'Г', Ā: 'А', Ē: 'Е', Ī: 'И', Ō: 'О', Ū: 'У'
};

const transliterateToCyrillic = (str) => {
  if (!str || typeof str !== 'string') return str;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const mapped = latToCyrMap[c];
    out += mapped !== undefined ? mapped : c;
  }
  return out;
};

const vkPkceStore = new Map(); // state -> { code_verifier, expires }
const VK_PKCE_TTL_MS = 10 * 60 * 1000;

const generateCodeVerifier = () => crypto.randomBytes(32).toString('base64url');
const generateCodeChallenge = (verifier) =>
  crypto.createHash('sha256').update(verifier).digest('base64url');
const generateState = () => crypto.randomBytes(24).toString('base64url');

const getVkAuthUrl = () => {
  const clientId = process.env.VK_APP_ID;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (!clientId) return null;
  const redirectUri = `${clientUrl}/auth/vk/callback`;
  const scope = 'vkid.personal_info email phone';
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  vkPkceStore.set(state, {
    code_verifier: codeVerifier,
    expires: Date.now() + VK_PKCE_TTL_MS
  });
  return {
    url: `https://id.vk.ru/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&lang_id=0`,
    state
  };
};

// Очистка устаревших записей
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of vkPkceStore.entries()) {
    if (v.expires < now) vkPkceStore.delete(k);
  }
}, 60 * 1000);

router.get('/vk', (req, res) => {
  const data = getVkAuthUrl();
  if (!data) {
    return res.status(503).json({ error: 'VK ID не настроен (VK_APP_ID)' });
  }
  res.redirect(data.url);
});

router.post('/vk', async (req, res) => {
  try {
    const { code, state, device_id } = req.body;
    const clientId = process.env.VK_APP_ID;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUri = `${clientUrl}/auth/vk/callback`;

    if (!clientId) {
      return res.status(503).json({ error: 'VK ID не настроен' });
    }
    if (!code || !state) {
      return res.status(400).json({ error: 'Код и state отсутствуют' });
    }

    const stored = vkPkceStore.get(state);
    if (!stored || stored.expires < Date.now()) {
      vkPkceStore.delete(state);
      return res.status(400).json({ error: 'Сессия авторизации истекла, повторите вход' });
    }
    const { code_verifier } = stored;
    vkPkceStore.delete(state);

    const params = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      code_verifier,
      redirect_uri: redirectUri,
      state
    });
    if (device_id) params.set('device_id', device_id);

    const tokenRes = await fetch('https://id.vk.ru/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      logError('VK ID token error', null, { vkError: tokenData });
      return res.status(400).json({ error: tokenData.error_description || 'Ошибка VK ID авторизации' });
    }

    const { access_token: accessToken, user_id: vkUserId } = tokenData;

    const userInfoRes = await fetch('https://id.vk.ru/oauth2/user_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: accessToken, client_id: clientId })
    });
    const userInfoData = await userInfoRes.json();

    const vkUser = userInfoData?.user;
    const rawFirst = vkUser?.first_name || '';
    const rawLast = vkUser?.last_name || '';
    const hasCyrillic = (s) => /[\u0400-\u04FF]/.test(s);
    const firstName = rawFirst && !hasCyrillic(rawFirst) ? transliterateToCyrillic(rawFirst) : rawFirst;
    const lastName = rawLast && !hasCyrillic(rawLast) ? transliterateToCyrillic(rawLast) : rawLast;
    const photoUrl = vkUser?.avatar || null;
    const phone = vkUser?.phone || null;
    const email = vkUser?.email || null;

    const normalizePhone = (p) => {
      if (!p || typeof p !== 'string') return null;
      const digits = p.replace(/\D/g, '');
      return digits.length >= 10 ? digits : null;
    };
    const phoneNorm = normalizePhone(phone);

    if (!phoneNorm) {
      return res.status(400).json({
        error: 'Для входа необходимо разрешить доступ к номеру телефона в VK ID'
      });
    }

    let result = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkUserId]);
    let user;

    if (result.rows.length > 0) {
      result = await pool.query(
        `UPDATE users
         SET first_name = $1, last_name = $2, photo_url = COALESCE(NULLIF($3, ''), photo_url),
             phone = COALESCE($4, phone), email = COALESCE($5, email), updated_at = CURRENT_TIMESTAMP
         WHERE vk_id = $6
         RETURNING *`,
        [firstName, lastName, photoUrl, phone, email, vkUserId]
      );
      user = result.rows[0];
    } else if (phoneNorm) {
      result = await pool.query(
        `SELECT * FROM users WHERE REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $1 LIMIT 1`,
        [phoneNorm]
      );
      if (result.rows.length > 0) {
        const existing = result.rows[0];
        result = await pool.query(
          `UPDATE users
           SET vk_id = $1,
               first_name = COALESCE(NULLIF(TRIM(first_name), ''), $2),
               last_name = COALESCE(NULLIF(TRIM(last_name), ''), $3),
               photo_url = COALESCE(photo_url, $4),
               phone = COALESCE(phone, $5),
               email = COALESCE(email, $6),
               username = COALESCE(NULLIF(TRIM(username), ''), $7),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $8
           RETURNING *`,
          [vkUserId, firstName, lastName, photoUrl, phone, email, `vk${vkUserId}`, existing.id]
        );
        user = result.rows[0];
      }
    }

    if (!user) {
      result = await pool.query(
        `INSERT INTO users (vk_id, first_name, last_name, photo_url, phone, email, username)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [vkUserId, firstName, lastName, photoUrl, phone, email, `vk${vkUserId}`]
      );
      user = result.rows[0];
    }

    if (user.skills && typeof user.skills === 'string') {
      try {
        user.skills = JSON.parse(user.skills);
      } catch (e) {
        user.skills = [];
      }
    } else if (!user.skills) {
      user.skills = [];
    }

    const accessTokenJwt = signAccessToken(user);
    const refresh = await createRefreshToken(user.id);

    const userResponse = {
      id: user.id,
      telegram_id: user.telegram_id,
      vk_id: user.vk_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      photo_url: user.photo_url,
      phone: user.phone,
      email: user.email || null,
      role: user.role,
      bio: user.bio || null,
      skills: user.skills,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json({ token: accessTokenJwt, refresh_token: refresh.token, user: userResponse });
  } catch (error) {
    logError('Ошибка VK OAuth', error);
    res.status(500).json({ error: 'Ошибка сервера при входе через VK' });
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

    const user = result.rows[0];
    
    // Парсим JSON поля если они есть
    if (user.skills && typeof user.skills === 'string') {
      try {
        user.skills = JSON.parse(user.skills);
      } catch (e) {
        user.skills = [];
      }
    } else if (!user.skills) {
      user.skills = [];
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

export default router;
