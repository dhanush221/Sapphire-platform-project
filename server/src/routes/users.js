import express from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// List sapphire users (limited to supervisors for now)
router.get('/', async (req, res) => {
  if (req.user?.role !== 'supervisor') {
    return res.status(403).json({ error: 'Only supervisors can list users' });
  }
  try {
    const role = req.query.role || null;
    const where = role ? { role } : { NOT: { role: 'supervisor' } };
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, role: true },
      orderBy: { email: 'asc' }
    });
    return res.json(users);
  } catch (err) {
    console.error('GET /users failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
