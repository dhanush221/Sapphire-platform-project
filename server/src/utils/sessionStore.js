import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const dataDir = path.resolve('.data');
const storePath = path.join(dataDir, 'sessions.json');
const rawTtl = Number(process.env.SESSION_HOURS || 72);
const SESSION_HOURS = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : 72;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function ensureStore() {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  try {
    await fsPromises.access(storePath);
  } catch {
    await fsPromises.writeFile(storePath, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStore();
  try {
    const raw = await fsPromises.readFile(storePath, 'utf8');
    return JSON.parse(raw || '{"sessions":[]}');
  } catch {
    return { sessions: [] };
  }
}

async function writeStore(store) {
  await fsPromises.writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export async function createSession(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const store = await readStore();
  store.sessions = (store.sessions || []).filter(s => new Date(s.expiresAt) > now);
  store.sessions.push({
    tokenHash: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
  await writeStore(store);
  return { token, expiresAt };
}

export async function getSessionByToken(token) {
  if (!token) return null;
  const store = await readStore();
  const hashed = hashToken(token);
  const now = new Date();
  const session = (store.sessions || []).find(s => s.tokenHash === hashed);
  if (!session) return null;
  if (new Date(session.expiresAt) <= now) {
    await deleteSession(token);
    return null;
  }
  return session;
}

export async function touchSession(token) {
  if (!token) return;
  const hashed = hashToken(token);
  const store = await readStore();
  const session = (store.sessions || []).find(s => s.tokenHash === hashed);
  if (!session) return;
  session.lastUsedAt = new Date().toISOString();
  await writeStore(store);
}

export async function deleteSession(token) {
  if (!token) return;
  const hashed = hashToken(token);
  const store = await readStore();
  store.sessions = (store.sessions || []).filter(s => s.tokenHash !== hashed);
  await writeStore(store);
}
