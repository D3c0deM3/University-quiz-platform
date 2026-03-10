from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, processing

app = FastAPI(
    title="University Platform - Processing Service",
    description="Handles file parsing, OCR, AI metadata generation, and quiz generation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(processing.router, prefix="/process", tags=["Processing"])
