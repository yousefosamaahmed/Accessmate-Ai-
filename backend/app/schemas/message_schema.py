# backend/app/schemas/message_schema.py

from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


MessageRole = Literal[
    "user",
    "assistant",
    "system",
]

AssistantLanguage = Literal[
    "ar",
    "en",
]


class MessageBase(BaseModel):
    role: MessageRole
    content: str
    assistant_language: AssistantLanguage = "ar"


# =========================================================
# Generic message creation
#
# Used when conversation_id is explicitly provided
# in the request body.
# =========================================================
class MessageCreate(MessageBase):
    conversation_id: UUID

    structured_response_json: Optional[
        Dict[str, Any]
    ] = None

    audio_url: Optional[str] = None


# =========================================================
# Current user's conversation message
#
# Used with:
#
# POST
# /api/v1/conversations/me/{conversation_id}/messages
#
# conversation_id comes from the URL,
# not from the frontend request body.
# =========================================================
class MessageMineCreate(MessageBase):
    structured_response_json: Optional[
        Dict[str, Any]
    ] = None

    audio_url: Optional[str] = None


# =========================================================
# Message update
# =========================================================
class MessageUpdate(BaseModel):
    content: Optional[str] = None

    structured_response_json: Optional[
        Dict[str, Any]
    ] = None

    audio_url: Optional[str] = None


# =========================================================
# API response
# =========================================================
class MessageResponse(MessageBase):
    id: UUID
    conversation_id: UUID

    structured_response_json: Optional[
        Dict[str, Any]
    ] = None

    audio_url: Optional[str] = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )