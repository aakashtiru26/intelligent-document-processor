"""Document processing orchestration service."""
import asyncio
import os
import time
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.websocket_manager import manager
from app.models.document import Document, DocumentStatus
from app.services.nlp_service import nlp_service
from app.services.ocr_service import ocr_service


class ProcessingService:
    """Orchestrates the full document processing pipeline."""

    async def process_document(
        self,
        document: Document,
        db: AsyncSession,
        client_id: Optional[str] = None,
    ) -> Document:
        """Full processing pipeline with real-time updates."""
        start_time = time.time()

        async def send_update(step: str, progress: int, message: str):
            if client_id:
                await manager.send_update(client_id, {
                    "type": "processing_update",
                    "document_id": document.id,
                    "step": step,
                    "progress": progress,
                    "message": message,
                })

        try:
            # Step 1: Update status to processing
            document.status = DocumentStatus.PROCESSING
            await db.commit()
            await send_update("init", 5, "Starting document processing...")

            # Step 2: OCR extraction
            await send_update("ocr", 15, "Preprocessing image for OCR...")
            await asyncio.sleep(0.1)  # Yield event loop

            file_path = document.file_path
            await send_update("ocr", 30, "Extracting text via OCR...")

            if document.mime_type == "application/pdf":
                raw_text, ocr_confidence, page_count = await asyncio.get_event_loop().run_in_executor(
                    None, ocr_service.extract_text_from_pdf, file_path
                )
                document.page_count = page_count
            else:
                raw_text, ocr_confidence = await asyncio.get_event_loop().run_in_executor(
                    None, ocr_service.extract_text_from_image, file_path
                )

            document.raw_text = raw_text
            await send_update("ocr", 45, f"Text extracted ({len(raw_text)} characters)")

            # Step 3: Document classification
            await send_update("classify", 50, "Classifying document type...")
            doc_type, type_confidence = nlp_service.classify_document(raw_text)
            document.document_type = doc_type
            await send_update("classify", 55, f"Document classified as: {doc_type.value}")

            # Step 4: Entity extraction
            await send_update("ner", 60, "Extracting named entities...")
            entities = await asyncio.get_event_loop().run_in_executor(
                None, nlp_service.extract_entities, raw_text
            )
            document.entities = entities
            await send_update("ner", 68, f"Found {sum(len(v) for v in entities.values())} entities")

            # Step 5: Structured field extraction
            await send_update("fields", 72, "Extracting structured fields...")
            structured_data, field_confidences = await asyncio.get_event_loop().run_in_executor(
                None, nlp_service.extract_structured_fields, raw_text, doc_type
            )
            document.structured_data = structured_data
            document.field_confidences = field_confidences
            await send_update("fields", 80, f"Extracted {len(structured_data)} structured fields")

            # Step 6: Keyword extraction
            await send_update("keywords", 82, "Extracting keywords...")
            keywords = await asyncio.get_event_loop().run_in_executor(
                None, nlp_service.extract_keywords, raw_text
            )
            document.keywords = keywords
            await send_update("keywords", 87, f"Identified {len(keywords)} keywords")

            # Step 7: Summarization
            await send_update("summary", 90, "Generating document summary...")
            summary = await asyncio.get_event_loop().run_in_executor(
                None, nlp_service.summarize_text, raw_text
            )
            document.summary = summary
            await send_update("summary", 94, "Summary generated")

            # Step 8: Confidence scoring
            await send_update("scoring", 96, "Calculating confidence scores...")
            overall_confidence = nlp_service.calculate_overall_confidence(
                ocr_confidence, type_confidence, field_confidences
            )
            document.confidence_score = overall_confidence

            # Step 9: Complete
            document.status = DocumentStatus.COMPLETED
            document.processing_time = round(time.time() - start_time, 2)
            await db.commit()

            await send_update("complete", 100, f"Processing complete in {document.processing_time}s")
            await manager.send_update(client_id, {
                "type": "processing_complete",
                "document_id": document.id,
                "document": document.to_dict(),
            }) if client_id else None

            return document

        except Exception as e:
            document.status = DocumentStatus.FAILED
            document.error_message = str(e)
            document.processing_time = round(time.time() - start_time, 2)
            await db.commit()

            if client_id:
                await manager.send_update(client_id, {
                    "type": "processing_error",
                    "document_id": document.id,
                    "error": str(e),
                })
            raise


processing_service = ProcessingService()
