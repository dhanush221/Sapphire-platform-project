import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

const router = express.Router();

const createMoodSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  note: z.string().trim().max(500).optional().nullable()
});

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(7)
});

const trendsQuery = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7)
});

router.use(requireAuth);

router.post('/', validateBody(createMoodSchema), async (req, res) => {
  try {
    const { mood, energy, note } = req.validatedBody;
    const entry = await prisma.moodEntry.create({
      data: {
        mood,
        energy,
        note: note?.trim() ? note.trim() : null,
        userId: req.user.id
      }
    });
    return res.status(201).json(entry);
  } catch (err) {
    console.error('POST /api/moods failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', validateQuery(listQuery), async (req, res) => {
  try {
    const { limit } = req.validatedQuery;
    const entries = await prisma.moodEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return res.json(entries);
  } catch (err) {
    console.error('GET /api/moods failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends', validateQuery(trendsQuery), async (req, res) => {
  try {
    const { days } = req.validatedQuery;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const entries = await prisma.moodEntry.findMany({
      where: {
        userId: req.user.id,
        createdAt: { gte: start }
      },
      orderBy: { createdAt: 'asc' }
    });

    const byDate = new Map();
    for (const entry of entries) {
      const dayKey = entry.createdAt.toISOString().slice(0, 10);
      if (!byDate.has(dayKey)) byDate.set(dayKey, []);
      byDate.get(dayKey).push(entry);
    }

    const points = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      const list = byDate.get(key) || [];
      const moodAvg = list.length ? list.reduce((sum, e) => sum + e.mood, 0) / list.length : null;
      const energyAvg = list.length ? list.reduce((sum, e) => sum + e.energy, 0) / list.length : null;
      points.push({ date: key, moodAvg, energyAvg, count: list.length });
    }

    return res.json({ points });
  } catch (err) {
    console.error('GET /api/moods/trends failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
