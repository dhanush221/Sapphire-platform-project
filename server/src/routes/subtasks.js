import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// GET /tasks/:taskId/subtasks
router.get('/tasks/:taskId/subtasks', async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const items = await prisma.subtask.findMany({ where: { taskId }, orderBy: { orderIndex: 'asc' } });
    res.json(items);
  } catch (err) {
    console.error('GET subtasks failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tasks/:taskId/subtasks
router.post('/tasks/:taskId/subtasks', async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const max = await prisma.subtask.aggregate({ _max: { orderIndex: true }, where: { taskId } });
    const created = await prisma.subtask.create({ data: { taskId, title, orderIndex: (max._max.orderIndex ?? -1) + 1 } });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST subtask failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /subtasks/:id
router.put('/subtasks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
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
router.delete('/subtasks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.subtask.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE subtask failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

