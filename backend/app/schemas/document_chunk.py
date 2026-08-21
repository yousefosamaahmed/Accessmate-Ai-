from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DocumentChunkBase(BaseModel):
    chunk_index: int
    content: str


class DocumentChunkCreate(DocumentChunkBase):
    document_id: UUID
    embedding_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class DocumentChunkResponse(DocumentChunkCreate):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentChunkSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class DocumentChunkSearchResult(BaseModel):
    id: UUID
    document_id: UUID
    chunk_index: int
    content: str
    embedding_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    distance: float
    similarity_score: float

    model_config = ConfigDict(from_attributes=True)