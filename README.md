# ⚡ IDPS — Intelligent Document Processing System

> Production-ready AI-powered platform for OCR, NLP, and document intelligence.
> Processes invoices, receipts, KYC forms, bank statements, and business documents.

![IDPS Banner](docs/banner.png)

---

## 📋 Table of Contents
1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Quick Start (Local)](#quick-start)
5. [Docker Setup](#docker-setup)
6. [API Documentation](#api-documentation)
7. [GitHub Guide](#github-guide)
8. [Deployment Guide](#deployment-guide)
9. [Environment Variables](#environment-variables)
10. [Common Issues & Fixes](#common-issues)
11. [Production Checklist](#production-checklist)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                       │
│              Next.js 14 + React + Tailwind               │
│         Upload → WebSocket Updates → View Results        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/WS
┌──────────────────────▼──────────────────────────────────┐
│                   FASTAPI BACKEND                        │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   OCR    │  │   NLP    │  │ Export   │  │  WS    │  │
│  │ Service  │  │ Service  │  │ Service  │  │Manager │  │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────────┘  │
│       │              │                                    │
│  ┌────▼─────────────▼──────────────────────────────┐    │
│  │          Processing Orchestrator                  │    │
│  │  1. Upload  2. OCR  3. Classify  4. NER           │    │
│  │  5. Fields  6. Keywords  7. Summary  8. Score     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │           SQLite / PostgreSQL Database            │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Processing Pipeline:**
```
File Upload
    │
    ▼
Image Preprocessing (deskew → denoise → CLAHE → threshold)
    │
    ▼
OCR Extraction (Tesseract + PyMuPDF for native PDFs)
    │
    ▼
Document Classification (keyword scoring → type + confidence)
    │
    ▼
Named Entity Recognition (spaCy NER → persons/orgs/dates/money)
    │
    ▼
Structured Field Extraction (regex patterns → invoice#/GST/amounts)
    │
    ▼
Keyword Extraction (TF scoring → top N keywords)
    │
    ▼
Extractive Summarization (sentence scoring)
    │
    ▼
Confidence Scoring (OCR × classification × fields)
    │
    ▼
WebSocket notification → Frontend update
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Python 3.11, FastAPI, SQLAlchemy async |
| OCR | Tesseract OCR, PyMuPDF, OpenCV, Pillow |
| NLP | spaCy (en_core_web_sm), custom regex extractors |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Real-time | WebSockets (native FastAPI) |
| Container | Docker + Docker Compose |
| Deployment | Render (backend) + Vercel (frontend) |

---

## ✨ Features

- 📄 **Multi-format support**: PDF, PNG, JPG, TIFF, BMP, WEBP
- 🔍 **Advanced OCR**: Deskewing, denoising, CLAHE, adaptive thresholding
- 🤖 **Document classification**: Invoice, Receipt, KYC, Bank Statement, Business Doc
- 🏷️ **NER**: Persons, organizations, locations, dates, money amounts
- 🗂️ **Structured extraction**: Invoice numbers, GST, PAN, IFSC, amounts, dates, emails
- 📊 **Confidence scoring**: Per-field and overall confidence metrics
- ⚡ **Real-time updates**: WebSocket progress bars (0–100%)
- 📦 **Batch processing**: Up to 10 documents simultaneously
- ↓ **Export**: JSON and CSV downloads
- 📜 **Document history**: Searchable with filters
- 🐳 **Docker-ready**: Single `docker-compose up` deployment

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Tesseract OCR

#### Install Tesseract:
```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Copy environment file
cp ../.env.example .env

# Start backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API Docs: http://localhost:8000/api/docs

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp ../.env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

---

## 🐳 Docker Setup

```bash
# Clone repo
git clone https://github.com/yourusername/idps.git
cd idps

# Copy env files
cp .env.example backend/.env

# Start everything
docker-compose up --build

# Or in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/docs

---

## 📡 API Documentation

### Endpoints

#### Upload Document
```
POST /api/documents/upload
Content-Type: multipart/form-data

Parameters:
  file: File (required)
  client_id: string (optional, for WebSocket updates)

Response:
  {
    "document_id": "uuid",
    "filename": "invoice.pdf",
    "status": "pending",
    "message": "Document uploaded and queued for processing"
  }
```

#### List Documents
```
GET /api/documents/?skip=0&limit=20&status=completed&doc_type=invoice

Response:
  {
    "total": 42,
    "documents": [{ ... }]
  }
```

#### Get Document
```
GET /api/documents/{id}
```

#### Delete Document
```
DELETE /api/documents/{id}
```

#### Batch Upload
```
POST /api/documents/batch
Content-Type: multipart/form-data
files: File[] (max 10)
```

#### Statistics
```
GET /api/documents/stats/overview
```

#### Export JSON
```
GET /api/export/{id}/json
```

#### Export CSV
```
GET /api/export/{id}/csv
```

#### WebSocket
```
WS /ws/{client_id}

Server messages:
  { type: "processing_update", step, progress, message }
  { type: "processing_complete", document }
  { type: "processing_error", error }
```

---

## 📂 Folder Structure

```
idps/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents.py    # Document CRUD + upload
│   │   │   ├── export.py       # JSON/CSV export
│   │   │   └── health.py       # Health check
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic)
│   │   │   ├── database.py     # SQLAlchemy async
│   │   │   └── websocket_manager.py
│   │   ├── models/
│   │   │   └── document.py     # SQLAlchemy model
│   │   ├── services/
│   │   │   ├── ocr_service.py      # OCR + preprocessing
│   │   │   ├── nlp_service.py      # NLP pipeline
│   │   │   └── processing_service.py # Orchestrator
│   │   └── main.py
│   ├── tests/
│   │   └── test_api.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── Header.tsx
│   │   │   │   └── StatsBar.tsx
│   │   │   └── document/
│   │   │       ├── UploadZone.tsx
│   │   │       ├── DocumentCard.tsx
│   │   │       ├── DocumentViewer.tsx
│   │   │       └── ProcessingOverlay.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   └── lib/
│   │       └── api.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── render.yaml
├── .env.example
└── .gitignore
```

---

## 📘 GitHub Guide

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `idps`
3. Select **Public** or **Private**
4. Do NOT initialize with README (we have one)
5. Click **Create repository**

### Step 2: Initialize and Push
```bash
cd idps

# Initialize git
git init
git add .
git commit -m "feat: initial commit - IDPS v1.0.0

- FastAPI backend with OCR, NLP pipeline
- Next.js 14 frontend with real-time WebSocket updates
- Document classification, NER, structured field extraction
- JSON/CSV export, batch processing
- Docker Compose setup"

# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/idps.git
git branch -M main
git push -u origin main
```

### Step 3: Add Screenshots
```bash
# Take screenshots of the app, save to docs/
mkdir -p docs
# Copy your screenshots to docs/screenshot-1.png etc.

git add docs/
git commit -m "docs: add screenshots"
git push
```

### Step 4: Tag a Release
```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Initial production release"
git push origin v1.0.0
```

---

## 🚀 Deployment Guide (Free)

### Option A: Render (Backend) + Vercel (Frontend) [RECOMMENDED]

#### Backend on Render (Free tier)
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**:
     ```
     pip install -r requirements.txt && python -m spacy download en_core_web_sm
     ```
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   ```
   DATABASE_URL = sqlite+aiosqlite:///./idps.db
   UPLOAD_DIR = ./uploads
   SECRET_KEY = <generate random>
   CORS_ORIGINS = ["https://your-app.vercel.app"]
   ```
5. Click **Create Web Service**
6. Note your URL: `https://idps-xxxx.onrender.com`

> ⚠️ Free Render instances sleep after 15 minutes. Use a cron ping service like https://cron-job.org to keep it awake.

#### Frontend on Vercel (Free tier)
1. Go to https://vercel.com → New Project
2. Import your GitHub repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://idps-xxxx.onrender.com
   NEXT_PUBLIC_WS_URL = wss://idps-xxxx.onrender.com
   ```
5. Click **Deploy**

#### Update Backend CORS
Go back to Render and update:
```
CORS_ORIGINS = ["https://your-idps.vercel.app"]
```

### Option B: Railway (Backend + Frontend + DB)
1. Go to https://railway.app → New Project
2. Add services:
   - **Backend**: Deploy from GitHub (backend folder)
   - **PostgreSQL**: Add plugin → PostgreSQL
3. Set `DATABASE_URL` from PostgreSQL plugin's connection string
4. Add frontend as separate Railway service

### Option C: Fly.io (Backend)
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

cd backend
fly launch --name idps-backend
fly deploy
```

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | sqlite+... | Database connection string |
| `SECRET_KEY` | Yes | — | JWT/session secret (min 32 chars) |
| `UPLOAD_DIR` | No | ./uploads | File upload directory |
| `MAX_FILE_SIZE_MB` | No | 50 | Max upload size in MB |
| `TESSERACT_CMD` | No | tesseract | Path to tesseract binary |
| `OCR_LANGUAGE` | No | eng | Tesseract language code |
| `CORS_ORIGINS` | Yes | [...] | JSON array of allowed origins |
| `DEBUG` | No | false | Enable debug mode |
| `NEXT_PUBLIC_API_URL` | Yes | http://localhost:8000 | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | Yes | ws://localhost:8000 | WebSocket URL |

---

## 🐛 Common Issues & Fixes

### Tesseract not found
```bash
# Error: tesseract is not installed or not in PATH
# Fix:
sudo apt-get install tesseract-ocr tesseract-ocr-eng  # Linux
brew install tesseract  # macOS

# Or set explicit path in .env:
TESSERACT_CMD=/usr/bin/tesseract
```

### spaCy model not found
```bash
# Error: Can't find model 'en_core_web_sm'
# Fix:
python -m spacy download en_core_web_sm
```

### WebSocket connection failed
```
# Check CORS origins include your frontend URL
# For production, use wss:// not ws://
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

### Large file upload fails (413)
```bash
# Increase max file size in .env:
MAX_FILE_SIZE_MB=100

# Also configure your reverse proxy (nginx):
client_max_body_size 100M;
```

### OpenCV import error on Linux
```bash
pip install opencv-python-headless  # Use headless version on servers
sudo apt-get install libglib2.0-0 libsm6 libxext6 libxrender-dev
```

### Database locked (SQLite in production)
```bash
# SQLite is for development only.
# For production, use PostgreSQL:
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/idps
pip install asyncpg
```

### CORS error in browser
```python
# In backend .env, ensure your frontend URL is in CORS_ORIGINS:
CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]
```

### Render cold start (free tier)
Free Render services sleep after 15 min inactivity.
- Use https://cron-job.org to ping `/api/health` every 14 minutes
- Or upgrade to Render Starter plan ($7/mo) for always-on

---

## ✅ Production Checklist

### Security
- [ ] Change `SECRET_KEY` to random 64-char string
- [ ] Set `DEBUG=false`
- [ ] Restrict `CORS_ORIGINS` to your frontend domain only
- [ ] Use PostgreSQL instead of SQLite
- [ ] Add rate limiting (e.g., slowapi)
- [ ] Enable HTTPS (automatic on Render/Vercel)

### Performance
- [ ] Use PostgreSQL for production database
- [ ] Configure file size limits appropriately
- [ ] Add Redis for task queue (for high volume)
- [ ] Set up CDN for static assets (Vercel handles this)

### Reliability
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Add health check endpoint (✅ already done)
- [ ] Configure log aggregation

### OCR Quality
- [ ] Install all Tesseract language packs you need
- [ ] Test with your specific document types
- [ ] Tune preprocessing parameters for your use case

### Monitoring
- [ ] Add uptime monitoring (UptimeRobot - free)
- [ ] Set up Render/Vercel alerts
- [ ] Review logs regularly

---

## 🧪 Running Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx

# Run all tests
pytest tests/ -v

# Run specific test
pytest tests/test_api.py::test_health -v

# With coverage
pip install pytest-cov
pytest tests/ --cov=app --cov-report=html
```

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

*Built with ❤️ using FastAPI + Next.js + Tesseract OCR + spaCy*
