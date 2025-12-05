import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';

export async function resetDb(prisma) {
  await prisma.$transaction([
    prisma.deadlineReminder.deleteMany(),
    prisma.deadline.deleteMany(),
    prisma.subtask.deleteMany(),
    prisma.task.deleteMany(),
    prisma.folder.deleteMany(),
    prisma.actionItem.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.helpRequest.deleteMany(),
    prisma.moodEntry.deleteMany(),
    prisma.breakReminder.deleteMany(),
    prisma.session.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.user.deleteMany()
  ]);
  // Clean up uploaded test files
  const uploadsRoot = path.resolve('uploads');
  await fs.rm(uploadsRoot, { recursive: true, force: true }).catch(() => {});
}

export async function registerAgent(app, { email, role = 'student', password = 'password123' }) {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ email, password, role });
  const cookie = res.headers['set-cookie']?.[0];
  if (!cookie) throw new Error('No session cookie returned from register');
  return { agent, cookie };
}
