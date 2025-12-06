import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import helpRequestsRouter from './routes/helpRequests.js';
import tasksRouter from './routes/tasks.js';
import deadlinesRouter from './routes/deadlines.js';
import subtasksRouter from './routes/subtasks.js';
import meetingsUploadRouter from './routes/meetings/upload.js';
import foldersRouter from './routes/folders.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import resourcesRouter from './routes/resources.js';
import moodsRouter from './routes/moods.js';
import { attachUserFromSession } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(attachUserFromSession);

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

app.use('/api/auth', authRouter);
// Convenience redirect for root to the SPA
app.get('/', (_req, res) => {
  res.redirect('/app');
});

app.use('/api/help-requests', helpRequestsRouter);
app.use('/api/meetings', meetingsUploadRouter);
app.use('/api/moods', moodsRouter);
app.use('/tasks', tasksRouter);
app.use('/deadlines', deadlinesRouter);
app.use('/folders', foldersRouter);
app.use('/users', usersRouter);
app.use('/api/resources', resourcesRouter);
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
// Compatibility with meeting-tool frontend which expects /recordings
app.use('/recordings', express.static(uploadsDir));

export default app;
