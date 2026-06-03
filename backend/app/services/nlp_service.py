"""NLP Service: classification, NER, keyword extraction, summarization."""
import re
from typing import Dict, List, Optional, Tuple
from collections import Counter

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False
    nlp = None

from app.models.document import DocumentType


# Regex patterns for structured field extraction
PATTERNS = {
    "invoice_number": [
        r"(?:invoice|inv)[\s#.:]*([A-Z0-9-]{4,20})",
        r"(?:bill|billing)[\s#.:]*no\.?\s*([A-Z0-9-]{4,20})",
    ],
    "date": [
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        r"(\d{4}-\d{2}-\d{2})",
        r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
    ],
    "amount": [
        r"(?:total|amount|grand total|net amount)[\s:]*(?:INR|USD|EUR|£|\$|₹)?\s*([\d,]+\.?\d{0,2})",
        r"(?:INR|USD|EUR|£|\$|₹)\s*([\d,]+\.?\d{0,2})",
    ],
    "gst_number": [
        r"(?:GSTIN|GST No|GST Number)[\s:.]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})",
    ],
    "pan_number": [
        r"(?:PAN|PAN No|PAN Number)[\s:.]*([A-Z]{5}[0-9]{4}[A-Z]{1})",
    ],
    "phone": [
        r"(?:phone|mobile|tel|contact)[\s:.]*([+\d\s\-()]{10,15})",
        r"(\+?[1-9]\d{9,13})",
    ],
    "email": [
        r"([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
    ],
    "account_number": [
        r"(?:account|acc|a/c)[\s#.:]*(?:no\.?|number)?[\s:.]*(\d{9,18})",
    ],
    "ifsc_code": [
        r"(?:IFSC|IFSC Code)[\s:.]*([A-Z]{4}0[A-Z0-9]{6})",
    ],
    "tax_amount": [
        r"(?:GST|VAT|Tax|CGST|SGST|IGST)[\s@\d%]*[\s:.]*(?:INR|USD|EUR|£|\$|₹)?\s*([\d,]+\.?\d{0,2})",
    ],
}

# Document classification keywords
DOC_KEYWORDS = {
    DocumentType.INVOICE: [
        "invoice", "bill", "billing", "invoice no", "invoice number",
        "vendor", "supplier", "purchase order", "po number", "due date",
        "payment terms", "line items"
    ],
    DocumentType.RECEIPT: [
        "receipt", "payment received", "paid", "thank you for your payment",
        "transaction id", "receipt number", "cash receipt", "store receipt"
    ],
    DocumentType.KYC_FORM: [
        "kyc", "know your customer", "identification", "aadhaar", "passport",
        "driving license", "proof of identity", "proof of address", "date of birth",
        "nationality", "signature"
    ],
    DocumentType.BANK_STATEMENT: [
        "bank statement", "account statement", "opening balance", "closing balance",
        "debit", "credit", "transaction date", "reference number", "ifsc",
        "account number", "branch"
    ],
    DocumentType.BUSINESS_DOCUMENT: [
        "agreement", "contract", "memorandum", "certificate", "registration",
        "incorporation", "director", "company", "ltd", "pvt", "llp"
    ],
}


class NLPService:
    """NLP processing pipeline."""

    def classify_document(self, text: str) -> Tuple[DocumentType, float]:
        """Classify document type based on content."""
        text_lower = text.lower()
        scores = {}

        for doc_type, keywords in DOC_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            scores[doc_type] = score

        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]

        if best_score == 0:
            return DocumentType.UNKNOWN, 0.3

        confidence = min(0.95, 0.4 + (best_score / len(DOC_KEYWORDS[best_type])) * 0.6)
        return best_type, confidence

    def extract_entities(self, text: str) -> Dict:
        """Extract named entities using spaCy and regex patterns."""
        entities = {
            "persons": [],
            "organizations": [],
            "locations": [],
            "dates": [],
            "money": [],
            "misc": [],
        }

        if SPACY_AVAILABLE and nlp:
            doc = nlp(text[:10000])  # Limit for performance
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    entities["persons"].append(ent.text.strip())
                elif ent.label_ in ("ORG", "COMPANY"):
                    entities["organizations"].append(ent.text.strip())
                elif ent.label_ in ("GPE", "LOC"):
                    entities["locations"].append(ent.text.strip())
                elif ent.label_ == "DATE":
                    entities["dates"].append(ent.text.strip())
                elif ent.label_ == "MONEY":
                    entities["money"].append(ent.text.strip())
                else:
                    if ent.label_ not in ("CARDINAL", "ORDINAL", "QUANTITY"):
                        entities["misc"].append(f"{ent.text.strip()} ({ent.label_})")

        # Deduplicate
        for key in entities:
            entities[key] = list(dict.fromkeys(entities[key]))[:10]

        return entities

    def extract_structured_fields(self, text: str, doc_type: DocumentType) -> Tuple[Dict, Dict]:
        """Extract structured fields with confidence scores."""
        fields = {}
        confidences = {}
        text_upper = text.upper()

        for field_name, patterns in PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    value = matches[0].strip() if isinstance(matches[0], str) else matches[0]
                    fields[field_name] = value
                    confidences[field_name] = 0.85
                    break

        # Extract addresses (heuristic)
        address_match = re.search(
            r"(?:address|addr|bill to|ship to)[\s:.]*\n?((?:[^\n]+\n?){1,4})",
            text, re.IGNORECASE
        )
        if address_match:
            fields["address"] = address_match.group(1).strip()
            confidences["address"] = 0.70

        # Extract table data (line items)
        lines = text.split('\n')
        line_items = []
        for line in lines:
            # Look for lines with amounts
            item_match = re.match(
                r"(\d+\.?\s+)?(.{5,40}?)\s+([\d,]+\.?\d{0,2})\s*$",
                line.strip()
            )
            if item_match:
                line_items.append({
                    "description": item_match.group(2).strip(),
                    "amount": item_match.group(3).strip(),
                })

        if line_items:
            fields["line_items"] = line_items[:20]
            confidences["line_items"] = 0.65

        return fields, confidences

    def extract_keywords(self, text: str, top_n: int = 20) -> List[Dict]:
        """Extract top keywords using frequency + NLP."""
        if SPACY_AVAILABLE and nlp:
            doc = nlp(text[:10000])
            # Extract noun phrases and meaningful tokens
            candidates = []
            for token in doc:
                if (not token.is_stop and not token.is_punct and
                        token.is_alpha and len(token.text) > 2):
                    candidates.append(token.lemma_.lower())
            for chunk in doc.noun_chunks:
                if len(chunk.text.split()) <= 3:
                    candidates.append(chunk.text.lower())
        else:
            # Fallback: simple word frequency
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            stop_words = {
                "the", "and", "for", "are", "but", "not", "you", "all",
                "can", "had", "her", "was", "one", "our", "out", "day",
                "get", "has", "him", "his", "how", "its", "new", "now",
                "old", "see", "two", "who", "did", "may", "said", "have",
                "from", "this", "that", "with", "they", "will", "been",
                "each", "were", "when", "your", "also", "than", "then",
            }
            candidates = [w for w in words if w not in stop_words]

        counter = Counter(candidates)
        keywords = [
            {"word": word, "count": count, "score": round(count / len(candidates), 4)}
            for word, count in counter.most_common(top_n)
            if len(candidates) > 0
        ]
        return keywords

    def summarize_text(self, text: str, max_sentences: int = 5) -> str:
        """Extractive summarization using sentence scoring."""
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        if len(sentences) <= max_sentences:
            return ' '.join(sentences)

        if SPACY_AVAILABLE and nlp:
            doc = nlp(text[:10000])
            # Score sentences by TF of important terms
            word_freq = Counter(
                token.lemma_.lower() for token in doc
                if not token.is_stop and not token.is_punct and token.is_alpha
            )
            max_freq = max(word_freq.values()) if word_freq else 1
            word_freq = {w: c / max_freq for w, c in word_freq.items()}

            sentence_scores = {}
            for sent in doc.sents:
                score = sum(word_freq.get(token.lemma_.lower(), 0) for token in sent)
                sentence_scores[sent.text] = score / max(len(sent), 1)

            top_sentences = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:max_sentences]
            # Re-order by appearance
            ordered = [s for s in sentences if any(s in ts for ts in top_sentences)][:max_sentences]
            return ' '.join(ordered) if ordered else ' '.join(sentences[:max_sentences])
        else:
            # Fallback: return first N sentences
            return ' '.join(sentences[:max_sentences])

    def calculate_overall_confidence(
        self,
        ocr_confidence: float,
        doc_type_confidence: float,
        field_confidences: Dict,
    ) -> float:
        """Calculate weighted overall confidence score."""
        weights = {
            "ocr": 0.4,
            "classification": 0.2,
            "fields": 0.4,
        }
        field_avg = (
            sum(field_confidences.values()) / len(field_confidences)
            if field_confidences else 0.5
        )
        overall = (
            weights["ocr"] * ocr_confidence +
            weights["classification"] * doc_type_confidence +
            weights["fields"] * field_avg
        )
        return round(min(1.0, max(0.0, overall)), 3)


nlp_service = NLPService()
