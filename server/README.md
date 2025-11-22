Sapphire Platform Server

Local development

- Prereqs: Node.js 18+, npm
- Setup:
  - cd server
  - copy .env.example to .env and adjust if needed
  - npm install
  - npx prisma generate
  - npm run prisma:migrate
  - npm run dev

The API runs on http://localhost:5000 by default.

Endpoints

- GET `/api/health` — basic health check
- POST `/api/help-requests` — create a help request
- GET `/api/help-requests` — list help requests (dev)
- GET `/tasks` — list tasks ordered by status/orderIndex
- POST `/tasks` — create task (default status pending, next orderIndex)
- PUT `/tasks/:id` — update task fields
- DELETE `/tasks/:id` — delete task (cascades deadlines)
- PATCH `/tasks/reorder` — batch reorder across columns
- GET `/deadlines/upcoming` — upcoming deadlines with task_title
- POST `/deadlines` — create deadline and reminders
- GET `/api/meetings` — list meetings (supports `?q=` search)
- POST `/api/meetings/upload` — upload audio/video for transcription + summary
- PATCH `/api/meetings/:meetingId/action-items/:actionId` — toggle action items

Env

- Required: `DATABASE_URL` (PostgreSQL), `PORT` (5000), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `REMINDER_POLL_SECONDS`.
- Meetings (AssemblyAI): `ASSEMBLYAI_API_KEY` (set `AI_MODE=live` to force live processing, defaults to mock when key missing), optional `ASSEMBLYAI_SUMMARY_MODEL` (default `informative`), `ASSEMBLYAI_SUMMARY_TYPE` (default `bullets`), `MAX_UPLOAD_SIZE_MB` (default 500).

Frontend integration

- The frontend (index.html) can call `/api/help-requests`, `/tasks`, and `/deadlines` directly if both are on the same origin. If serving separately, enable CORS (already enabled with permissive defaults) and use absolute URLs in fetch (default base `http://localhost:5000`).
