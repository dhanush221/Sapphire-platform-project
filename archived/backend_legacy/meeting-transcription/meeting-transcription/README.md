# Meeting Transcription & Notes Tool (Standalone)

This project provides a complete backend + frontend implementation for a Meeting Transcription & Notes tool.

## Structure

- `backend/` — Node.js + Express + Prisma + PostgreSQL + AssemblyAI (transcription & summarization)
- `frontend/` — React + Vite single-page UI

## Quickstart

1. Start the backend
   ```bash
   cd backend
   cp .env.example .env   # fill in DATABASE_URL and OPENAI_API_KEY
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```

2. Start the frontend
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

You can now:
- Upload meeting recordings (video files)
- Automatically transcribe audio using AssemblyAI (with optional local mock mode)
- Generate summaries and action items
- Store and search meetings by transcript/notes/action items

## Environment variables

| Location  | File                | Description |
|-----------|---------------------|-------------|
| Backend   | `backend/.env`      | Configure `ASSEMBLYAI_API_KEY` (required when `AI_MODE=live`), optional `MAX_UPLOAD_SIZE_MB`, `ALLOWED_ORIGIN`, choose storage mode (`STORAGE_MODE=file` by default or `database` with `DATABASE_URL`), and set `AI_MODE` (`mock` for offline demos, `live` for real AssemblyAI calls). |
| Frontend  | `frontend/.env`     | Set `VITE_API_BASE_URL` to the backend URL (defaults to `http://localhost:4000` in dev). |

Sample `.env.example` files are provided in both packages.

## Storage options

- **File-based (default)** — Works out of the box with `STORAGE_MODE=file`, storing meetings inside `backend/data/meetings.json`. No external database required.
- **PostgreSQL** — Set `STORAGE_MODE=database`, provide `DATABASE_URL`, then run the Prisma migrations before you start the backend.

To apply the migrations when running in database mode:

```bash
cd backend
npm install
npx prisma migrate deploy
```

## Deployment

1. **Backend**
   - Copy `backend/.env.example` to `.env` and fill in production secrets.
   - Choose your storage mode: leave `STORAGE_MODE=file` for local JSON persistence, or set `STORAGE_MODE=database` plus `DATABASE_URL` for PostgreSQL.
   - Choose your AI mode: leave `AI_MODE=mock` for offline demos, or set `AI_MODE=live` with a valid `ASSEMBLYAI_API_KEY`.
   - Install dependencies with `npm install`.
   - If using PostgreSQL, run `npx prisma migrate deploy` before starting the server.
   - Start the server with `npm run start` using a process manager (PM2, systemd, etc).

2. **Frontend**
   - Copy `frontend/.env.example` to `.env` and update `VITE_API_BASE_URL` to point at the deployed backend.
   - Install dependencies and run `npm run build`.
   - Serve the generated `frontend/dist` directory from your static host (Vercel, Netlify, S3 + CDN, etc).

3. **Uploads**
   - Ensure the backend `uploads/` directory exists and is writable by the Node.js process (a `.gitkeep` placeholder is tracked so the folder ships with the repo).
   - Use object storage or shared disk if you plan to scale horizontally—the sample app writes uploads to local disk.
   - When running with the default file store, persist `backend/data/meetings.json` somewhere durable (volume, bucket, etc.) so you don't lose metadata.

Once deployed, verify:
- `POST /api/meetings/upload` succeeds for a test video within the configured `MAX_UPLOAD_SIZE_MB`.
- `GET /api/meetings` lists meetings and `/api/meetings/search/query` returns filtered results.
- The frontend environment variable points to the deployed backend so `/uploads/*` media URLs resolve correctly.
