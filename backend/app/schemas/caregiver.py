from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class CaregiverBase(BaseModel):
    full_name: str
    relationship: str | None = None

    phone_number: str | None = None
    telegram_chat_id: str | None = None
    whatsapp_number: str | None = None

    preferred_channel: str = "telegram"

    is_primary: bool = False
    is_active: bool = True


class CaregiverCreate(CaregiverBase):
    @model_validator(mode="after")
    def validate_contact_method(self):
        if not self.phone_number and not self.telegram_chat_id and not self.whatsapp_number:
            raise ValueError("At least one contact method is required.")
        return self


class CaregiverUpdate(BaseModel):
    full_name: str | None = None
    relationship: str | None = None

    phone_number: str | None = None
    telegram_chat_id: str | None = None
    whatsapp_number: str | None = None

    preferred_channel: str | None = None

    is_primary: bool | None = None
    is_active: bool | None = None


class CaregiverOut(CaregiverBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)