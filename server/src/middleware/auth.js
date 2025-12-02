import { prisma } from '../prisma.js';
import { parseCookies } from '../utils/http.js';
import { deleteSession, getSessionByToken, touchSession } from '../utils/sessionStore.js';

const SESSION_COOKIE = 'sapphire_session';

function extractToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] || null;
}

export async function attachUserFromSession(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const session = await getSessionByToken(token);
    if (!session) return next();
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      await deleteSession(token);
      return next();
    }
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    req.sessionToken = token;
    await touchSession(token);
    return next();
  } catch (err) {
    console.error('attachUserFromSession failed:', err);
    return next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  return next();
}
