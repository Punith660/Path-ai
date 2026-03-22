from __future__ import annotations

from io import BytesIO

from docx import Document


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX paragraphs and tables into one string."""
    try:
        document = Document(BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError("Invalid or corrupted DOCX file.") from exc

    chunks: list[str] = []

    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    chunks.extend(paragraphs)

    for table in document.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_cells:
                chunks.append(" | ".join(row_cells))

    return "\n\n".join(chunks)
