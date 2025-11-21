import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// GET /tasks - list tasks ordered by status then orderIndex then createdAt
router.get('/', async (req, res) => {
  try {
    const email = req.user?.email || null;
    let where = {};
    if (email) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, passwordHash: '', role: req.user.role || 'student' } });
      where = { userId: user.id };
    }
    const items = await prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    return res.json(items);
  } catch (err) {
    console.error('GET /tasks failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tasks - create with default status pending and next orderIndex in that column
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, dueDate, status, category } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    // Resolve user from header
    const email = req.user?.email || null;
    let resolvedUserId = null;
    if (email) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, passwordHash: '', role: req.user.role || 'student' } });
      resolvedUserId = user.id;
    }

    const column = status ?? 'pending';
    const maxInColumn = await prisma.task.aggregate({
      _max: { orderIndex: true },
      where: { status: column, ...(resolvedUserId ? { userId: resolvedUserId } : {}) }
    });
    const nextOrder = (maxInColumn._max.orderIndex ?? -1) + 1;

    const created = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        priority: priority ?? 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        status: column,
        orderIndex: nextOrder,
        category: category ?? null,
        userId: resolvedUserId
      }
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /tasks failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /tasks/:id - partial update without overwriting unspecified fields
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const data = {};
    if ('title' in body) data.title = body.title;
    if ('description' in body) data.description = body.description;
    if ('priority' in body) data.priority = body.priority;
    if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if ('status' in body) data.status = body.status;
    if ('orderIndex' in body) data.orderIndex = body.orderIndex;
    if ('category' in body) data.category = body.category;

    const updated = await prisma.task.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /tasks/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /tasks/:id - delete task (deadlines cascade via schema)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.task.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /tasks/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /tasks/reorder - batch reorder across columns
// Expects: { updates: [{ id, status, orderIndex }] }
router.patch('/reorder', async (req, res) => {
  const { updates } = req.body || {};
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'updates array required' });
  }
  try {
    // Optional: verify ownership by user
    const email = req.user?.email || null;
    let user = null;
    if (email) user = await prisma.user.findUnique({ where: { email } });
    const tx = updates.map(u =>
      prisma.task.update({
        where: { id: Number(u.id) },
        data: {
          status: u.status,
          orderIndex: Number(u.orderIndex)
        }
      })
    );
    const result = await prisma.$transaction(tx);
    return res.json({ ok: true, count: result.length });
  } catch (err) {
    console.error('PATCH /tasks/reorder failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
