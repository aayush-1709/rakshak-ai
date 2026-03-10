# Rakshak AI Backend

Backend service for the Rakshak AI dashboard frontend.

## Endpoints

- `POST /api/analyze-issue`
- `POST /api/submit-issue`
- `GET /api/issue-clusters`
- `GET /api/generate-report`
- `GET /api/complaints`
- `GET /api/cluster-complaints?cluster_id=<id>`
- `GET /health`

## Run

1. Copy env file:
   - `cp .env.example .env` (or create manually on Windows)
2. Ensure PostgreSQL is running and create DB:
   - DB name example: `civic_dev`
3. Set `DATABASE_URL` and Gemini key env vars in `.env`:
   - Recommended: `GEMINI_API_KEYS=key1,key2,key3,key4`
   - Also supported: `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, ...
   - Optional fallback: `GEMINI_API_KEY`
3. Install and run:
   - `npm install`
   - `npm run dev`

Default URL: `http://localhost:8000`

## Deploy On Render

You can deploy this backend as a Render Web Service.

- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

Set these environment variables in Render:

- `FRONTEND_ORIGIN` = your Vercel frontend URL (for example `https://your-app.vercel.app`)
- `DATABASE_URL` = your hosted PostgreSQL connection string
- `GEMINI_API_KEYS` = comma-separated Gemini keys
- `GEMINI_MODEL` = `gemini-2.5-flash` (optional; defaults if not set)

This repo also includes a root `render.yaml` blueprint you can use for one-click setup.
