from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime


class AccountUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    telegram_chat_id: str | None = None
    avatar_url: str | None = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str | None = None
    email: str
    is_active: bool
    is_2fa_enabled: bool
    created_at: datetime
    updated_at: datetime

    phone_number: str | None = None
    telegram_chat_id: str | None = None
    avatar_url: str | None = None
    caregiver_id: UUID | None = None
    caregiver_relationship: str | None = None
    preferred_channel: str | None = None
    caregiver_is_primary: bool = False
