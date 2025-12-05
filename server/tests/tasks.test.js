import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import { resetDb, registerAgent } from './helpers.js';

const DEFAULT_DB = 'postgresql://postgres:123456@localhost:5433/sapphire?schema=public';
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = DEFAULT_DB;

let app;
let prisma;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
  ({ prisma } = await import('../src/prisma.js'));
  await prisma.$connect();
});

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe('Tasks routes', () => {
  it('creates tasks with defaults and increments orderIndex per column', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'tasks-owner@example.com' });

    const first = await agent.post('/tasks')
      .set('Cookie', cookie)
      .send({ title: 'First task' })
      .expect(201);
    expect(first.body.status).toBe('pending');
    expect(first.body.orderIndex).toBe(0);

    const second = await agent.post('/tasks')
      .set('Cookie', cookie)
      .send({ title: 'Second task', status: 'pending' })
      .expect(201);
    expect(second.body.orderIndex).toBe(1);
  });

  it('prevents other users from updating tasks they do not own', async () => {
    const { agent: ownerAgent, cookie: ownerCookie } = await registerAgent(app, { email: 'owner2@example.com' });

    const task = await ownerAgent.post('/tasks')
      .set('Cookie', ownerCookie)
      .send({ title: 'Owner task' })
      .expect(201);

    const { agent: otherAgent, cookie: otherCookie } = await registerAgent(app, { email: 'intruder@example.com' });

    await otherAgent.put(`/tasks/${task.body.id}`)
      .set('Cookie', otherCookie)
      .send({ title: 'Hacked title' })
      .expect(403);
  });

  it('reorders tasks and returns ok with count', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'reorder@example.com' });
    const t1 = await agent.post('/tasks').set('Cookie', cookie).send({ title: 'T1' }).expect(201);
    const t2 = await agent.post('/tasks').set('Cookie', cookie).send({ title: 'T2' }).expect(201);

    await agent.patch('/tasks/reorder')
      .set('Cookie', cookie)
      .send({
        updates: [
          { id: t1.body.id, status: 'completed', orderIndex: 5 },
          { id: t2.body.id, status: 'pending', orderIndex: 0 }
        ]
      })
      .expect(200)
      .expect(res => {
        if (!res.body.ok) throw new Error('expected ok true');
        if (res.body.count !== 2) throw new Error('expected count 2');
      });
  });

  it('rejects reorder when user does not own all tasks', async () => {
    const { agent: ownerAgent, cookie: ownerCookie } = await registerAgent(app, { email: 'owner3@example.com' });
    const task = await ownerAgent.post('/tasks').set('Cookie', ownerCookie).send({ title: 'Owner task' }).expect(201);

    const { agent: intruderAgent, cookie: intruderCookie } = await registerAgent(app, { email: 'intruder2@example.com' });
    await intruderAgent.patch('/tasks/reorder')
      .set('Cookie', intruderCookie)
      .send({ updates: [{ id: task.body.id, status: 'pending', orderIndex: 0 }] })
      .expect(403);
  });

  it('allows supervisor to assign task to another user', async () => {
    const { agent: supervisor, cookie } = await registerAgent(app, { email: 'sup@example.com', role: 'supervisor' });
    const assignee = 'student-assign@example.com';
    const created = await supervisor.post('/tasks')
      .set('Cookie', cookie)
      .send({ title: 'Delegated', assigneeEmail: assignee })
      .expect(201);
    expect(created.body.userId).toBeTruthy();
  });

  it('filters by folderId including null and parses dueDate strings', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'filter@example.com' });
    const folder = await agent.post('/folders').set('Cookie', cookie).send({ name: 'Folder' }).expect(201);
    await agent.post('/tasks').set('Cookie', cookie).send({ title: 'In folder', folderId: folder.body.id }).expect(201);
    const dueAt = new Date().toISOString();
    await agent.post('/tasks').set('Cookie', cookie).send({ title: 'No folder', folderId: null, dueDate: dueAt }).expect(201);

    const nullFolder = await agent.get('/tasks?folderId=null').set('Cookie', cookie).expect(200);
    expect(nullFolder.body.every(t => t.folderId === null)).toBe(true);
    expect(new Date(nullFolder.body[0].dueDate).getTime()).toBe(new Date(dueAt).getTime());
  });

  it('returns 404 for missing task updates and cascades deadline delete', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'missing@example.com' });
    await agent.put('/tasks/9999').set('Cookie', cookie).send({ title: 'Nope' }).expect(404);

    const task = await agent.post('/tasks').set('Cookie', cookie).send({ title: 'With deadline' }).expect(201);
    const dueAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await agent.post('/deadlines').set('Cookie', cookie).send({ taskId: task.body.id, dueAt }).expect(201);
    await agent.delete(`/tasks/${task.body.id}`).set('Cookie', cookie).expect(200);

    const deadlines = await prisma.deadline.findMany();
    expect(deadlines).toHaveLength(0);
  });
});
