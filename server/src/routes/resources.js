import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { resourceTypeEnum, validateParams } from '../middleware/validate.js';

const router = express.Router();
const resourcesDir = path.resolve('uploads/resources');
try { fs.mkdirSync(resourcesDir, { recursive: true }); } catch {}
const dataDir = path.resolve('.data');
try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
const storePath = path.join(dataDir, 'resources.json');
const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60MB

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userDir = path.join(resourcesDir, String(req.user.id));
    try { fs.mkdirSync(userDir, { recursive: true }); } catch {}
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 8);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadSchema = z.object({
  title: z.string().trim().min(1),
  resourceType: resourceTypeEnum.optional().default('Routine'),
  notes: z.string().trim().optional().default(''),
  tags: z.string().optional().default('')
});

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  starred: z.boolean().optional(),
  resourceType: resourceTypeEnum.optional()
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const officialResources = [
  {
    id: 1,
    title: 'Neurodiversity Workplace Guide',
    description: 'Evidence-based guide for autistic interns and supervisors to co-create supports.',
    category: 'Workplace rights',
    credibility: 'verified',
    badgeLabel: 'Verified',
    sourceOrg: 'UK Civil Service',
    sourceUrl: 'https://www.civilservice.gov.uk',
    downloadUrl: 'https://www.civilservice.gov.uk',
    tags: ['accommodations', 'communication', 'checklist']
  },
  {
    id: 2,
    title: 'Sensory Regulation Toolkit',
    description: 'Planner to map sensory needs and design predictable routines.',
    category: 'Sensory regulation',
    credibility: 'trusted',
    badgeLabel: 'Trusted',
    sourceOrg: 'Autistica',
    sourceUrl: 'https://www.autistica.org.uk',
    downloadUrl: 'https://www.autistica.org.uk',
    tags: ['sensory', 'regulation', 'planner']
  }
];

async function readStore() {
  try {
    const raw = await fsPromises.readFile(storePath, 'utf8');
    return JSON.parse(raw || '{"resources":[]}');
  } catch {
    return { resources: [] };
  }
}

async function writeStore(store) {
  await fsPromises.writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function inferPreviewType(mime, filename) {
  const lower = (mime || '').toLowerCase();
  const ext = (path.extname(filename || '').toLowerCase() || '').replace('.', '');
  if (lower.startsWith('image/')) return 'image';
  if (lower === 'application/pdf') return 'pdf';
  if (lower.startsWith('audio/')) return 'audio';
  if (lower.startsWith('text/')) return 'text';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'mp3' || ext === 'wav') return 'audio';
  if (ext === 'txt') return 'text';
  if (ext === 'docx') return 'document';
  return 'file';
}

function normalizeTags(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : String(input).split(',');
  const set = new Set();
  raw.map(v => String(v || '').trim().toLowerCase()).filter(Boolean).forEach(tag => set.add(tag));
  return Array.from(set);
}

function shape(resource) {
  const downloadUrl = `/api/resources/${resource.id}/download`;
  const previewUrl = resource.previewType === 'document' ? '' : `/api/resources/${resource.id}/preview`;
  return { ...resource, downloadUrl, previewUrl };
}

router.use(requireAuth);

router.get('/official', (_req, res) => {
  res.json({ resources: officialResources });
});

router.get('/', async (req, res) => {
  try {
    const store = await readStore();
    const items = (store.resources || []).filter(r => r.userId === req.user.id).sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
    return res.json({ resources: items.map(shape) });
  } catch (err) {
    console.error('GET /api/resources failed:', err);
    return res.status(500).json({ error: 'Unable to load resources.' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const parsed = uploadSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid upload payload.' });
    }
    if (!req.file) return res.status(400).json({ error: 'File is required.' });
    const body = parsed.data;
    const tags = normalizeTags(body.tags);
    const now = new Date().toISOString();
    const store = await readStore();
    const nextId = (store.resources || []).reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
    const storagePath = path.posix.join(String(req.user.id), req.file.filename);
    const resource = {
      id: nextId,
      userId: req.user.id,
      title: body.title,
      resourceType: body.resourceType || 'Routine',
      notes: body.notes || '',
      tags,
      originalFileName: req.file.originalname || req.file.filename,
      storagePath,
      fileSize: req.file.size || 0,
      mimeType: req.file.mimetype || 'application/octet-stream',
      previewType: inferPreviewType(req.file.mimetype, req.file.originalname),
      starred: false,
      createdAt: now,
      updatedAt: now
    };
    store.resources = [...(store.resources || []), resource];
    await writeStore(store);
    return res.status(201).json({ resource: shape(resource), message: 'Resource uploaded.' });
  } catch (err) {
    console.error('POST /api/resources failed:', err);
    return res.status(500).json({ error: 'Upload failed.' });
  }
});

router.patch('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payload.' });
    }
    const store = await readStore();
    const resource = (store.resources || []).find(r => r.id === req.validatedParams.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    if (resource.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const updates = parsed.data;
    if (updates.title !== undefined) resource.title = updates.title;
    if (updates.notes !== undefined) resource.notes = updates.notes ?? '';
    if (updates.tags !== undefined) resource.tags = normalizeTags(updates.tags);
    if (updates.starred !== undefined) resource.starred = updates.starred;
    if (updates.resourceType) resource.resourceType = updates.resourceType;
    resource.updatedAt = new Date().toISOString();
    await writeStore(store);
    return res.json({ resource: shape(resource) });
  } catch (err) {
    console.error('PATCH /api/resources failed:', err);
    return res.status(500).json({ error: 'Unable to update resource.' });
  }
});

router.delete('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const store = await readStore();
    const resources = store.resources || [];
    const idx = resources.findIndex(r => r.id === req.validatedParams.id);
    if (idx === -1) return res.status(404).json({ error: 'Resource not found' });
    const resource = resources[idx];
    if (resource.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    resources.splice(idx, 1);
    await writeStore(store);
    try {
      await fsPromises.unlink(path.join(resourcesDir, resource.storagePath));
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn('Failed to delete resource file', err);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/resources failed:', err);
    return res.status(500).json({ error: 'Unable to delete resource.' });
  }
});

router.get('/:id/download', validateParams(idParamSchema), async (req, res) => {
  try {
    const store = await readStore();
    const resource = (store.resources || []).find(r => r.id === req.validatedParams.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    if (resource.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const absolutePath = path.join(resourcesDir, resource.storagePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File missing' });
    res.setHeader('Content-Type', resource.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.originalFileName)}"`);
    return res.sendFile(absolutePath);
  } catch (err) {
    console.error('GET /api/resources/:id/download failed:', err);
    return res.status(500).json({ error: 'Unable to download resource.' });
  }
});

router.get('/:id/preview', validateParams(idParamSchema), async (req, res) => {
  try {
    const store = await readStore();
    const resource = (store.resources || []).find(r => r.id === req.validatedParams.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    if (resource.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const absolutePath = path.join(resourcesDir, resource.storagePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File missing' });
    res.setHeader('Content-Type', resource.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resource.originalFileName)}"`);
    return res.sendFile(absolutePath);
  } catch (err) {
    console.error('GET /api/resources/:id/preview failed:', err);
    return res.status(500).json({ error: 'Unable to preview resource.' });
  }
});

export default router;
