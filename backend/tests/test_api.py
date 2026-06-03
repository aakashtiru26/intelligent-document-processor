"""Backend API tests."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import init_db


@pytest_asyncio.fixture
async def client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_list_documents_empty(client):
    response = await client.get("/api/documents/")
    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_stats(client):
    response = await client.get("/api/documents/stats/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_documents" in data


@pytest.mark.asyncio
async def test_get_nonexistent_document(client):
    response = await client.get("/api/documents/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_nlp_classification():
    from app.services.nlp_service import nlp_service
    from app.models.document import DocumentType

    invoice_text = "Invoice No: INV-001 Total: $500 Due Date: 2024-02-01 Vendor: ACME Corp"
    doc_type, confidence = nlp_service.classify_document(invoice_text)
    assert doc_type == DocumentType.INVOICE
    assert confidence > 0.4


@pytest.mark.asyncio
async def test_nlp_keywords():
    from app.services.nlp_service import nlp_service

    text = "The invoice amount is due for payment. Invoice number INV-001 is for consulting services."
    keywords = nlp_service.extract_keywords(text, top_n=5)
    assert len(keywords) > 0
    assert "word" in keywords[0]


@pytest.mark.asyncio
async def test_nlp_summarization():
    from app.services.nlp_service import nlp_service

    text = (
        "This is the first sentence of the document. "
        "The second sentence contains important information. "
        "Third sentence adds more context. "
        "Fourth sentence provides details. "
        "Fifth sentence concludes the paragraph. "
        "Sixth sentence is extra. "
    )
    summary = nlp_service.summarize_text(text, max_sentences=3)
    assert len(summary) > 0


@pytest.mark.asyncio
async def test_structured_field_extraction():
    from app.services.nlp_service import nlp_service
    from app.models.document import DocumentType

    text = """
    Invoice Number: INV-2024-001
    Date: 15/01/2024
    Email: vendor@example.com
    Total: $2,596.00
    """
    fields, confidences = nlp_service.extract_structured_fields(text, DocumentType.INVOICE)
    assert len(fields) > 0
