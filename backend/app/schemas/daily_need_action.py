from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DailyNeedActionBase(BaseModel):
    code: str
    name_ar: str
    name_en: str
    intent: str
    category: str
    risk_level: str
    default_message_ar: str
    default_message_en: str
    icon: str | None = None
    color: str | None = None
    requires_confirmation: bool = True
    is_active: bool = True


class DailyNeedActionCreate(DailyNeedActionBase):
    pass


class DailyNeedActionUpdate(BaseModel):
    name_ar: str | None = None
    name_en: str | None = None
    intent: str | None = None
    category: str | None = None
    risk_level: str | None = None
    default_message_ar: str | None = None
    default_message_en: str | None = None
    icon: str | None = None
    color: str | None = None
    requires_confirmation: bool | None = None
    is_active: bool | None = None


class DailyNeedActionOut(DailyNeedActionBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)