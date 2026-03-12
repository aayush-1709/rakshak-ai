# Rakshak AI

AI-powered public complaint dashboard for municipal intelligence.

Rakshak AI helps authorities and operations teams:
- collect and analyze public issue reports
- identify high-risk clusters and pincode trends
- generate AI-backed weekly intelligence reports
- query live complaints data through a chatbot interface

---

## Table Of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [Run Locally (Optional)](#run-locally-optional)
- [Deploy Backend On Render](#deploy-backend-on-render)
- [Deploy Frontend On Vercel](#deploy-frontend-on-vercel)
- [Connect Render And Vercel](#connect-render-and-vercel)
- [API Endpoints](#api-endpoints)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

---

## Project Overview

This repository contains two deployable applications:

1. **Frontend** (Next.js) at the repo root  
   - deployed on **Vercel**
2. **Backend API** (`backend/`)  
   - deployed on **Render**
   - connects to PostgreSQL and Gemini

Branding has been migrated from `civic-dev` to **Rakshak AI**.

---

## Key Features

- Citizen issue reporting form with image upload
- AI-based issue classification and risk suggestion
- Cluster dashboard with filters and sorting
- Pincode-level complaint views
- Interactive risk map (Google Maps)
- AI-generated municipal report with PDF export
- AI chatbot for insights on live complaint data
- Mock mode support for demos/testing
- Mobile-responsive UI for phone screens

---

## Tech Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Google Maps JS API
- jsPDF + jspdf-autotable

### Backend
- Node.js
- Express
- PostgreSQL (`pg`)
- Multer
- Gemini API integration

---

## Repository Structure

- `app/` - Next.js app routes and layout
- `components/` - dashboard and UI components
- `lib/` - frontend API client and utilities
- `backend/src/` - server, DB/store, AI logic
- `render.yaml` - Render blueprint for backend
- `.env.example` - frontend env template
- `.env.backend.example` - backend env template
- `logo.png` - Rakshak AI branding logo

---

## How It Works

1. User submits an issue from frontend (`/api/analyze-issue` + `/api/submit-issue`).
2. Backend enriches/stores complaint in PostgreSQL.
3. Clustering + aggregation endpoints provide dashboard data.
4. Report endpoint generates structured AI summary.
5. Chat endpoint answers questions from live complaint dataset.

---

## Environment Variables

## Frontend (`.env.local`)

Use the same values in Vercel project env settings:

```bash
NEXT_PUBLIC_USE_MOCK_MODE=false
NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend>.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_google_maps_browser_key>
```

Template: `.env.example`

## Backend (`backend/.env`)

```bash
PORT=8000
FRONTEND_ORIGIN=https://<your-vercel-domain>.vercel.app
DATABASE_URL=<your_postgres_connection_string>
GEMINI_API_KEYS=key1,key2,key3
GEMINI_MODEL=gemini-2.5-flash
```

Template: `.env.backend.example`

---

## Run Locally (Optional)

Even though deployment is the primary flow, local run is supported.

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

```bash
npm install
npm run dev
```

Frontend default: `http://localhost:3000`  
Backend default: `http://localhost:8000`

---

## Deploy Backend On Render

You can deploy using `render.yaml` (recommended) or manual settings.

## Option A: Blueprint (Recommended)

1. Push repository to GitHub.
2. In Render, select **New + -> Blueprint**.
3. Choose this repository.
4. Render reads `render.yaml` automatically.
5. Set required env vars:
   - `FRONTEND_ORIGIN`
   - `DATABASE_URL`
   - `GEMINI_API_KEYS`
6. Deploy.

## Option B: Manual Web Service

Use:
- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Then add the same env vars and deploy.

---

## Deploy Frontend On Vercel

1. Import this repository in Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Root directory: repository root.
4. Add environment variables:
   - `NEXT_PUBLIC_USE_MOCK_MODE=false`
   - `NEXT_PUBLIC_API_BASE_URL=<render_backend_url>`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<maps_key>`
5. Deploy.

---

## Connect Render And Vercel

After both deployments:

1. Copy Vercel production URL.
2. Set Render `FRONTEND_ORIGIN` to that exact URL.
3. Redeploy backend.
4. Ensure Vercel `NEXT_PUBLIC_API_BASE_URL` points to Render backend URL.
5. Redeploy frontend.

For preview branches, you can allow multiple origins (comma-separated) in `FRONTEND_ORIGIN`.

---

## API Endpoints

- `GET /health`
- `POST /api/analyze-issue`
- `POST /api/submit-issue`
- `GET /api/issue-clusters`
- `GET /api/complaints`
- `GET /api/cluster-complaints?cluster_id=<id>`
- `GET /api/generate-report`
- `POST /api/chat-insights`

---

## Production Checklist

- Backend `/health` is reachable
- CORS is configured and no browser CORS errors
- Frontend points to Render backend URL (not localhost)
- Complaint submit flow works end-to-end
- Clusters and map render correctly
- Report generation + PDF download work
- Chat insights respond from live data

---

## Troubleshooting

- **CORS blocked**  
  Ensure `FRONTEND_ORIGIN` exactly matches deployed Vercel URL.

- **Frontend still calling localhost**  
  Set `NEXT_PUBLIC_API_BASE_URL` in Vercel and redeploy.

- **500 on AI endpoints**  
  Check `GEMINI_API_KEYS` and `GEMINI_MODEL` on Render.

- **Database connection errors**  
  Verify `DATABASE_URL`, SSL settings, and DB allowlist/network rules.

- **Slow first request on Render free plan**  
  Cold starts are expected.

---

## Security Notes

- Do not commit real secrets in `.env` files.
- Keep Gemini and DB keys only in Render/Vercel env settings.
- Rotate any exposed keys immediately.
- Build output (`.next/`) is not source of truth; edit source files only.

