## Deploying to Vercel (frontend) + server host (backend)

The repo is split: `frontend` (Vite React, served under `/app`) and `server` (Express + Prisma/Postgres). Deploy the frontend on Vercel and the backend on a server platform (Render/Railway/Fly/Heroku/etc.).

### 1) Frontend on Vercel
- Import the repo in Vercel, set project root to `frontend`, framework `Vite`, build command `npm run build`, output directory `dist`.
- Env vars: set `VITE_API_URL` to your backend URL, e.g. `https://api.your-domain.com`.
- `vercel.json` (at repo root) keeps `/app` working and adds SPA fallbacks for client routes.

### 2) Backend on your server platform
- App root: `server`. Runtime: Node 18+.
- Env vars (see `server/.env.example`):
  - `DATABASE_URL` (Postgres), `PORT` (e.g. 5000).
  - Optional: `OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY` + `AI_MODE=live`, `SMTP_*`, `EMAIL_FROM`, `REMINDER_POLL_SECONDS`, `MAX_UPLOAD_SIZE_MB`.
- Deploy steps (typical):
  1. `npm ci`
  2. `npx prisma generate`
  3. `npx prisma migrate deploy`
  4. `node src/index.js`
- Persist uploads: back `server/uploads` with a volume or swap to object storage if your host has ephemeral disk.
- CORS is permissive by default; tighten origins if desired.

### 3) Validate
- Backend health: `https://your-backend-domain/api/health`.
- Frontend: `https://your-vercel-domain/app`.
- Confirm network calls from the frontend use the backend URL set in `VITE_API_URL`.
