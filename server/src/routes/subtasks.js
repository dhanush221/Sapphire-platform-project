import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = express.Router();

const subtaskIdParam = z.object({ id: z.coerce.number().int().positive() });
const taskIdParam = z.object({ taskId: z.coerce.number().int().positive() });
const createSubtaskSchema = z.object({ title: z.string().trim().min(1) });
const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  done: z.boolean().optional(),
  orderIndex: z.coerce.number().int().optional()
});

router.use(requireAuth);

// GET /tasks/:taskId/subtasks
router.get('/tasks/:taskId/subtasks', validateParams(taskIdParam), async (req, res) => {
  try {
    const taskId = req.validatedParams.taskId;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.userId && task.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const items = await prisma.subtask.findMany({ where: { taskId }, orderBy: { orderIndex: 'asc' } });
    res.json(items);
  } catch (err) {
    console.error('GET subtasks failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tasks/:taskId/subtasks
router.post('/tasks/:taskId/subtasks', validateParams(taskIdParam), validateBody(createSubtaskSchema), async (req, res) => {
  try {
    const taskId = req.validatedParams.taskId;
    const { title } = req.validatedBody;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.userId && task.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const max = await prisma.subtask.aggregate({ _max: { orderIndex: true }, where: { taskId } });
    const created = await prisma.subtask.create({ data: { taskId, title, orderIndex: (max._max.orderIndex ?? -1) + 1 } });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST subtask failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /subtasks/:id
router.put('/subtasks/:id', validateParams(subtaskIdParam), validateBody(updateSubtaskSchema), async (req, res) => {
  try {
    const id = req.validatedParams.id;
    const body = req.validatedBody || {};
    const existing = await prisma.subtask.findUnique({ where: { id }, include: { task: true } });
    if (!existing) return res.status(404).json({ error: 'Subtask not found' });
    if (existing.task.userId && existing.task.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = {};
    if ('title' in body) data.title = body.title;
    if ('done' in body) data.done = Boolean(body.done);
    if ('orderIndex' in body) data.orderIndex = Number(body.orderIndex);
    const updated = await prisma.subtask.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error('PUT subtask failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /subtasks/:id
router.delete('/subtasks/:id', validateParams(subtaskIdParam), async (req, res) => {
  try {
    const id = req.validatedParams.id;
    const existing = await prisma.subtask.findUnique({ where: { id }, include: { task: true } });
    if (!existing) return res.status(404).json({ error: 'Subtask not found' });
    if (existing.task.userId && existing.task.userId !== req.user.id && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.subtask.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE subtask failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
