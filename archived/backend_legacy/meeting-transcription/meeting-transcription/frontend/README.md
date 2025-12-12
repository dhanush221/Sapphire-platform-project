# Meeting Transcription Frontend

React + Vite single-page UI for the Meeting Transcription & Notes tool.

## Setup

```bash
cd frontend
cp .env.example .env   # optional, defaults to http://localhost:4000
npm install
npm run dev
```

The app will run at `http://localhost:5173` and proxy API requests to `http://localhost:4000`.

## Production build

```bash
npm run build
```

Serve the generated `dist/` directory behind any static host. Set `VITE_API_BASE_URL` in `.env` so the built assets know where your backend lives.
