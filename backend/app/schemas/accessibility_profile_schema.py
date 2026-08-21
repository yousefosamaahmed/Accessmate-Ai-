from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


AssistantLanguage = Literal["ar", "en"]
DetectedLanguage = Literal["ar", "en", "mixed", "unknown"]

AccessibilityMode = Literal[
    "simple_explanation",
    "screen_reader",
    "voice_assist",
    "high_contrast",
    "motor_support"
]

InteractionType = Literal[
    "voice_text",
    "text_only",
    "voice_only"
]


class AccessibilityProfileBase(BaseModel):
    assistant_language: AssistantLanguage = "ar"
    detected_spoken_language: DetectedLanguage = "unknown"
    language_detection_confidence: Optional[Decimal] = None
    mode: AccessibilityMode = "simple_explanation"
    interaction_type: InteractionType = "voice_text"
    safe_browsing_enabled: bool = True
    voice_guidance_enabled: bool = True
    font_size: str = "normal"
    high_contrast: bool = False


class AccessibilityProfileCreate(AccessibilityProfileBase):
    user_id: UUID


class AccessibilityProfileUpdate(BaseModel):
    assistant_language: Optional[AssistantLanguage] = None
    detected_spoken_language: Optional[DetectedLanguage] = None
    language_detection_confidence: Optional[Decimal] = None
    mode: Optional[AccessibilityMode] = None
    interaction_type: Optional[InteractionType] = None
    safe_browsing_enabled: Optional[bool] = None
    voice_guidance_enabled: Optional[bool] = None
    font_size: Optional[str] = None
    high_contrast: Optional[bool] = None


class AccessibilityProfileResponse(AccessibilityProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)