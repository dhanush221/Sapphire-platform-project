import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { findOrCreateUserByEmail } from '../utils/user.js';
import { requireAuth } from '../middleware/auth.js';
import { priorityEnum, taskStatusEnum, validateBody, validateParams } from '../middleware/validate.js';

const router = express.Router();

const taskIdParam = z.object({ id: z.coerce.number().int().positive() });

const createTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  priority: priorityEnum.optional().default('medium'),
  dueDate: z.union([z.string(), z.date()]).optional(),
  status: taskStatusEnum.optional().default('pending'),
  category: z.string().trim().optional().nullable(),
  folderId: z.coerce.number().int().positive().optional().nullable(),
  assigneeEmail: z.string().email().optional()
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  priority: priorityEnum.optional(),
  dueDate: z.union([z.string(), z.date()]).optional().nullable(),
  status: taskStatusEnum.optional(),
  orderIndex: z.coerce.number().int().optional(),
  category: z.string().trim().optional().nullable(),
  folderId: z.coerce.number().int().positive().optional().nullable(),
  assigneeEmail: z.string().email().optional()
});

const reorderSchema = z.object({
  updates: z.array(z.object({
    id: z.coerce.number().int().positive(),
    status: taskStatusEnum,
    orderIndex: z.coerce.number().int(),
    folderId: z.coerce.number().int().positive().nullable().optional()
  })).min(1)
});

router.use(requireAuth);

// GET /tasks - list tasks ordered by status then orderIndex then createdAt
router.get('/', async (req, res) => {
  try {
    const isSupervisor = req.user?.role === 'supervisor';
    const requestedEmail = isSupervisor && req.query.forEmail ? String(req.query.forEmail) : null;

    let targetUserId = req.user.id;
    if (requestedEmail) {
      const target = await prisma.user.findUnique({ where: { email: requestedEmail.toLowerCase() } });
      if (!target) return res.status(404).json({ error: 'User not found' });
      targetUserId = target.id;
    }
    let where = { userId: targetUserId };
    const folderQuery = req.query.folderId;
    if (typeof folderQuery !== 'undefined') {
      if (folderQuery === 'null') where.folderId = null;
      else if (!Number.isNaN(Number(folderQuery))) where.folderId = Number(folderQuery);
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
router.post('/', validateBody(createTaskSchema), async (req, res) => {
  try {
    const { title, description, priority, dueDate, status, category, folderId, assigneeEmail } = req.validatedBody;
    const isSupervisor = req.user?.role === 'supervisor';
    let ownerUserId = req.user.id;
    if (isSupervisor && assigneeEmail) {
      const assignee = await findOrCreateUserByEmail(assigneeEmail, 'student');
      ownerUserId = assignee.id;
    }

    const column = status || 'pending';
    const maxInColumn = await prisma.task.aggregate({
      _max: { orderIndex: true },
      where: { status: column, userId: ownerUserId }
    });
    const nextOrder = (maxInColumn._max.orderIndex ?? -1) + 1;

    const created = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        status: column,
        orderIndex: nextOrder,
        category: category ?? null,
        folderId: folderId ?? null,
        userId: ownerUserId,
        createdByRole: req.user?.role || 'student'
      }
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /tasks failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /tasks/:id - partial update without overwriting unspecified fields
router.put('/:id', validateParams(taskIdParam), validateBody(updateTaskSchema), async (req, res) => {
  try {
    const id = req.validatedParams.id;
    const body = req.validatedBody || {};
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = {};
    if ('title' in body) data.title = body.title;
    if ('description' in body) data.description = body.description;
    if ('priority' in body) data.priority = body.priority;
    if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if ('status' in body) data.status = body.status;
    if ('orderIndex' in body) data.orderIndex = body.orderIndex;
    if ('category' in body) data.category = body.category;
    if ('folderId' in body) data.folderId = body.folderId ?? null;
    if (req.user?.role === 'supervisor' && body.assigneeEmail) {
      const assignee = await findOrCreateUserByEmail(body.assigneeEmail, 'student');
      if (assignee) data.userId = assignee.id;
    }

    const updated = await prisma.task.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /tasks/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /tasks/:id - delete task (deadlines cascade via schema)
router.delete('/:id', validateParams(taskIdParam), async (req, res) => {
  try {
    const id = req.validatedParams.id;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.userId && existing.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.task.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /tasks/:id failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /tasks/reorder - batch reorder across columns
// Expects: { updates: [{ id, status, orderIndex }] }
router.patch('/reorder', validateBody(reorderSchema), async (req, res) => {
  try {
    const { updates } = req.validatedBody;
    // Optional: verify ownership by user
    if (req.user.role !== 'supervisor') {
      const taskIds = updates.map(u => u.id);
      const tasks = await prisma.task.findMany({ where: { id: { in: taskIds }, userId: req.user.id } });
      if (tasks.length !== updates.length) {
        return res.status(403).json({ error: 'You can only reorder your own tasks.' });
      }
    }
    const tx = updates.map(u => {
      const payload = {
        status: u.status,
        orderIndex: Number(u.orderIndex)
      };
      if ('folderId' in u) payload.folderId = u.folderId ?? null;
      return prisma.task.update({
        where: { id: Number(u.id) },
        data: payload
      });
    });
    const result = await prisma.$transaction(tx);
    return res.json({ ok: true, count: result.length });
  } catch (err) {
    console.error('PATCH /tasks/reorder failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
