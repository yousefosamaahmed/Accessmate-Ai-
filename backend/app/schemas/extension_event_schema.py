from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


ExtensionEventType = Literal[
    "page_opened",
    "scan_request",
    "warning_shown",
    "user_confirmed",
    "user_cancelled",
    "settings_changed",
    "extension_enabled",
    "extension_disabled"
]


class ExtensionEventBase(BaseModel):
    event_type: ExtensionEventType
    url: Optional[str] = None
    domain: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None


class ExtensionEventCreate(ExtensionEventBase):
    user_id: UUID


class ExtensionEventUpdate(BaseModel):
    event_type: Optional[ExtensionEventType] = None
    url: Optional[str] = None
    domain: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None


class ExtensionEventResponse(ExtensionEventBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)