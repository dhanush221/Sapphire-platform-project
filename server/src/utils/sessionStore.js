import crypto from 'crypto';
import { prisma } from '../prisma.js';

const rawTtl = Number(process.env.SESSION_HOURS || 72);
const SESSION_HOURS = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : 72;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const tokenHash = hashToken(token);

  // Clean up expired sessions for this user to avoid sprawl
  await prisma.session.deleteMany({
    where: {
      userId,
      OR: [
        { expiresAt: { lte: now } },
        { token: tokenHash }
      ]
    }
  });

  await prisma.session.create({
    data: {
      userId,
      token: tokenHash,
      expiresAt,
      lastUsedAt: now
    }
  });
  return { token, expiresAt };
}

export async function getSessionByToken(token) {
  if (!token) return null;
  const hashed = hashToken(token);
  const now = new Date();
  const session = await prisma.session.findUnique({ where: { token: hashed } });
  if (!session) return null;
  if (session.expiresAt <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
}

export async function touchSession(token) {
  if (!token) return;
  const hashed = hashToken(token);
  await prisma.session.updateMany({
    where: { token: hashed },
    data: { lastUsedAt: new Date() }
  });
}

export async function deleteSession(token) {
  if (!token) return;
  const hashed = hashToken(token);
  await prisma.session.deleteMany({ where: { token: hashed } });
}
