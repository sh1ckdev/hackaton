const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateUserCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export async function generateUniqueUserCode(pool) {
  for (let i = 0; i < 20; i++) {
    const code = generateUserCode();
    const taken = await pool.query('SELECT 1 FROM users WHERE user_code = $1', [code]);
    if (taken.rows.length === 0) return code;
  }
  throw new Error('Не удалось сгенерировать уникальный user_code');
}
