import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
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

// Load env from server/.env even if process is started from repo root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Middleware
app.use(express.json());
app.use(attachUserFromSession);

// Security & Optimization
app.use(helmet({
  contentSecurityPolicy: false, // Disable default CSP to allow external scripts/images if needed for now
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS: allow all in dev; strict in prod
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

// Serve built frontend under /app (avoid API route collisions)
const distDir = path.resolve(__dirname, '../../frontend/dist');
const srcFrontendDir = path.resolve(__dirname, '../../frontend');
const hasDist = (() => {
  try { return fs.existsSync(path.join(distDir, 'index.html')); } catch { return false; }
})();

// Static assets (JS/CSS) for SPA
app.use('/app', express.static(hasDist ? distDir : srcFrontendDir));
// Serve Vite-built assets referenced from absolute /assets paths
app.use('/assets', express.static(path.join(hasDist ? distDir : srcFrontendDir, 'assets')));
// SPA fallback: send index.html for any /app/* route
app.get('/app/*', (_req, res) => {
  const file = path.join(hasDist ? distDir : srcFrontendDir, 'index.html');
  res.sendFile(file);
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

// Serve uploaded audio files
const uploadsDir = path.resolve(__dirname, '../uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch { }
app.use('/uploads', express.static(uploadsDir));
// Compatibility with meeting-tool frontend which expects /recordings
app.use('/recordings', express.static(uploadsDir));

export default app;
