import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// Create a help request
router.post('/', async (req, res) => {
  try {
    const { type, description, urgency, mood, energy, timestamp, userId } = req.body || {};

    if (!type || !description) {
      return res.status(400).json({ error: 'type and description are required' });
    }

    const created = await prisma.helpRequest.create({
      data: {
        type,
        description,
        urgency: urgency || 'low',
        mood: typeof mood === 'number' ? mood : null,
        energy: typeof energy === 'number' ? energy : null,
        clientTimestamp: timestamp ? new Date(timestamp) : null,
        userId: userId ?? null
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

