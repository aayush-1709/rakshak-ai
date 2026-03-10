# Civic Dev Backend

Backend service for the Civic dashboard frontend.

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
