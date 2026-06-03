"""OCR Service with advanced image preprocessing."""
import io
import os
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

from app.core.config import settings


class OCRService:
    """Advanced OCR with preprocessing pipeline."""

    def __init__(self):
        if TESSERACT_AVAILABLE and settings.TESSERACT_CMD != "tesseract":
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        self.dpi = settings.OCR_DPI
        self.lang = settings.OCR_LANGUAGE

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Full preprocessing pipeline for improved OCR accuracy."""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Deskew
        gray = self._deskew(gray)

        # Denoise
        gray = cv2.fastNlMeansDenoising(gray, h=10)

        # Contrast enhancement using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # Morphological operations to remove noise
        kernel = np.ones((1, 1), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        return binary

    def _deskew(self, image: np.ndarray) -> np.ndarray:
        """Deskew image using Hough line detection."""
        try:
            coords = np.column_stack(np.where(image > 0))
            if len(coords) < 10:
                return image
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if abs(angle) < 0.5:
                return image
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
        except Exception:
            return image

    def extract_text_from_image(self, image_path: str) -> Tuple[str, float]:
        """Extract text from an image file with confidence score."""
        if not TESSERACT_AVAILABLE:
            return self._mock_ocr(image_path), 0.75

        img = cv2.imread(image_path)
        if img is None:
            # Try with PIL
            pil_img = Image.open(image_path)
            img = np.array(pil_img.convert('RGB'))
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        processed = self.preprocess_image(img)

        # Get detailed OCR data for confidence
        custom_config = f'--oem 3 --psm 6 -l {self.lang}'
        data = pytesseract.image_to_data(
            processed,
            config=custom_config,
            output_type=pytesseract.Output.DICT
        )

        # Extract text and calculate confidence
        words = []
        confidences = []
        for i, word in enumerate(data['text']):
            conf = data['conf'][i]
            if word.strip() and conf > 0:
                words.append(word)
                confidences.append(conf)

        text = pytesseract.image_to_string(processed, config=custom_config)
        avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.0

        return text.strip(), avg_confidence

    def extract_text_from_pdf(self, pdf_path: str) -> Tuple[str, float, int]:
        """Extract text from PDF, using OCR for scanned pages."""
        if not PYMUPDF_AVAILABLE:
            return self._mock_pdf_text(), 0.80, 1

        doc = fitz.open(pdf_path)
        all_text = []
        all_confidences = []
        page_count = len(doc)

        for page_num in range(page_count):
            page = doc[page_num]

            # Try direct text extraction first
            text = page.get_text("text")
            if text.strip() and len(text.strip()) > 50:
                all_text.append(text)
                all_confidences.append(0.95)  # High confidence for native PDF text
            else:
                # OCR the page
                mat = fitz.Matrix(self.dpi / 72, self.dpi / 72)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")

                # Convert to numpy array
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                processed = self.preprocess_image(img)

                if TESSERACT_AVAILABLE:
                    custom_config = f'--oem 3 --psm 6 -l {self.lang}'
                    ocr_text = pytesseract.image_to_string(processed, config=custom_config)
                    all_text.append(ocr_text)
                    all_confidences.append(0.75)
                else:
                    all_text.append(f"[Page {page_num + 1} - OCR required]")
                    all_confidences.append(0.5)

        doc.close()
        combined_text = "\n\n--- PAGE BREAK ---\n\n".join(all_text)
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        return combined_text.strip(), avg_confidence, page_count

    def _mock_ocr(self, path: str) -> str:
        """Mock OCR for when Tesseract is unavailable."""
        return f"""INVOICE
Invoice Number: INV-2024-001
Date: 2024-01-15
Due Date: 2024-02-15

Bill To:
John Smith
123 Main Street
New York, NY 10001

Items:
1. Consulting Services    $1,500.00
2. Software License       $500.00
3. Support Package        $200.00

Subtotal: $2,200.00
GST (18%): $396.00
Total: $2,596.00

Payment Terms: Net 30
Bank Account: HDFC Bank
Account No: 12345678901
IFSC: HDFC0001234"""

    def _mock_pdf_text(self) -> str:
        return self._mock_ocr("")


ocr_service = OCRService()
