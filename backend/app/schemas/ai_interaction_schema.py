from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AIInteractionResponse(BaseModel):
    id: UUID
    user_id: UUID

    feature: str
    request_type: str

    input_text: str | None = None
    output_text: str | None = None

    provider: str | None = None
    model_name: str | None = None

    status: str
    confidence: float | None = None

    is_voice_friendly: bool
    should_speak: bool

    metadata_json: dict[str, Any] | None = None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIInteractionListResponse(BaseModel):
    items: list[AIInteractionResponse]
    count: int
    limit: int
    offset: int