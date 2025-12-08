import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helpRequestsRouter from './routes/helpRequests.js';
import tasksRouter from './routes/tasks.js';
import deadlinesRouter from './routes/deadlines.js';
import subtasksRouter from './routes/subtasks.js';
import meetingsUploadRouter from './routes/meetings/upload.js';
import fs from 'fs';
import { scheduleReminderJob } from '../jobs/reminders.js';
import { authFromHeaders } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(authFromHeaders);

// CORS: allow all in dev by default; tighten in prod
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sapphire-platform-server' });
});

app.use('/api/help-requests', helpRequestsRouter);
app.use('/api/meetings', meetingsUploadRouter);
app.use('/tasks', tasksRouter);
app.use('/deadlines', deadlinesRouter);
app.use('/', subtasksRouter);

// Serve built frontend under /app (avoid API route collisions)
const distDir = path.resolve(__dirname, '../../frontend/dist');
const srcFrontendDir = path.resolve(__dirname, '../../frontend');
const hasDist = (() => {
  try { return fs.existsSync(path.join(distDir, 'index.html')); } catch { return false; }
})();

// Static assets (JS/CSS) for SPA
app.use('/app', express.static(hasDist ? distDir : srcFrontendDir));
// SPA fallback: send index.html for any /app/* route
app.get('/app/*', (_req, res) => {
  const file = path.join(hasDist ? distDir : srcFrontendDir, 'index.html');
  res.sendFile(file);
});

// Serve uploaded audio files
const uploadsDir = path.resolve(__dirname, '../uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsDir));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  scheduleReminderJob();
});
