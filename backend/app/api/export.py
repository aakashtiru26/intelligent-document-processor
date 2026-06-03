"""Export API endpoints for JSON and CSV downloads."""
import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.document import Document

router = APIRouter()


@router.get("/{document_id}/json")
async def export_json(document_id: str, db: AsyncSession = Depends(get_db)):
    """Export document data as JSON."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    export_data = {
        "export_metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "document_id": document.id,
            "original_filename": document.original_filename,
            "system": "IDPS v1.0.0",
        },
        "document_info": {
            "filename": document.original_filename,
            "document_type": document.document_type.value if document.document_type else None,
            "page_count": document.page_count,
            "file_size_bytes": document.file_size,
            "processing_time_seconds": document.processing_time,
            "overall_confidence": document.confidence_score,
        },
        "extracted_text": document.raw_text,
        "structured_fields": document.structured_data,
        "field_confidences": document.field_confidences,
        "named_entities": document.entities,
        "keywords": document.keywords,
        "summary": document.summary,
    }

    json_str = json.dumps(export_data, indent=2, ensure_ascii=False)

    return StreamingResponse(
        io.BytesIO(json_str.encode("utf-8")),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{document_id}_export.json"'
        },
    )


@router.get("/{document_id}/csv")
async def export_csv(document_id: str, db: AsyncSession = Depends(get_db)):
    """Export document structured data as CSV."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["Section", "Field", "Value", "Confidence"])

    # Document info
    writer.writerow(["Document Info", "filename", document.original_filename, ""])
    writer.writerow(["Document Info", "document_type",
                     document.document_type.value if document.document_type else "", ""])
    writer.writerow(["Document Info", "overall_confidence", document.confidence_score, ""])
    writer.writerow(["Document Info", "processing_time", document.processing_time, ""])

    # Structured fields
    if document.structured_data:
        for field, value in document.structured_data.items():
            if field == "line_items" and isinstance(value, list):
                for i, item in enumerate(value):
                    writer.writerow([
                        "Line Items",
                        f"item_{i+1}",
                        json.dumps(item),
                        document.field_confidences.get(field, "") if document.field_confidences else ""
                    ])
            else:
                conf = document.field_confidences.get(field, "") if document.field_confidences else ""
                writer.writerow(["Structured Fields", field, str(value), conf])

    # Entities
    if document.entities:
        for entity_type, values in document.entities.items():
            for val in values:
                writer.writerow(["Named Entities", entity_type, val, ""])

    # Keywords
    if document.keywords:
        for kw in document.keywords[:10]:
            writer.writerow(["Keywords", kw.get("word", ""), kw.get("count", ""), kw.get("score", "")])

    # Summary
    writer.writerow(["Summary", "text", document.summary or "", ""])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{document_id}_export.csv"'
        },
    )


@router.get("/batch/json")
async def export_batch_json(db: AsyncSession = Depends(get_db)):
    """Export all completed documents as JSON."""
    from app.models.document import DocumentStatus
    result = await db.execute(
        select(Document).where(Document.status == DocumentStatus.COMPLETED)
    )
    documents = result.scalars().all()

    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "total_documents": len(documents),
        "documents": [doc.to_dict() for doc in documents],
    }

    json_str = json.dumps(export_data, indent=2, ensure_ascii=False)
    return StreamingResponse(
        io.BytesIO(json_str.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="batch_export.json"'},
    )
