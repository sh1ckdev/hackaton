import express from 'express';
import { generateUniqueUserCode } from '../utils/userCode.js';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';
import pool from '../db/index.js';
import { logError } from '../utils/logger.js';
import { requestPhoneFromUser } from '../bot.js';

const router = express.Router();

const signAccessToken = (user) => jwt.sign(
  { id: user.id, telegram_id: user.telegram_id ?? null, vk_id: user.vk_id ?? null, role: user.role },
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

// Верификация данных Telegram Login Widget
// https://core.telegram.org/widgets/login#checking-authorization
const verifyTelegramWidget = (data) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const { hash, ...fields } = data;
  if (!hash) return false;

  // Проверяем, что данные не старше 24 часов
  const authDate = parseInt(fields.auth_date, 10);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return false;

  // Строим строку для проверки: поля в алфавитном порядке key=value\n
  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');

  // Ключ = SHA256(bot_token), затем HMAC-SHA256(checkString, key)
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  return expectedHash === hash;
};

// POST /auth/telegram — вход через Telegram Login Widget
router.post('/telegram', async (req, res) => {
  try {
    const { telegramData, captcha_token, participant_category } = req.body;
    const captchaOk = await verifyCaptcha(captcha_token);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Капча не пройдена' });
    }

    if (!telegramData || !telegramData.id || !telegramData.hash) {
      return res.status(400).json({ error: 'Данные Telegram отсутствуют' });
    }

    if (!verifyTelegramWidget(telegramData)) {
      return res.status(401).json({ error: 'Подпись Telegram недействительна' });
    }

    const telegramId = telegramData.id;
    const cat = participant_category === 'student' || participant_category === 'school'
      ? participant_category : null;

    let result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);

    let user;
    if (result.rows.length === 0) {
      const userCode = await generateUniqueUserCode(pool);
      result = await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, user_code, participant_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          telegramId,
          telegramData.username || null,
          telegramData.first_name || null,
          telegramData.last_name || null,
          telegramData.photo_url || null,
          userCode,
          cat
        ]
      );
      user = result.rows[0];
    } else {
      const existingCat = result.rows[0].participant_category;
      result = await pool.query(
        `UPDATE users
         SET username = $1, first_name = $2, last_name = $3, photo_url = $4,
             participant_category = COALESCE($5, participant_category),
             updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $6
         RETURNING *`,
        [
          telegramData.username || null,
          telegramData.first_name || null,
          telegramData.last_name || null,
          telegramData.photo_url || null,
          existingCat || cat,
          telegramId
        ]
      );
      user = result.rows[0];
    }

    if (user.skills && typeof user.skills === 'string') {
      try { user.skills = JSON.parse(user.skills); } catch (e) { user.skills = []; }
    } else if (!user.skills) {
      user.skills = [];
    }

    // Если телефон не привязан — блокируем вход и просим поделиться через бота
    if (!user.phone) {
      requestPhoneFromUser(telegramId).catch(() => {});
      return res.status(403).json({
        needs_phone: true,
        error: 'Для входа необходимо поделиться номером телефона через бота'
      });
    }

    const accessToken = signAccessToken(user);
    const refresh = await createRefreshToken(user.id);

    res.json({ token: accessToken, refresh_token: refresh.token, user });
  } catch (error) {
    logError('Ошибка аутентификации Telegram Widget', error);
    res.status(500).json({ error: 'Ошибка сервера при аутентификации' });
  }
});


router.post('/bot', async (req, res) => {
  try {
    const { token, captcha_token, participant_category } = req.body;
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

    const cat = participant_category === 'student' || participant_category === 'school' ? participant_category : null;
    if (cat && !row.participant_category) {
      await pool.query('UPDATE users SET participant_category = $1 WHERE id = $2', [cat, row.user_id]);
      row.participant_category = cat;
    }

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
      participant_category: row.participant_category || null,
      telegram_id: row.telegram_id,
      vk_id: row.vk_id ?? null,
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

// Диграфы (двухбуквенные) — проверяются первыми
const latToCyrDigraphs = [
  ['yo', 'ё'], ['Yo', 'Ё'], ['YO', 'Ё'],
  ['zh', 'ж'], ['Zh', 'Ж'], ['ZH', 'Ж'],
  ['ts', 'ц'], ['Ts', 'Ц'], ['TS', 'Ц'],
  ['ch', 'ч'], ['Ch', 'Ч'], ['CH', 'Ч'],
  ['sh', 'ш'], ['Sh', 'Ш'], ['SH', 'Ш'],
  ['sch', 'щ'], ['Sch', 'Щ'], ['SCH', 'Щ'],
  ['kh', 'х'], ['Kh', 'Х'], ['KH', 'Х'],
  ['yu', 'ю'], ['Yu', 'Ю'], ['YU', 'Ю'],
  ['ya', 'я'], ['Ya', 'Я'], ['YA', 'Я'],
  ['ye', 'е'], ['Ye', 'Е'], ['YE', 'Е'],
  ['yi', 'и'], ['Yi', 'И'], ['YI', 'И'],
  ['iy', 'ий'], ['Iy', 'Ий'], ['IY', 'ИЙ'],
  ["'", 'ъ'],
];

// Одиночные символы
const latToCyrMap = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и',
  j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
  s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', y: 'ы', x: 'х',
  q: 'к', w: 'в',
  A: 'А', B: 'Б', V: 'В', G: 'Г', D: 'Д', E: 'Е', Z: 'З', I: 'И',
  J: 'Й', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', R: 'Р',
  S: 'С', T: 'Т', U: 'У', F: 'Ф', H: 'Х', C: 'Ц', Y: 'Ы', X: 'Х',
  Q: 'К', W: 'В',
  // диакритика
  ž: 'ж', Ž: 'Ж', č: 'ч', Č: 'Ч', š: 'ш', Š: 'Ш', ŝ: 'щ', Ŝ: 'Щ',
  ė: 'э', Ė: 'Э', ā: 'а', ē: 'е', ī: 'и', ō: 'о', ū: 'у',
  ļ: 'л', Ļ: 'Л', ņ: 'н', Ņ: 'Н', ķ: 'к', Ķ: 'К', ģ: 'г', Ģ: 'Г',
  Ā: 'А', Ē: 'Е', Ī: 'И', Ō: 'О', Ū: 'У',
};

const transliterateToCyrillic = (str) => {
  if (!str || typeof str !== 'string') return str;
  // Если уже содержит кириллицу — не трогаем
  if (/[\u0400-\u04FF]/.test(str)) return str;
  let out = '';
  let i = 0;
  while (i < str.length) {
    let matched = false;
    // Сначала пробуем диграфы (от длинных к коротким)
    for (const [lat, cyr] of latToCyrDigraphs) {
      if (str.substr(i, lat.length) === lat) {
        out += cyr;
        i += lat.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const c = str[i];
      out += latToCyrMap[c] !== undefined ? latToCyrMap[c] : c;
      i++;
    }
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
    const { code, state, device_id, participant_category } = req.body;
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

    const vkHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept-Language': 'ru,ru-RU;q=0.9,en;q=0.1'
    };

    const userInfoRes = await fetch('https://id.vk.ru/oauth2/user_info', {
      method: 'POST',
      headers: vkHeaders,
      body: new URLSearchParams({ access_token: accessToken, client_id: clientId })
    });
    const userInfoData = await userInfoRes.json();

    const vkUser = userInfoData?.user;
    const photoUrl = vkUser?.avatar || null;
    const phone = vkUser?.phone || null;
    const email = vkUser?.email || null;

    // Запрашиваем имя через VK API с lang=ru + Accept-Language: ru
    let firstName = vkUser?.first_name || '';
    let lastName = vkUser?.last_name || '';
    try {
      const vkApiRes = await fetch(
        `https://api.vk.com/method/users.get?user_ids=${vkUserId}&lang=ru&v=5.199&access_token=${accessToken}`,
        { headers: { 'Accept-Language': 'ru,ru-RU;q=0.9,en;q=0.1' } }
      );
      const vkApiData = await vkApiRes.json();
      if (vkApiData?.response?.[0]) {
        firstName = vkApiData.response[0].first_name || firstName;
        lastName = vkApiData.response[0].last_name || lastName;
      }
    } catch (e) {
      // fallback — транслитерация
      const hasCyrillic = (s) => /[\u0400-\u04FF]/.test(s);
      if (firstName && !hasCyrillic(firstName)) firstName = transliterateToCyrillic(firstName);
      if (lastName && !hasCyrillic(lastName)) lastName = transliterateToCyrillic(lastName);
    }

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

    const cat = participant_category === 'student' || participant_category === 'school' ? participant_category : null;
    if (result.rows.length > 0) {
      const existing = result.rows[0];
      const catToSet = existing.participant_category || cat;
      result = await pool.query(
        `UPDATE users
         SET first_name = $1, last_name = $2, photo_url = COALESCE(NULLIF($3, ''), photo_url),
             phone = COALESCE($4, phone), email = COALESCE($5, email),
             participant_category = COALESCE($6, participant_category),
             updated_at = CURRENT_TIMESTAMP
         WHERE vk_id = $7
         RETURNING *`,
        [firstName, lastName, photoUrl, phone, email, catToSet, vkUserId]
      );
      user = result.rows[0];
    } else if (phoneNorm) {
      result = await pool.query(
        `SELECT * FROM users WHERE REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $1 LIMIT 1`,
        [phoneNorm]
      );
      if (result.rows.length > 0) {
        const existing = result.rows[0];
        const catToSet = existing.participant_category || cat;
        result = await pool.query(
          `UPDATE users
           SET vk_id = $1,
               first_name = COALESCE(NULLIF(TRIM(first_name), ''), $2),
               last_name = COALESCE(NULLIF(TRIM(last_name), ''), $3),
               photo_url = COALESCE(photo_url, $4),
               phone = COALESCE(phone, $5),
               email = COALESCE(email, $6),
               username = COALESCE(NULLIF(TRIM(username), ''), $7),
               participant_category = COALESCE($8, participant_category),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $9
           RETURNING *`,
          [vkUserId, firstName, lastName, photoUrl, phone, email, `vk${vkUserId}`, catToSet, existing.id]
        );
        user = result.rows[0];
      }
    }

    if (!user) {
      const userCode = await generateUniqueUserCode(pool);
      result = await pool.query(
        `INSERT INTO users (vk_id, first_name, last_name, photo_url, phone, email, username, user_code, participant_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [vkUserId, firstName, lastName, photoUrl, phone, email, `vk${vkUserId}`, userCode, cat]
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
      participant_category: user.participant_category || null,
      user_code: user.user_code,
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

// POST /auth/link-vk — привязать VK к уже залогиненному аккаунту (через Telegram)
router.post('/link-vk', authenticateToken, async (req, res) => {
  try {
    const { code, state, device_id } = req.body;
    const clientId = process.env.VK_APP_ID;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUri = `${clientUrl}/auth/vk/callback`;

    if (!clientId) return res.status(503).json({ error: 'VK ID не настроен' });
    if (!code || !state) return res.status(400).json({ error: 'Код и state отсутствуют' });

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
      return res.status(400).json({ error: tokenData.error_description || 'Ошибка VK ID' });
    }

    const { access_token: accessToken, user_id: vkUserId } = tokenData;
    const userInfoRes = await fetch('https://id.vk.ru/oauth2/user_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: accessToken, client_id: clientId })
    });
    const userInfoData = await userInfoRes.json();
    const vkUser = userInfoData?.user;
    const phone = vkUser?.phone || null;
    const email = vkUser?.email || null;

    // Проверяем, не привязан ли этот VK к другому аккаунту
    const existingVk = (await pool.query(
      `SELECT id FROM users WHERE vk_id = $1 AND id != $2 LIMIT 1`,
      [vkUserId, req.user.id]
    )).rows[0];

    if (existingVk) {
      return res.status(409).json({ error: 'Этот VK аккаунт уже привязан к другому профилю' });
    }

    const normalizePhone = (p) => {
      if (!p || typeof p !== 'string') return null;
      const digits = p.replace(/\D/g, '');
      return digits.length >= 10 ? digits : null;
    };
    const phoneNorm = normalizePhone(phone);

    // Если есть другой аккаунт с таким же телефоном — сливаем
    if (phoneNorm) {
      const byPhone = (await pool.query(
        `SELECT id FROM users WHERE REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $1 AND id != $2 LIMIT 1`,
        [phoneNorm, req.user.id]
      )).rows[0];

      if (byPhone) {
        // Удаляем дубликат (другой аккаунт без telegram_id или менее полный)
        await pool.query(`DELETE FROM users WHERE id = $1`, [byPhone.id]);
      }
    }

    await pool.query(
      `UPDATE users SET vk_id = $1, phone = COALESCE(phone, $2), email = COALESCE(email, $3), updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [vkUserId, phone, email, req.user.id]
    );

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (user.skills && typeof user.skills === 'string') {
      try { user.skills = JSON.parse(user.skills); } catch (e) { user.skills = []; }
    } else if (!user.skills) { user.skills = []; }

    const newAccessToken = signAccessToken(user);
    const refresh = await createRefreshToken(user.id);

    res.json({ token: newAccessToken, refresh_token: refresh.token, user });
  } catch (error) {
    logError('Ошибка привязки VK', error);
    res.status(500).json({ error: 'Ошибка сервера при привязке VK' });
  }
});

// POST /auth/link-telegram — привязать Telegram к уже залогиненному аккаунту (через VK)
router.post('/link-telegram', authenticateToken, async (req, res) => {
  try {
    const { telegramData } = req.body;

    if (!telegramData || !telegramData.id || !telegramData.hash) {
      return res.status(400).json({ error: 'Данные Telegram отсутствуют' });
    }
    if (!verifyTelegramWidget(telegramData)) {
      return res.status(401).json({ error: 'Подпись Telegram недействительна' });
    }

    const telegramId = String(telegramData.id);

    // Проверяем, не привязан ли этот Telegram к другому аккаунту
    const existingTg = (await pool.query(
      `SELECT id FROM users WHERE telegram_id = $1 AND id != $2 LIMIT 1`,
      [telegramId, req.user.id]
    )).rows[0];

    if (existingTg) {
      // Удаляем старый дубликат-аккаунт Telegram (если у него нет VK)
      const oldTgUser = (await pool.query(`SELECT vk_id FROM users WHERE id = $1`, [existingTg.id])).rows[0];
      if (!oldTgUser?.vk_id) {
        await pool.query(`DELETE FROM users WHERE id = $1`, [existingTg.id]);
      } else {
        return res.status(409).json({ error: 'Этот Telegram аккаунт уже привязан к другому профилю' });
      }
    }

    await pool.query(
      `UPDATE users SET telegram_id = $1, username = COALESCE(username, $2), photo_url = COALESCE(photo_url, $3), updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [telegramId, telegramData.username || null, telegramData.photo_url || null, req.user.id]
    );

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (user.skills && typeof user.skills === 'string') {
      try { user.skills = JSON.parse(user.skills); } catch (e) { user.skills = []; }
    } else if (!user.skills) { user.skills = []; }

    const newAccessToken = signAccessToken(user);
    const refresh = await createRefreshToken(user.id);

    res.json({ token: newAccessToken, refresh_token: refresh.token, user });
  } catch (error) {
    logError('Ошибка привязки Telegram', error);
    res.status(500).json({ error: 'Ошибка сервера при привязке Telegram' });
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


router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    logError('Ошибка heartbeat', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Ошибка сервера' });
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

// ── DEV ONLY: мгновенный вход без Telegram/VK ──────────────────────────────
// Работает ТОЛЬКО при NODE_ENV=development
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { role = 'admin' } = req.body;

    // Сначала ищем пользователя с нужной ролью, иначе берём любого
    let result = await pool.query(
      `SELECT * FROM users WHERE role = $1 ORDER BY id LIMIT 1`,
      [role]
    );
    if (result.rows.length === 0) {
      result = await pool.query(`SELECT * FROM users ORDER BY id LIMIT 1`);
    }

    let user = result.rows[0];
    if (!user) {
      // Создаём admin-пользователя из MAIN_ADMIN_TELEGRAM_ID
      const adminTgId = process.env.MAIN_ADMIN_TELEGRAM_ID;
      if (!adminTgId) {
        return res.status(500).json({ error: 'В БД нет пользователей и MAIN_ADMIN_TELEGRAM_ID не задан в .env' });
      }
      const userCode = await generateUniqueUserCode(pool);
      const inserted = await pool.query(
        `INSERT INTO users (telegram_id, first_name, last_name, role, participant_category, user_code, created_at)
         VALUES ($1, 'Admin', 'Dev', 'admin', 'student', $2, NOW())
         ON CONFLICT (telegram_id) DO UPDATE SET role = 'admin'
         RETURNING *`,
        [adminTgId, userCode]
      );
      user = inserted.rows[0];
    }

    // Выдаём токен с запрошенной ролью (не меняем роль в БД)
    const tokenUser = { ...user, role };
    const accessToken = signAccessToken(tokenUser);
    const { token: refreshToken } = await createRefreshToken(user.id);

    res.json({ token: accessToken, refresh_token: refreshToken, user: tokenUser });
  } catch (error) {
    logError('Ошибка dev-login', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
