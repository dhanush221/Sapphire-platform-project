# Deployment Guide

This project is configured for a split deployment:
- **Frontend**: Deployed to **Vercel**.
- **Backend**: Deployed to **Render**.

## 1. Backend Deployment (Render)

1.  Create a new **Web Service** on Render.
2.  Connect your GitHub repository.
3.  **Root Directory**: `server`
4.  **Runtime**: Node
5.  **Build Command**: `npm install && npx prisma generate`
6.  **Start Command**: `npm start`
7.  **Environment Variables**:
    *   `DATABASE_URL`: Your PostgreSQL connection string (Internal URL if using Render Postgres).
    *   `NODE_ENV`: `production`
    *   `JWT_SECRET`: A long random string.
    *   `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://your-app.vercel.app`).
    *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for emails).
    *   `OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY` (if using AI features).

## 2. Frontend Deployment (Vercel)

1.  Import the project into Vercel.
2.  **Root Directory**: `frontend` (Edit the root directory in the project settings if it defaults to root).
3.  **Framework Preset**: Vite
4.  **Environment Variables**:
    *   `VITE_API_URL`: Your Render backend URL (e.g., `https://sapphire-server.onrender.com`).
5.  Deploy.

## 3. Post-Deployment

1.  **Database Migration**:
    *   On Render, go to your Web Service > Shell.
    *   Run: `npx prisma migrate deploy` to ensure the database schema is up to date.

2.  **Verify**:
    *   Visit your Vercel URL.
    *   Try logging in or signing up to verify the connection to the backend.
