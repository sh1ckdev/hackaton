import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logError, logInfo } from './logger.js';

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';
const publicUrlBase = process.env.S3_PUBLIC_URL_BASE;

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const config = {
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    };
    if (process.env.S3_ENDPOINT) {
      config.endpoint = process.env.S3_ENDPOINT;
      config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

function getPublicUrl(key) {
  if (publicUrlBase) {
    const base = publicUrlBase.replace(/\/$/, '');
    return `${base}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function isS3Configured() {
  return Boolean(bucket && (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY));
}

export async function uploadToS3(buffer, key, contentType, metadata = {}) {
  if (!isS3Configured()) {
    return null;
  }
  try {
    const client = getS3Client();
    const params = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      ...metadata,
    };
    if (process.env.S3_ACL === 'public-read') {
      params.ACL = 'public-read';
    }
    await client.send(new PutObjectCommand(params));
    const url = getPublicUrl(key);
    logInfo('S3 upload OK', { key, url });
    return url;
  } catch (err) {
    logError('S3 upload failed', err, { key });
    throw err;
  }
}

export function buildKey(prefix, originalName, uniqueSuffix) {
  const safeName = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return `${prefix}/${uniqueSuffix}-${safeName}`.replace(/\/+/g, '/');
}

/**
 * Multer получает originalname в latin1 (ISO-8859-1) из HTTP заголовков,
 * но браузеры фактически шлют UTF-8. Эта функция исправляет кодировку.
 */
export function decodeFilename(name) {
  if (!name) return 'file';
  try {
    // Декодируем latin1→utf8: Buffer.from(str, 'latin1') восстанавливает байты
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    // Если декодирование дало валидный UTF-8 с не-ASCII символами — используем его
    // Иначе (файл был чисто ASCII) оба варианта одинаковы
    return decoded;
  } catch {
    return name;
  }
}
