import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    NESTJS_BACKEND_URL: str = os.getenv("NESTJS_BACKEND_URL", "http://localhost:3000/api")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-3.1-flash-lite-preview")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "../uploads")
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "50000"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "2000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))


settings = Settings()
