import os

import pymupdf  # PyMuPDF

from logger import get_logger

logger = get_logger(__name__)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract text from an in-memory PDF bytes object.
    Uses PyMuPDF for robust extraction, adapted from the Interview Agent project.
    """
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()

        doc.close()
        logger.info("Successfully extracted %d characters from PDF.", len(text))
        return text
    except Exception as exc:  # pragma: no cover - logged and re-raised
        logger.exception("Failed to extract text from PDF: %s", exc)
        raise ValueError(
            "Could not read the provided PDF file. Please ensure it is a valid PDF."
        )


# Ensure output directory exists for compatibility with original project
os.makedirs("output", exist_ok=True)

