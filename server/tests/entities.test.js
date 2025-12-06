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

describe('Health and auth guard', () => {
  it('returns ok for /api/health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toContain('sapphire');
  });

  it('blocks unauthenticated access to protected routes', async () => {
    await request(app).get('/tasks').expect(401);
  });
});

describe('Deadlines', () => {
  it('creates deadlines with reminders and shows in upcoming with task title', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'deadline@example.com' });
    const task = await agent.post('/tasks').set('Cookie', cookie).send({ title: 'Deadline task' }).expect(201);

    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const created = await agent.post('/deadlines')
      .set('Cookie', cookie)
      .send({ taskId: task.body.id, dueAt, title: 'Due soon', reminders: [30, 60] })
      .expect(201);
    expect(created.body.reminders).toHaveLength(2);

    const upcoming = await agent.get('/deadlines/upcoming').set('Cookie', cookie).expect(200);
    expect(upcoming.body.some(d => d.task_title === 'Deadline task')).toBe(true);
  });

  it('rejects creating deadline for a task owned by another user', async () => {
    const { agent: owner, cookie: ownerCookie } = await registerAgent(app, { email: 'deadline-owner@example.com' });
    const task = await owner.post('/tasks').set('Cookie', ownerCookie).send({ title: 'Owner task' }).expect(201);

    const { agent: intruder, cookie: intruderCookie } = await registerAgent(app, { email: 'deadline-intruder@example.com' });
    await intruder.post('/deadlines')
      .set('Cookie', intruderCookie)
      .send({ taskId: task.body.id, dueAt: new Date().toISOString() })
      .expect(403);
  });
});

describe('Subtasks', () => {
  it('allows CRUD within owned task and blocks other users', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'sub@example.com' });
    const task = await agent.post('/tasks').set('Cookie', cookie).send({ title: 'Parent' }).expect(201);

    const created = await agent.post(`/tasks/${task.body.id}/subtasks`)
      .set('Cookie', cookie)
      .send({ title: 'Child' })
      .expect(201);

    await agent.put(`/subtasks/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ done: true })
      .expect(200);

    const { agent: other, cookie: otherCookie } = await registerAgent(app, { email: 'sub-intruder@example.com' });
    await other.delete(`/subtasks/${created.body.id}`)
      .set('Cookie', otherCookie)
      .expect(403);
  });
});

describe('Folders', () => {
  it('creates, lists, and deletes folders while nulling task folderId', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'folder@example.com' });
    const folder = await agent.post('/folders').set('Cookie', cookie).send({ name: 'Work' }).expect(201);
    const list = await agent.get('/folders').set('Cookie', cookie).expect(200);
    expect(list.body.find(f => f.id === folder.body.id)).toBeTruthy();

    await agent.post('/tasks').set('Cookie', cookie).send({ title: 'Task in folder', folderId: folder.body.id }).expect(201);
    await agent.delete(`/folders/${folder.body.id}`).set('Cookie', cookie).expect(200);

    const tasks = await agent.get('/tasks').set('Cookie', cookie).expect(200);
    expect(tasks.body[0].folderId).toBeNull();
  });
});

describe('Resources', () => {
  it('requires a file and rejects missing uploads', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'resource@example.com' });
    await agent.post('/api/resources').set('Cookie', cookie).field('title', 'No file').expect(400);
  });

  it('enforces ownership on updates', async () => {
    const { agent: owner, cookie: ownerCookie } = await registerAgent(app, { email: 'res-owner@example.com' });
    const upload = await owner.post('/api/resources')
      .set('Cookie', ownerCookie)
      .attach('file', Buffer.from('hello world'), 'note.txt')
      .field('title', 'My note')
      .expect(201);

    const resourceId = upload.body.resource.id;
    const { agent: other, cookie: otherCookie } = await registerAgent(app, { email: 'res-intruder@example.com' });
    await other.patch(`/api/resources/${resourceId}`)
      .set('Cookie', otherCookie)
      .send({ title: 'Hacked' })
      .expect(403);
  });
});

describe('Moods and reminders', () => {
  it('creates mood entries and enforces validation', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'mood@example.com' });
    await agent.post('/api/moods').set('Cookie', cookie).send({ mood: 6, energy: 3 }).expect(400);

    await agent.post('/api/moods').set('Cookie', cookie).send({ mood: 3, energy: 2 }).expect(201);
    const list = await agent.get('/api/moods?limit=1').set('Cookie', cookie).expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('creates break reminders', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'reminder@example.com' });
    await agent.post('/api/moods/reminders').set('Cookie', cookie).send({ minutes: 10 }).expect(201);
  });
});

describe('Help requests', () => {
  it('validates required fields and lists created items', async () => {
    const { agent, cookie } = await registerAgent(app, { email: 'help@example.com' });
    await agent.post('/api/help-requests').set('Cookie', cookie).send({}).expect(400);
    await agent.post('/api/help-requests')
      .set('Cookie', cookie)
      .send({ type: 'support', description: 'Need help', urgency: 'high' })
      .expect(201);
    const list = await agent.get('/api/help-requests').set('Cookie', cookie).expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);
  });
});
