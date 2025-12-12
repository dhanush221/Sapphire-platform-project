# Sapphire Platform

## Overview
Sapphire Platform is a comprehensive web application designed to support student wellness, task management, and academic success. It includes features for mood tracking, deadline management, meeting recording/transcription, and resource sharing.

## Tech Stack
- **Frontend**: React (Vite), TailwindCSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (via Prisma ORM)
- **Testing**: Vitest
- **Integrations**: Google OAuth, AssemblyAI, OpenAI

## Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sappire-platform-group-16
```

### 2. Install Dependencies
You need to install dependencies for both the frontend and the server.

**Frontend:**
```bash
cd frontend
npm install
```

**Server:**
```bash
cd ../server
npm install
```

## Configuration

### Environment Variables
You need to set up environment variables for both the frontend and the server.

#### Server Configuration
Create a `.env` file in the `server` directory with the following variables:

```env
# Server Port
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/sapphire_db?schema=public"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# Google Auth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/auth/google/callback"
GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:5000/auth/google/calendar/callback"
GOOGLE_STATE_SECRET="your_secret_string"

# Session Management
SESSION_HOURS=72

# AssemblyAI (Transcription)
ASSEMBLYAI_API_KEY="your_assemblyai_key"
AI_MODE="live" # or "mock" for testing without API usage
ASSEMBLYAI_SUMMARY_MODEL="informative"
ASSEMBLYAI_SUMMARY_TYPE="bullets"

# Email Service (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
EMAIL_FROM="your_email@gmail.com"

# Password Reset
RESET_URL_BASE="http://localhost:5173/reset-password"
RESET_TOKEN_MINUTES=60

# File Uploads
MAX_UPLOAD_SIZE_MB=500
RESOURCE_UPLOAD_DIR="uploads/resources"
```

#### Frontend Configuration
Create a `.env` file in the `frontend` directory:

```env
VITE_GOOGLE_CLIENT_ID="your_google_client_id"
VITE_API_BASE="http://localhost:5000"
```

## Database Setup

Initialize the PostgreSQL database using Prisma. Ensure your PostgreSQL server is running and `DATABASE_URL` is correct.

```bash
cd server
# Generate Prisma Client
npm run prisma:generate

# Run Migrations
npm run prisma:migrate
```

## Running the Application

### Development Mode
You can run both the frontend and backend concurrently from the `server` directory:

```bash
cd server
npm run dev:all
```

Or run them separately:
1. **Server**: `cd server && npm run dev`
2. **Frontend**: `cd frontend && npm run dev`

Access the application at `http://localhost:5173`.

### Production Build
To build the frontend for production:

```bash
cd frontend
npm run build
```

To start the server in production mode:
```bash
cd server
npm start
```

## Testing
To run tests:

**Frontend**:
```bash
cd frontend
npm test
```

**Backend**:
```bash
cd server
npm test
```

## Features
- **Authentication**: Secure login/signup with Google support.
- **Dashboard**: Overview of tasks, mood, and upcoming deadlines.
- **Task Management**: Create, organize, and track academic tasks.
- **Wellness**: Mood and energy tracking with insights.
- **Meetings**: Upload and transcribe meeting recordings using AssemblyAI.
- **Resources**: Upload and organize study materials.
- **Deadlines**: Track assignment due dates with reminders.
