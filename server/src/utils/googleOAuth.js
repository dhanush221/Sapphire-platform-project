import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI
  || process.env.GOOGLE_REDIRECT_URI
  || 'http://localhost:5000/api/google/calendar/callback';
const STATE_SECRET = process.env.GOOGLE_STATE_SECRET || GOOGLE_CLIENT_SECRET || 'set-google-secret';

export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

export function getOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI);
}

export function googleConfigReady() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function generateState(userId) {
  const ts = Date.now();
  const raw = `${userId}:${ts}`;
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(raw).digest('hex');
  return Buffer.from(`${raw}:${sig}`).toString('base64url');
}

export function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const [userIdStr, tsStr, sig] = decoded.split(':');
    if (!userIdStr || !tsStr || !sig) return null;
    const raw = `${userIdStr}:${tsStr}`;
    const expected = crypto.createHmac('sha256', STATE_SECRET).update(raw).digest('hex');
    if (expected !== sig) return null;
    const ts = Number(tsStr);
    if (!Number.isFinite(ts)) return null;
    if (Date.now() - ts > maxAgeMs) return null;
    return { userId: Number(userIdStr), ts };
  } catch (_err) {
    return null;
  }
}

export function getRedirectUri() {
  return GOOGLE_CALENDAR_REDIRECT_URI;
}
