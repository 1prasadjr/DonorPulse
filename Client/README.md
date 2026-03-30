# Open Paws Client

React + Vite frontend for the Donor Retention Predictor platform.

## What It Does

- Analyze page for CSV upload and model readiness checks.
- Dashboard page for donor risk metrics, charts, and recommendations.
- Calls backend endpoints under `/api/v1`.

## Prerequisites

- Node.js 18+
- Backend server running from `../Server`

## Environment

Create a `.env` file in `Client` (or copy `.env.example`) with:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Install

```bash
cd Client
npm install
```

## Run In Development

```bash
cd Client
npm run dev
```

Vite dev server runs on `http://localhost:5173` by default.

## Build And Preview

```bash
cd Client
npm run build
npm run preview
```

## Lint

```bash
cd Client
npm run lint
```

## Integration Checklist (Frontend + Backend)

1. Start backend from `Server` so `http://localhost:8080/api/v1/health` responds.
2. Ensure backend CORS includes `http://localhost:5173`.
3. Start client via `npm run dev` in `Client`.
4. Open `http://localhost:5173/analyze`.
5. Verify:
	- Health and model metadata load.
	- CSV upload succeeds.
	- Redirect to dashboard shows metrics and charts.

## Backend APIs Used

- `GET /api/v1/health`
- `GET /api/v1/model/metadata`
- `POST /api/v1/predictions/upload`
