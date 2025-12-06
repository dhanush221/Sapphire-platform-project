import nodemailer from 'nodemailer';
import { prisma } from '../src/prisma.js';

function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) {
    return null; // run in stub mode
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
}

export async function runReminderJob(logger = console) {
  const transporter = buildTransporter();
  const now = new Date();
  const pollWindowMs = Number(process.env.REMINDER_POLL_SECONDS || 60) * 1000;
  const windowUpper = new Date(now.getTime() + pollWindowMs);

  // Find unsent reminders that have reached their trigger time (dueAt - offsetMinutes)
  const reminders = await prisma.deadlineReminder.findMany({
    where: { sentAt: null },
    include: { deadline: { include: { task: { include: { user: true } }, recipientUser: true } } }
  });

  const dueReminders = reminders.filter(r => {
    const triggerAt = new Date(r.deadline.dueAt.getTime() - r.offsetMinutes * 60 * 1000);
    // Look ahead one poll window to avoid missing reminders between ticks
    return triggerAt <= windowUpper;
  });

  for (const r of dueReminders) {
    try {
      const to = r.deadline.recipientEmail || r.deadline.recipientUser?.email || r.deadline.task.user?.email || process.env.NOTIFY_EMAIL || 'test@example.com';
      const subject = `Reminder: ${r.deadline.title || r.deadline.task.title} at ${r.deadline.dueAt.toISOString()}`;
      const text = `Upcoming deadline for task "${r.deadline.task.title}". Due at ${r.deadline.dueAt.toISOString()} (reminder ${r.offsetMinutes} minutes prior).`;

      if (transporter) {
        await transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@sapphire.local', to, subject, text });
      } else {
        logger.log('[reminder][stub] would send:', { to, subject });
      }

      await prisma.deadlineReminder.update({ where: { id: r.id }, data: { sentAt: new Date() } });
    } catch (err) {
      logger.error('Failed to send reminder', { id: r.id, err });
    }
  }

  // Mood break reminders
  const breakReminders = await prisma.breakReminder.findMany({
    where: { sentAt: null, remindAt: { lte: windowUpper } },
    include: { user: true }
  });

  for (const br of breakReminders) {
    try {
      const to = br.user?.email || process.env.NOTIFY_EMAIL || null;
      const subject = 'Break reminder';
      const text = `Time to take a ${br.minutes}-minute break${br.mood || br.energy ? ` (mood ${br.mood ?? '-'}, energy ${br.energy ?? '-'})` : ''}.`;
      if (to && transporter) {
        await transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@sapphire.local', to, subject, text });
      } else {
        logger.log('[break-reminder][stub] would send:', { to, subject });
      }
      await prisma.breakReminder.update({ where: { id: br.id }, data: { sentAt: new Date() } });
    } catch (err) {
      logger.error('Failed to send break reminder', { id: br.id, err });
    }
  }
}

export function scheduleReminderJob() {
  const intervalSec = Number(process.env.REMINDER_POLL_SECONDS || 60);
  return setInterval(() => {
    runReminderJob().catch(err => console.error('reminder job error', err));
  }, intervalSec * 1000);
}
