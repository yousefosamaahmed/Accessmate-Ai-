from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


Language = Literal["en", "ar"]
SessionStatus = Literal["saved", "completed"]


class HearingCaptionCreate(BaseModel):
    client_id: str = Field(min_length=1, max_length=120)
    sequence: int = Field(default=0, ge=0)
    text: str = Field(min_length=1, max_length=12000)
    translated_text: str | None = Field(default=None, max_length=12000)
    detected_language: Language = "en"
    translation_target: Language | None = None
    created_at: datetime | None = None


class HearingCaptionOut(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    client_id: str
    sequence: int
    text: str
    translated_text: str | None
    detected_language: str
    translation_target: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HearingSessionCreate(BaseModel):
    language: Language = "en"
    translation_enabled: bool = False
    translation_target: Language | None = None
    captions: list[HearingCaptionCreate] = Field(default_factory=list, max_length=100)


class HearingSessionSummaryOut(BaseModel):
    id: UUID
    user_id: UUID
    language: str
    translation_enabled: bool
    translation_target: str | None
    status: str
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime
    caption_count: int


class HearingSessionOut(BaseModel):
    id: UUID
    user_id: UUID
    language: str
    translation_enabled: bool
    translation_target: str | None
    status: str
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime
    captions: list[HearingCaptionOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class HearingSoundEventCreate(BaseModel):
    client_id: str = Field(min_length=1, max_length=120)
    session_id: UUID | None = None
    category: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=160)
    confidence: float = Field(ge=0.0, le=1.0)
    threshold: float = Field(ge=0.0, le=1.0)
    model: str = Field(default="yamnet", min_length=1, max_length=160)


class HearingSoundEventOut(BaseModel):
    id: UUID
    user_id: UUID
    session_id: UUID | None
    care_alert_id: UUID | None
    client_id: str
    category: str
    label: str
    confidence: float
    threshold: float
    model: str
    is_critical: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
