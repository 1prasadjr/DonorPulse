# Donor Retention Predictor - Server

Node.js + TypeScript API that orchestrates CSV upload and Python-based inference for donor churn scoring.

## Prerequisites

- Node.js 18+
- Python 3.10+

## Setup

```bash
cd Server
npm install
python -m pip install -r requirements.txt
```

## Run (development)

```bash
cd Server
npm run dev
```

## Run (production-style)

```bash
cd Server
npm run build
npm start
```

## API

- `GET /api/v1/health`
- `GET /api/v1/model/metadata`
- `POST /api/v1/predictions/upload` (multipart form-data with `file` field)

## Notes

- Uploaded CSVs are written to `src/temp/uploads` then removed after scoring.
- Node handles validation and orchestration.
- Python handles preprocessing, feature engineering, model loading, scoring, and recommendation generation.
