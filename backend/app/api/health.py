"""Health check endpoints."""
import sys
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    # Check optional dependencies
    deps = {}
    try:
        import pytesseract
        deps["tesseract"] = "available"
    except ImportError:
        deps["tesseract"] = "not installed"

    try:
        import spacy
        deps["spacy"] = "available"
    except ImportError:
        deps["spacy"] = "not installed"

    try:
        import fitz
        deps["pymupdf"] = "available"
    except ImportError:
        deps["pymupdf"] = "not installed"

    try:
        import cv2
        deps["opencv"] = "available"
    except ImportError:
        deps["opencv"] = "not installed"

    return {
        "status": "healthy",
        "version": settings.VERSION,
        "python": sys.version,
        "dependencies": deps,
    }
