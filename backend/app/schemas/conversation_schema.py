# backend/app/schemas/conversation_schema.py

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


ConversationType = Literal[
    "general",
    "document_chat",
    "website_check",
]


class ConversationBase(BaseModel):
    title: Optional[str] = None
    conversation_type: ConversationType = "general"


# =========================================================
# Create conversation
# يستخدم في الحالات الإدارية أو الداخلية
# حيث user_id يتم إرساله صراحة
# =========================================================
class ConversationCreate(ConversationBase):
    user_id: UUID
    document_id: Optional[UUID] = None
    website_check_id: Optional[UUID] = None


# =========================================================
# Create current user's conversation
# يستخدم مع:
# POST /api/v1/conversations/me
#
# الفرونت لا يرسل user_id.
# الباك يأخذه من JWT الحالي.
# =========================================================
class ConversationMineCreate(ConversationBase):
    document_id: Optional[UUID] = None
    website_check_id: Optional[UUID] = None


# =========================================================
# Update conversation
# =========================================================
class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    conversation_type: Optional[ConversationType] = None

    # Archive / Unarchive
    is_archived: Optional[bool] = None


# =========================================================
# API Response
# =========================================================
class ConversationResponse(ConversationBase):
    id: UUID
    user_id: UUID

    document_id: Optional[UUID] = None
    website_check_id: Optional[UUID] = None

    is_archived: bool = False

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)