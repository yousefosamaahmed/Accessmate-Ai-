from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    full_name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=8)

    # Optional contact fields used to create the first primary caregiver during registration.
    # These are not stored directly on the users table unless you add those columns later.
    phone_number: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8)
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    is_2fa_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
