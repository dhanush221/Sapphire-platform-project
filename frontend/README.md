# Sapphire React Frontend

This is a lightweight React app (Vite) to replace the existing JavaScript frontend.

## Prerequisites

- Node.js 18+
- npm or pnpm or yarn

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build production bundle
- `npm run preview` — preview built app

## App Path and Backend

- The app is served under `/app` to avoid conflicts with API routes like `/tasks` and `/deadlines`.
- In development, start the Vite dev server (separate origin) and the Node server.
  - Dev app URL: `http://localhost:5173/app`
  - API server: `http://localhost:5000`
- In production, build the app and run the server. The server serves `frontend/dist` at `/app` with SPA fallback.

## Environment Variables

- `VITE_API_URL` (preferred) or `VITE_API_BASE`: Base URL for backend API, e.g. `http://localhost:5000`.
- Copy `.env.example` to `.env` and adjust for local/prod.

## Backend proxy

If your backend runs locally (e.g., `http://localhost:3000`), set a proxy in `frontend/vite.config.js` under `server.proxy` so that `/api` requests go to the backend during development.

## Migrating pages

- Move HTML shell into `frontend/index.html` and mount React in `#root`.
- Convert individual screens into components under `src/pages/` and shared UI under `src/components/`.
- Replace direct DOM manipulation with component state and effects.
- Redirect API calls to your backend base URL.

## Feature Folders (React)

- `src/layouts/AppLayout.jsx` — shared header/nav + `<Outlet />`.
- `src/features/auth/{Login,Register}.jsx` — authentication pages.
- `src/features/dashboard/DashboardPage.jsx` — greeting/date + today tasks + mood/energy.
- `src/features/tasks/TasksPage.jsx` — Kanban/List/Calendar shells.
- `src/features/deadlines/DeadlinesPage.jsx` — upcoming deadlines list.
- `src/features/meetings/MeetingsPage.jsx` — upload/details tabs.
- `src/features/resources/ResourcesPage.jsx`, `src/features/settings/SettingsPage.jsx`.

## React API Facade + Hooks

- `src/lib/api.js` — React-friendly HTTP client for server routes.
- `src/lib/hooks/useTasks.js` — `tasks`, `loading`, `error`, `refresh`, `create`, `update`, `remove`, `reorder`.
- `src/lib/hooks/useDeadlines.js` — `deadlines`, `refresh`, `create`.
- `src/lib/hooks/useMeetingUpload.js` — `upload(file)`, status, result.
