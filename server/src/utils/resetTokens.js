import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const dataDir = path.resolve('.data');
const storePath = path.join(dataDir, 'reset-tokens.json');

async function ensureStore() {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  try { await fsPromises.access(storePath); }
  catch { await fsPromises.writeFile(storePath, JSON.stringify({ tokens: [] }, null, 2), 'utf8'); }
}

async function readStore() {
  await ensureStore();
  try {
    const raw = await fsPromises.readFile(storePath, 'utf8');
    return JSON.parse(raw || '{"tokens":[]}');
  } catch {
    return { tokens: [] };
  }
}

async function writeStore(store) {
  await fsPromises.writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export async function saveResetToken({ userId, tokenHash, expiresAt }) {
  const store = await readStore();
  // Remove existing tokens for this user
  store.tokens = (store.tokens || []).filter(t => t.userId !== userId);
  store.tokens.push({
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: new Date().toISOString()
  });
  await writeStore(store);
}

export async function consumeResetToken(tokenHash) {
  const now = new Date();
  const store = await readStore();
  const token = (store.tokens || []).find(t => t.tokenHash === tokenHash && !t.usedAt && new Date(t.expiresAt) > now);
  if (!token) return null;
  token.usedAt = new Date().toISOString();
  await writeStore(store);
  return token;
}
