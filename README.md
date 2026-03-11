# Rakshak AI - Public Complaint Dashboard

Rakshak AI is an AI-powered public complaint intelligence platform.
It helps collect issue reports, cluster complaints, assign risk, and generate actionable municipal insights.

This repository is split into:
- **Frontend** (Next.js) - deployed on Vercel
- **Backend API** (Node.js + Express + PostgreSQL) - deployed on Render

---

## Project Status

- Branding migrated from `civic-dev` to **Rakshak AI**
- Frontend prepared for Vercel deployment
- Backend prepared for Render deployment
- Render blueprint included as `render.yaml`

---

## Tech Stack

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS
- Leaflet / React Leaflet (map)
- jsPDF + jspdf-autotable (downloadable report)

### Backend
- Node.js
- Express
- PostgreSQL (`pg`)
- Multer (image upload handling)
- Gemini integration for AI analysis and insights

---

## Repository Structure

- `app/` - Next.js app pages and layout
- `components/` - UI and dashboard components
- `lib/` - API client, shared frontend logic
- `backend/src/` - Express server, domain logic, AI integration
- `backend/README.md` - backend-specific notes
- `render.yaml` - Render blueprint for backend deployment
- `logo.png` - Rakshak AI logo used in app branding

---

## Environment Variables

### Frontend (`.env.local`)

Use these in Vercel Project Environment Variables as well:

- `NEXT_PUBLIC_USE_MOCK_MODE=false`
- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend>.onrender.com`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_browser_maps_key>`

Reference template: `.env.example`

### Backend (`backend/.env`)

- `PORT=8000` (Render overrides this automatically)
- `FRONTEND_ORIGIN=https://<your-vercel-domain>.vercel.app`
- `DATABASE_URL=<your_postgres_connection_string>`
- `GEMINI_API_KEYS=key1,key2,key3`
- `GEMINI_MODEL=gemini-2.5-flash`

Reference template: `.env.backend.example`

> Security note: never commit real API keys or DB credentials.

---

## Backend API Endpoints

- `GET /health` - health check
- `POST /api/analyze-issue`
- `POST /api/submit-issue`
- `GET /api/issue-clusters`
- `GET /api/complaints`
- `GET /api/cluster-complaints?cluster_id=<id>`
- `GET /api/generate-report`
- `POST /api/chat-insights`

---

## Deployment Guide

## 1) Deploy Backend on Render

You can deploy in two ways:

### Option A: Blueprint (recommended)
1. Push this repo to GitHub.
2. In Render: **New + -> Blueprint**.
3. Select this repo (Render reads `render.yaml`).
4. Set required env vars:
   - `FRONTEND_ORIGIN`
   - `DATABASE_URL`
   - `GEMINI_API_KEYS`
5. Deploy.

### Option B: Manual Web Service
Use:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Then add same env vars and deploy.

---

## 2) Deploy Frontend on Vercel

1. Import the same GitHub repo in Vercel.
2. Framework: Next.js (auto-detected).
3. Set frontend environment variables:
   - `NEXT_PUBLIC_USE_MOCK_MODE=false`
   - `NEXT_PUBLIC_API_BASE_URL=<your_render_backend_url>`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>`
4. Deploy.

---

## 3) Connect Frontend and Backend

After both are deployed:

1. Copy Vercel production URL.
2. Set backend `FRONTEND_ORIGIN` on Render to that URL.
3. Redeploy Render backend.
4. Ensure frontend `NEXT_PUBLIC_API_BASE_URL` points to Render backend URL.
5. Redeploy Vercel frontend.

---

## Common Production Checks

- `/health` returns success on backend
- CORS errors absent in browser console
- Complaint submission works
- Cluster list loads
- AI report generation works
- Chat insights endpoint responds

---

## Troubleshooting

- **CORS blocked**: verify `FRONTEND_ORIGIN` exactly matches Vercel domain (no trailing slash needed).
- **Frontend calling localhost**: set `NEXT_PUBLIC_API_BASE_URL` in Vercel and redeploy.
- **500 on AI endpoints**: verify `GEMINI_API_KEYS` is set correctly on Render.
- **DB errors**: validate `DATABASE_URL` and network/SSL requirements of your Postgres provider.
- **Slow first request on Render free tier**: cold starts are expected.

---

## Notes

- This project is deployment-oriented; local `node_modules` may be absent in source snapshots.
- Build artifacts like `.next/` should not be treated as source of truth.
- Main source of truth is in `app/`, `components/`, `lib/`, and `backend/src/`.

