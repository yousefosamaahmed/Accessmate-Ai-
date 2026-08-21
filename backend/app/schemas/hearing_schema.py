# app/schemas/hearing_schema.py

from typing import Literal

from pydantic import BaseModel, Field


class HearingChunkResponse(BaseModel):
    sequence: int
    transcript: str
    language: str
    is_speech: bool
    provider: str
    model: str
    latency_ms: int


class HearingTranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    source_language: Literal["auto", "en", "ar"] = "auto"
    target_language: Literal["en", "ar"]


class HearingTranslationResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    provider: str
    model: str
    latency_ms: int


class HearingSoundResponse(BaseModel):
    detected: bool
    category: str | None = None
    label: str | None = None
    confidence: float
    threshold: float
    model: str
    latency_ms: int
    monitored_scores: dict[str, float]
