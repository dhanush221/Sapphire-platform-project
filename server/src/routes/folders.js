import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// GET /folders - list user's folders ordered by orderIndex then createdAt
router.get('/', async (req, res) => {
  try {
    const email = req.user?.email || null;
    let where = {};
    if (email) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, passwordHash: '', role: req.user.role || 'student' } });
      where = { userId: user.id };
    }
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
router.post('/', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const email = req.user?.email || null;
    let resolvedUserId = null;
    if (email) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, passwordHash: '', role: req.user.role || 'student' } });
      resolvedUserId = user.id;
    }

    const maxIndex = await prisma.folder.aggregate({
      _max: { orderIndex: true },
      where: resolvedUserId ? { userId: resolvedUserId } : {}
    });
    const nextOrder = (maxIndex._max.orderIndex ?? -1) + 1;

    const created = await prisma.folder.create({
      data: {
        name: name.trim(),
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
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, orderIndex } = req.body || {};
    const data = {};
    if (typeof name === 'string') data.name = name.trim();
    if (typeof orderIndex === 'number') data.orderIndex = orderIndex;
    const updated = await prisma.folder.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /folders/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /folders/:id - null folderId on tasks then remove folder
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.task.updateMany({ where: { folderId: id }, data: { folderId: null } });
    await prisma.folder.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /folders/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
