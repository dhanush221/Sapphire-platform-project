import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { findOrCreateUserByEmail } from '../utils/user.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = express.Router();

const folderIdParam = z.object({ id: z.coerce.number().int().positive() });
const colorSchema = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/).optional().nullable();
const createFolderSchema = z.object({
  name: z.string().trim().min(1),
  color: colorSchema,
  forEmail: z.string().email().optional()
});
const updateFolderSchema = z.object({
  name: z.string().trim().min(1).optional(),
  color: colorSchema,
  orderIndex: z.coerce.number().int().optional()
});

router.use(requireAuth);

// GET /folders - list user's folders ordered by orderIndex then createdAt
router.get('/', async (req, res) => {
  try {
    const isSupervisor = req.user?.role === 'supervisor';
    const email = isSupervisor && req.query.forEmail
      ? String(req.query.forEmail)
      : (req.user?.email || null);
    let where = {};
    const user = await findOrCreateUserByEmail(
      email,
      isSupervisor && email !== req.user?.email ? 'student' : (req.user?.role || 'student')
    );
    if (user) where = { userId: user.id };
    const folders = await prisma.folder.findMany({
      where,
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    return res.json(folders);
  } catch (err) {
    console.error('GET /folders failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /folders - create folder at end of list
router.post('/', validateBody(createFolderSchema), async (req, res) => {
  try {
    const { name, color, forEmail } = req.validatedBody;

    const isSupervisor = req.user?.role === 'supervisor';
    const email = isSupervisor && forEmail ? String(forEmail) : (req.user?.email || null);
    const resolvedUser = await findOrCreateUserByEmail(
      email,
      isSupervisor && email !== req.user?.email ? 'student' : (req.user?.role || 'student')
    );
    const resolvedUserId = resolvedUser?.id ?? null;

    const maxIndex = await prisma.folder.aggregate({
      _max: { orderIndex: true },
      where: resolvedUserId ? { userId: resolvedUserId } : {}
    });
    const nextOrder = (maxIndex._max.orderIndex ?? -1) + 1;

    const created = await prisma.folder.create({
      data: {
        name: name.trim(),
        color: color || null,
        orderIndex: nextOrder,
        userId: resolvedUserId
      }
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /folders failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /folders/:id - rename or reorder
router.put('/:id', validateParams(folderIdParam), validateBody(updateFolderSchema), async (req, res) => {
  try {
    const id = req.validatedParams.id;
    const { name, orderIndex, color } = req.validatedBody;
    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Folder not found' });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = {};
    if (typeof name === 'string') data.name = name.trim();
    if (typeof orderIndex === 'number') data.orderIndex = orderIndex;
    if (req.validatedBody && Object.prototype.hasOwnProperty.call(req.validatedBody, 'color')) {
      data.color = color || null;
    }
    const updated = await prisma.folder.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /folders/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /folders/:id - null folderId on tasks then remove folder
router.delete('/:id', validateParams(folderIdParam), async (req, res) => {
  try {
    const id = req.validatedParams.id;
    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Folder not found' });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.task.updateMany({ where: { folderId: id }, data: { folderId: null } });
    await prisma.folder.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /folders/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
