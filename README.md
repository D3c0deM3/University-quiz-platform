# UniTest — University Learning Platform

Smart material management and AI-powered quiz generation platform for universities.

## Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌────────────────┐
│  Next.js 16  │───▶│  NestJS Backend  │───▶│  Python FastAPI │
│  Frontend    │    │  + Prisma 7      │    │  Processing     │
│  :3001       │    │  :3000           │    │  :8000          │
└─────────────┘    └────────┬─────────┘    └────────────────┘
                            │
                   ┌────────┼────────┐
                   ▼        ▼        ▼
              PostgreSQL   Redis   Uploads
                :5432      :6379   (shared)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS 4, Zustand, React Hook Form |
| Backend API | NestJS 11, Prisma 7, JWT Auth, BullMQ |
| Processing | Python FastAPI, pdfplumber, python-docx, python-pptx, pytesseract |
| AI | Google Gemini (gemini-3.1-flash-lite-preview) |
| Database | PostgreSQL 16 with pg_trgm full-text search |
| Queue | Redis 7 + BullMQ |
| Security | Helmet, @nestjs/throttler, class-validator, CORS |

## Features

- **Authentication** — JWT login/register with role-based access (Admin, Teacher, Student)
- **Material Management** — Upload PDF, DOCX, PPTX files with automatic text extraction
- **AI Processing** — Gemini AI generates metadata (title, summary, keywords, topics) and quiz questions
- **Full-Text Search** — PostgreSQL ts_vector + trigram search across materials and text chunks
- **Quiz System** — Take quizzes, auto-grading for MCQ/True-False, progress tracking
- **Admin Panel** — Dashboard overview, material review/approve/publish workflow, quiz question editor
- **Subject Management** — CRUD subjects with codes and descriptions
- **User Management** — View users, assign roles (Admin only)

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
cp python-service/.env.example python-service/.env
# Edit .env files — set your AI_API_KEY

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec backend npx prisma migrate deploy

# 4. Open the app
open http://localhost:3001
```

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 16
- Redis 7
- Tesseract OCR (`sudo apt install tesseract-ocr`)

### Backend (NestJS)

```bash
cd backend
cp .env.example .env  # Edit with your settings
npm install
npx prisma migrate dev
npm run start:dev     # http://localhost:3000/api
```

### Python Service

```bash
cd python-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your settings
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev  # http://localhost:3001
```

## API Endpoints

| Area | Method | Endpoint | Auth |
|------|--------|----------|------|
| Auth | POST | `/api/auth/register` | — |
| Auth | POST | `/api/auth/login` | — |
| Auth | GET | `/api/auth/profile` | JWT |
| Subjects | GET | `/api/subjects` | — |
| Subjects | POST/PUT/DELETE | `/api/subjects/:id` | Admin/Teacher |
| Materials | POST | `/api/materials/upload` | Admin/Teacher |
| Materials | GET | `/api/materials` | JWT |
| Materials | PATCH | `/api/materials/:id/review` | Admin |
| Materials | PATCH | `/api/materials/:id/publish` | Admin |
| Search | GET | `/api/search?q=...` | JWT |
| Search | GET | `/api/search/deep?q=...` | JWT |
| Quizzes | GET | `/api/quizzes/:id` | JWT |
| Quizzes | POST | `/api/quizzes/:id/attempts` | JWT |
| Quiz History | GET | `/api/my/quiz-attempts` | JWT |
| Users | GET/POST/PUT/DELETE | `/api/users` | Admin |

## Security

- **Rate Limiting** — Global 100 req/min, Login 10 req/min, Register 5 req/min
- **Helmet** — Security headers (XSS, HSTS, Content-Type sniffing protection)
- **Input Validation** — class-validator with whitelist, MaxLength constraints
- **File Validation** — 50MB limit, allowed types only (.pdf, .docx, .pptx, .txt)
- **CORS** — Configured for frontend origin only
- **JWT** — Access + refresh token pattern

## Project Structure

```
├── backend/                # NestJS API server
│   ├── src/
│   │   ├── auth/           # JWT authentication & guards
│   │   ├── users/          # User management
│   │   ├── subjects/       # Subject CRUD
│   │   ├── materials/      # Material upload, processing, review
│   │   ├── search/         # Full-text search engine
│   │   ├── quizzes/        # Quiz delivery & attempts
│   │   └── prisma/         # Database module
│   └── prisma/schema.prisma
├── python-service/         # FastAPI processing service
│   ├── main.py             # App entry & routes
│   ├── text_extractor.py   # PDF/DOCX/PPTX/OCR extraction
│   └── ai_service.py       # Gemini AI metadata & quiz generation
├── frontend/               # Next.js 16 frontend
│   ├── app/                # App router pages
│   ├── components/         # Reusable UI components
│   ├── lib/                # API client, types, utilities
│   └── stores/             # Zustand state management
├── docker-compose.yml      # Full stack orchestration
└── uploads/                # Shared file storage
```

## License

MIT
