from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ExplanationLevel = Literal[
    "very_simple",
    "simple",
    "student",
    "professional",
    "step_by_step"
]


class AssistantEvidenceChunk(BaseModel):
    chunk_id: UUID
    chunk_index: int
    content: str
    distance: float
    relevance_score: float


class DocumentChatRequest(BaseModel):
    document_id: UUID
    question: str = Field(..., min_length=1)
    language: str = "en"
    explanation_level: ExplanationLevel = "simple"
    voice_friendly: bool = True
    limit: int = Field(default=5, ge=1, le=10)


class DocumentChatResponse(BaseModel):
    answer: str
    document_id: UUID
    question: str
    language: str
    explanation_level: str
    voice_friendly: bool
    found_answer: bool
    confidence: str
    evidence_chunks: list[AssistantEvidenceChunk]


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = "en"
    explanation_level: ExplanationLevel = "simple"
    voice_friendly: bool = True


class AssistantChatResponse(BaseModel):
    answer: str
    language: str
    explanation_level: str
    voice_friendly: bool


# Backward-compatible aliases لو أي ملف قديم بيستورد الأسماء دي
AssistantDocumentChatRequest = DocumentChatRequest
AssistantDocumentChatResponse = DocumentChatResponse