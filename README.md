# IDPS — Intelligent Document Processing System

A document processing tool I built to automate the boring parts of dealing with paperwork. Upload a scanned invoice, a KYC form, or a bank statement and get back structured data, extracted fields, and a confidence score — without touching a single line manually.

---

## What it does

You drop in a document. The system runs OCR on it, figures out what type of document it is, pulls out the relevant fields (amounts, dates, names, account numbers, GST numbers), and sends everything back as clean JSON or CSV. There's a real-time progress bar over WebSocket so you can watch it happen.

The pipeline looks like this:

```
Upload → Preprocess image → OCR → Classify → NER → Extract fields → Keywords → Summary → Score
```

It handles PDFs natively via PyMuPDF and falls back to Tesseract for scanned images. The preprocessing pipeline (deskewing, denoising, CLAHE contrast enhancement, adaptive thresholding) makes a noticeable difference on low-quality scans.

---

## Stack

| Part | What I used |
|------|-------------|
| Frontend | Next.js 14, TypeScript, Framer Motion |
| Backend | Python 3.11, FastAPI, SQLAlchemy (async) |
| OCR | Tesseract, PyMuPDF, OpenCV, Pillow |
| NLP | spaCy en_core_web_sm + custom regex |
| Database | SQLite (dev), PostgreSQL (prod) |
| Realtime | WebSockets via FastAPI |
| Deployment | Render + Vercel |

---

## Getting it running locally

You'll need Python 3.11+, Node.js 20+, and Tesseract installed.

**Install Tesseract:**
```bash
brew install tesseract          # macOS
sudo apt-get install tesseract-ocr  # Ubuntu
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/api/docs`

**Frontend:**
```bash
cd frontend
npm install
# create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_WS_URL=ws://localhost:8000
npm run dev
```

Runs at `http://localhost:3000`

---

## Docker

If you just want everything running with one command:

```bash
git clone https://github.com/aakashtiru26/intelligent-document-processor.git
cd intelligent-document-processor
cp .env.example backend/.env
docker-compose up --build
```

Frontend at `localhost:3000`, API docs at `localhost:8000/api/docs`.

---

## API

| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | `/api/documents/upload` | Upload a single document |
| POST | `/api/documents/batch` | Upload up to 10 at once |
| GET | `/api/documents/` | List documents with filters |
| GET | `/api/documents/{id}` | Get a specific document |
| DELETE | `/api/documents/{id}` | Delete a document |
| GET | `/api/documents/stats/overview` | Processing statistics |
| GET | `/api/export/{id}/json` | Export as JSON |
| GET | `/api/export/{id}/csv` | Export as CSV |
| WS | `/ws/{client_id}` | Real-time processing updates |

**Upload example:**
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@invoice.pdf"
```

**Response:**
```json
{
  "document_id": "uuid",
  "filename": "invoice.pdf",
  "status": "pending",
  "message": "Document uploaded and queued for processing"
}
```

---

## Deploying for free

**Backend on Render:**

1. New Web Service → connect your repo
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars:
   ```
   DATABASE_URL=sqlite+aiosqlite:///./idps.db
   SECRET_KEY=your-secret-key-here
   CORS_ORIGINS=["https://your-app.vercel.app"]
   ```

Note: free Render instances spin down after 15 minutes of inactivity. Set up a cron ping at [cron-job.org](https://cron-job.org) to hit `/api/health` every 14 minutes if you want it always on.

**Frontend on Vercel:**

1. New Project → import repo
2. Root directory: `frontend`
3. Add env vars:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
   ```

Then go back to Render and update CORS to include your Vercel URL.

---

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | sqlite+aiosqlite:///./idps.db | Switch to PostgreSQL for production |
| `SECRET_KEY` | Yes | — | At least 32 characters |
| `CORS_ORIGINS` | Yes | localhost | JSON array of allowed origins |
| `UPLOAD_DIR` | No | ./uploads | Where files get stored |
| `MAX_FILE_SIZE_MB` | No | 50 | Max upload size |
| `TESSERACT_CMD` | No | tesseract | Full path if not in PATH |
| `OCR_LANGUAGE` | No | eng | Tesseract language code |
| `NEXT_PUBLIC_API_URL` | Yes | http://localhost:8000 | Backend URL |
| `NEXT_PUBLIC_WS_URL` | Yes | ws://localhost:8000 | WebSocket URL |

---

## Common issues

**Tesseract not found**
```bash
# Set the path explicitly in .env
TESSERACT_CMD=/usr/bin/tesseract
```

**spaCy model missing**
```bash
python -m spacy download en_core_web_sm
```

**CORS errors in browser**
Make sure your frontend URL is in `CORS_ORIGINS` on the backend.

**WebSocket not connecting**
Use `wss://` not `ws://` in production.

**OpenCV crash on Linux servers**
```bash
pip install opencv-python-headless
sudo apt-get install libglib2.0-0 libsm6 libxext6 libxrender-dev
```

**SQLite locked errors**
SQLite isn't meant for concurrent production traffic. Switch to PostgreSQL:
```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/idps
```

---

## Running tests

```bash
cd backend
pip install pytest pytest-asyncio httpx pytest-cov
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html
```

---

## Project structure

```
idps/
├── backend/
│   ├── app/
│   │   ├── api/          # documents, export, health endpoints
│   │   ├── core/         # config, database, websocket manager
│   │   ├── models/       # SQLAlchemy document model
│   │   └── services/     # ocr, nlp, processing orchestrator
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages and global styles
│   │   ├── components/   # dashboard and document components
│   │   ├── hooks/        # useWebSocket
│   │   └── lib/          # API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── .gitignore
```

Built with FastAPI, Next.js, Tesseract OCR, and spaCy.
