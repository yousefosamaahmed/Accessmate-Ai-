from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

DetectedLanguage = Literal["ar","en","mixed","unknown"]

class SpeechLogBase(BaseModel):
    audio_input_path: Optional[str] = None
    transcript: Optional[str] = None
    detected_language: DetectedLanguage = "unknown"
    confidence: Optional[Decimal] = None
    tts_output_path: Optional[str] = None

class SpeechLogCreate(SpeechLogBase):
    user_id : UUID

class SpeechLogUpdate(BaseModel):
    audio_input_path: Optional[str] = None
    transcript: Optional[str] = None
    detected_language: Optional[DetectedLanguage] = None
    confidence: Optional[Decimal] = None
    tts_output_path: Optional[str] = None

class SpeechLogResponse(SpeechLogBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)