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

describe('Auth routes', () => {
  it('registers and returns a session usable for /api/auth/me', async () => {
    const agent = request.agent(app);
    const email = 'student1@example.com';

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Test User' })
      .expect(201);

    expect(registerRes.headers['set-cookie']).toBeTruthy();

    const meRes = await agent.get('/api/auth/me').expect(200);
    expect(meRes.body.user.email).toBe(email);
    expect(meRes.body.user.role).toBe('student');
  });

  it('rejects login with wrong password', async () => {
    const agent = request.agent(app);
    const email = 'student2@example.com';
    await agent.post('/api/auth/register').send({ email, password: 'password123' }).expect(201);

    await agent.post('/api/auth/login').send({ email, password: 'wrongpass999' }).expect(401);
  });

  it('clears session on logout and denies /me afterwards', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'student3@example.com', password: 'password123' }).expect(201);

    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects reset-password with invalid token', async () => {
    const { agent } = await registerAgent(app, { email: 'reset@example.com' });
    await agent
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'password123' })
      .expect(400);
  });

  it('issues a reset link when forgot-password is requested', async () => {
    const email = 'forgot@example.com';
    await registerAgent(app, { email });
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);
    expect(res.body.ok).toBe(true);
  }, 20000);
});
