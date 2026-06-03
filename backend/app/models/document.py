"""Document database model."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Float, Integer, Text, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentType(str, enum.Enum):
    INVOICE = "invoice"
    RECEIPT = "receipt"
    KYC_FORM = "kyc_form"
    BANK_STATEMENT = "bank_statement"
    BUSINESS_DOCUMENT = "business_document"
    UNKNOWN = "unknown"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Processing
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.PENDING
    )
    document_type: Mapped[Optional[DocumentType]] = mapped_column(
        Enum(DocumentType), nullable=True
    )
    processing_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Extracted data
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    structured_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    entities: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    keywords: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    field_confidences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Metadata
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "page_count": self.page_count,
            "status": self.status.value if self.status else None,
            "document_type": self.document_type.value if self.document_type else None,
            "processing_time": self.processing_time,
            "raw_text": self.raw_text,
            "structured_data": self.structured_data,
            "entities": self.entities,
            "keywords": self.keywords,
            "summary": self.summary,
            "confidence_score": self.confidence_score,
            "field_confidences": self.field_confidences,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
