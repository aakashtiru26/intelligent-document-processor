"""Documents API endpoints."""
import asyncio
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document, DocumentStatus
from app.services.processing_service import processing_service

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/tiff",
    "image/bmp",
    "image/webp",
}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    client_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a document."""
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. "
                       f"Allowed: PDF, PNG, JPG, TIFF, BMP, WEBP"
            )

    # Validate file size
    content = await file.read()
    file_size = len(content)
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )

    # Save file
    doc_id = str(uuid.uuid4())
    suffix = Path(file.filename or "document").suffix or ".pdf"
    filename = f"{doc_id}{suffix}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    document = Document(
        id=doc_id,
        filename=filename,
        original_filename=file.filename or "unknown",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Process in background
    background_tasks.add_task(
        _process_document_bg,
        document.id,
        client_id,
    )

    return {
        "document_id": document.id,
        "filename": document.original_filename,
        "status": document.status.value,
        "message": "Document uploaded and queued for processing",
    }


async def _process_document_bg(document_id: str, client_id: Optional[str]):
    """Background task for document processing."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        document = result.scalar_one_or_none()
        if document:
            await processing_service.process_document(document, db, client_id)


@router.get("/")
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all documents with pagination and filtering."""
    query = select(Document).order_by(desc(Document.created_at))

    if status:
        query = query.where(Document.status == status)
    if doc_type:
        query = query.where(Document.document_type == doc_type)

    total_result = await db.execute(select(func.count(Document.id)))
    total = total_result.scalar()

    result = await db.execute(query.offset(skip).limit(limit))
    documents = result.scalars().all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "documents": [doc.to_dict() for doc in documents],
    }


@router.get("/{document_id}")
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific document by ID."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document.to_dict()


@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document and its file."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    await db.delete(document)
    await db.commit()
    return {"message": "Document deleted successfully"}


@router.post("/batch")
async def batch_upload(
    files: List[UploadFile] = File(...),
    client_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process multiple documents."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")

    results = []
    for file in files:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        suffix = Path(file.filename or "document").suffix or ".pdf"
        filename = f"{doc_id}{suffix}"
        file_path = os.path.join(settings.UPLOAD_DIR, filename)

        with open(file_path, "wb") as f:
            f.write(content)

        document = Document(
            id=doc_id,
            filename=filename,
            original_filename=file.filename or "unknown",
            file_path=file_path,
            file_size=len(content),
            mime_type=file.content_type or "application/octet-stream",
            status=DocumentStatus.PENDING,
        )
        db.add(document)
        results.append({"document_id": doc_id, "filename": file.filename})

    await db.commit()

    # Queue all for processing
    for result in results:
        background_tasks.add_task(
            _process_document_bg, result["document_id"], client_id
        )

    return {"batch_size": len(results), "documents": results}


@router.get("/stats/overview")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get processing statistics."""
    total = (await db.execute(select(func.count(Document.id)))).scalar()
    completed = (await db.execute(
        select(func.count(Document.id)).where(Document.status == DocumentStatus.COMPLETED)
    )).scalar()
    failed = (await db.execute(
        select(func.count(Document.id)).where(Document.status == DocumentStatus.FAILED)
    )).scalar()
    processing = (await db.execute(
        select(func.count(Document.id)).where(Document.status == DocumentStatus.PROCESSING)
    )).scalar()

    avg_confidence = (await db.execute(
        select(func.avg(Document.confidence_score)).where(
            Document.confidence_score.isnot(None)
        )
    )).scalar()

    avg_time = (await db.execute(
        select(func.avg(Document.processing_time)).where(
            Document.processing_time.isnot(None)
        )
    )).scalar()

    return {
        "total_documents": total,
        "completed": completed,
        "failed": failed,
        "processing": processing,
        "pending": total - completed - failed - processing,
        "avg_confidence": round(avg_confidence or 0, 3),
        "avg_processing_time": round(avg_time or 0, 2),
    }
