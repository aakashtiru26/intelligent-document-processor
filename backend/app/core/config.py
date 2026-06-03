"""Application configuration using pydantic-settings."""
import os
import json
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "IDPS - Intelligent Document Processing System"
    VERSION: str = "1.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-very-secret-key"

    DATABASE_URL: str = "sqlite+aiosqlite:///./idps.db"

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    TESSERACT_CMD: str = "tesseract"
    OCR_LANGUAGE: str = "eng"
    OCR_DPI: int = 300

    SPACY_MODEL: str = "en_core_web_sm"

    # CORS as plain string - parsed manually below
    CORS_ORIGINS_STR: str = "http://localhost:3000,https://intelligent-document-processor-ivory.vercel.app"

    REDIS_URL: str = ""
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def CORS_ORIGINS(self) -> List[str]:
        v = self.CORS_ORIGINS_STR.strip()
        if not v:
            return ["http://localhost:3000"]
        if v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                pass
        return [o.strip() for o in v.split(",") if o.strip()]


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
