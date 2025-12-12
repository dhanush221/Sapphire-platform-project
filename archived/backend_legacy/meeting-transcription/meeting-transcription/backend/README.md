# Meeting Transcription Backend

## Setup

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in values:

   ```bash
   cp .env.example .env
   ```

   Available variables:
   - `PORT` — HTTP port (defaults to `4000`).
   - `DATABASE_URL` — PostgreSQL connection string (only required when `STORAGE_MODE=database`).
   - `ASSEMBLYAI_API_KEY` — API key for AssemblyAI (required when `AI_MODE=live`).
   - `ALLOWED_ORIGIN` — frontend origin allowed through CORS.
   - `MAX_UPLOAD_SIZE_MB` — optional upload size limit (defaults to `500` MB).
   - `STORAGE_MODE` — `file` (default) persists meetings to `backend/data/meetings.json`; set to `database` to use PostgreSQL/Prisma.
   - `AI_MODE` — `mock` (default when no API key) generates placeholder transcripts locally; set to `live` to call AssemblyAI.
   - `ASSEMBLYAI_SUMMARY_MODEL` / `ASSEMBLYAI_SUMMARY_TYPE` — optional overrides for AssemblyAI’s summarization output.

3. (Optional) Initialize the database (PostgreSQL) when using `STORAGE_MODE=database`:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Start the backend:

   ```bash
   npm run dev   # for local development with nodemon
   # or
   npm run start # production process
   ```

The API will be available at `http://localhost:4000`.

### Storage modes

- **File-based (default)** — set `STORAGE_MODE=file` (default in `.env.example`). Meetings are appended to `backend/data/meetings.json`, so no database is required for quick demos.
- **PostgreSQL** — set `STORAGE_MODE=database`, configure `DATABASE_URL`, and run `npx prisma migrate deploy` (or `migrate dev`) before starting the server.

### Key endpoints

- `POST /api/meetings/upload` — upload a meeting video (`meetingVideo` field)
- `GET /api/meetings` — list meetings
- `GET /api/meetings/:id` — get one meeting
- `GET /api/meetings/search/query?q=...` — search meetings
