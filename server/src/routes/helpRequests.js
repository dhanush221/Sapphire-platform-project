import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

const helpRequestSchema = z.object({
  type: z.string().trim().min(1),
  description: z.string().trim().min(1),
  urgency: z.string().trim().optional(),
  mood: z.number().int().min(0).max(10).optional(),
  energy: z.number().int().min(0).max(10).optional(),
  timestamp: z.union([z.string(), z.date()]).optional()
});

router.use(requireAuth);

// Create a help request
router.post('/', validateBody(helpRequestSchema), async (req, res) => {
  try {
    const { type, description, urgency, mood, energy, timestamp } = req.validatedBody;

    const created = await prisma.helpRequest.create({
      data: {
        type,
        description,
        urgency: urgency || 'low',
        mood: typeof mood === 'number' ? mood : null,
        energy: typeof energy === 'number' ? energy : null,
        clientTimestamp: timestamp ? new Date(timestamp) : null,
        userId: req.user?.id ?? null
      }
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/help-requests failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List help requests (simple admin/dev endpoint)
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.helpRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) {
    console.error('GET /api/help-requests failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
