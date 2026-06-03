"""Application configuration using pydantic-settings."""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "IDPS - Intelligent Document Processing System"
    VERSION: str = "1.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-very-secret-key"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./idps.db"

    # File storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"]

    # OCR
    TESSERACT_CMD: str = "tesseract"
    OCR_LANGUAGE: str = "eng"
    OCR_DPI: int = 300

    # NLP
    SPACY_MODEL: str = "en_core_web_sm"
    SUMMARIZATION_MAX_LENGTH: int = 200
    SUMMARIZATION_MIN_LENGTH: int = 50

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-frontend.vercel.app",
    ]

    # Redis (optional for production)
    REDIS_URL: str = ""

    # Anthropic (optional for AI enhancement)
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

# Create upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)