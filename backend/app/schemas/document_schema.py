# app/schemas/document_schema.py

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ============================================================
# FILE TYPE
# ============================================================
#
# file_type is stored in PostgreSQL as VARCHAR.
#
# The upload endpoint / FileService is responsible for
# validating which extensions are allowed.
#
# Examples:
# pdf
# png
# jpg
# jpeg
# webp
# docx
# csv
# mp3
# wav
# webm
#
# Keeping this as str prevents the Pydantic schema from
# conflicting with FileService when new supported file
# extensions are added later.
#
DocumentType = str


# ============================================================
# DOCUMENT STATUS
# ============================================================

DocumentStatus = Literal[
    "uploaded",
    "processing",
    "extracted",
    "indexed",
    "failed",
]


# ============================================================
# DETECTED LANGUAGE
# ============================================================

DetectedLanguage = Literal[
    "ar",
    "en",
    "mixed",
    "unknown",
]


# ============================================================
# BASE
# ============================================================

class DocumentBase(BaseModel):
    original_file_name: str

    file_type: DocumentType

    mime_type: str

    file_size: int


# ============================================================
# CREATE
# ============================================================

class DocumentCreate(DocumentBase):
    user_id: UUID

    stored_file_name: str

    file_path: str


# ============================================================
# UPDATE
# ============================================================

class DocumentUpdate(BaseModel):
    status: Optional[DocumentStatus] = None

    extracted_text: Optional[str] = None

    detected_language: Optional[
        DetectedLanguage
    ] = None


# ============================================================
# RESPONSE
# ============================================================

class DocumentResponse(DocumentBase):
    id: UUID

    user_id: UUID

    stored_file_name: str

    file_path: str

    status: DocumentStatus

    extracted_text: Optional[str] = None

    detected_language: DetectedLanguage

    created_at: datetime

    updated_at: datetime


    model_config = ConfigDict(
        from_attributes=True
    )