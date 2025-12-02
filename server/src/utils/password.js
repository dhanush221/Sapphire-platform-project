import crypto from 'crypto';

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  if (!password || !stored) return false;
  const [salt, hashed] = String(stored).split(':');
  if (!salt || !hashed) return false;
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hashed, 'hex'), Buffer.from(derived, 'hex'));
}
