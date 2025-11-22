import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// GET /deadlines/upcoming - deadlines due today and onwards, include task title
router.get('/upcoming', async (req, res) => {
  try {
    // Show deadlines due today and onwards (start of today), scoped to user if provided
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const email = req.user?.email || null;
    let user = null;
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, passwordHash: '', role: req.user.role || 'student' } });
    }
    const items = await prisma.deadline.findMany({
      where: { dueAt: { gte: startOfToday }, ...(user ? { task: { userId: user.id } } : {}) },
      orderBy: { dueAt: 'asc' },
      include: { task: { select: { title: true } } }
    });
    const shaped = items.map(d => ({
      id: d.id,
      taskId: d.taskId,
      task_title: d.task.title,
      title: d.title,
      dueAt: d.dueAt
    }));
    return res.json(shaped);
  } catch (err) {
    console.error('GET /deadlines/upcoming failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /deadlines - create a deadline for a task with optional reminders
// Body: { taskId, title?, dueAt, reminders?: number[] (minutes before) }
router.post('/', async (req, res) => {
  try {
    const { taskId, title, dueAt, reminders, recipientEmail, recipientUserId } = req.body || {};
    if (!taskId || !dueAt) return res.status(400).json({ error: 'taskId and dueAt are required' });
    const user = req.user || { role: 'student', email: null };
    // If we can resolve the user, ensure the task belongs to them
    if (user.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (dbUser) {
        const t = await prisma.task.findUnique({ where: { id: Number(taskId) } });
        if (!t || t.userId !== dbUser.id) {
          return res.status(403).json({ error: 'Task does not belong to current user' });
        }
      }
    }
    let finalRecipientEmail = recipientEmail ?? null;
    let finalRecipientUserId = recipientUserId ? Number(recipientUserId) : null;

    if (user.role === 'student') {
      // Students can only set recipient to themselves (or leave blank -> defaults to them)
      if (finalRecipientEmail && user.email && finalRecipientEmail.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ error: 'Students can only set reminders for themselves.' });
      }
      finalRecipientEmail = user.email || finalRecipientEmail;
      finalRecipientUserId = null; // ignore override in this simple demo
    }

    const reminderCreates = Array.isArray(reminders)
      ? reminders.map((m) => ({ offsetMinutes: Number(m) }))
      : [];

    const created = await prisma.deadline.create({
      data: {
        taskId: Number(taskId),
        title: title ?? null,
        dueAt: new Date(dueAt),
        recipientEmail: finalRecipientEmail,
        recipientUserId: finalRecipientUserId,
        reminders: reminderCreates.length ? { create: reminderCreates } : undefined
      },
      include: { reminders: true }
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /deadlines failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
