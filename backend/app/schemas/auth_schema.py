from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone_number: str | None = Field(default=None, max_length=30)
    telegram_chat_id: str | None = Field(default=None, max_length=80)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return value

    @field_validator("phone_number", "telegram_chat_id")
    @classmethod
    def empty_string_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    requires_email_otp: bool = False
    email_verification_token: str | None = None
    requires_2fa: bool = False
    two_factor_token: str | None = None
    message: str | None = None


class EmailOtpVerifyLoginRequest(BaseModel):
    email_verification_token: str = Field(..., min_length=10)
    code: str = Field(..., min_length=4, max_length=10)

    @field_validator("code")
    @classmethod
    def clean_code(cls, value: str) -> str:
        value = value.strip().replace(" ", "")
        if not value.isdigit():
            raise ValueError("Verification code must contain digits only.")
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetRequestResponse(BaseModel):
    password_reset_token: str | None = None
    message: str


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)
    password_reset_token: str

    @field_validator("code")
    @classmethod
    def clean_reset_code(cls, value: str) -> str:
        value = value.strip().replace(" ", "")
        if not value.isdigit():
            raise ValueError("Reset code must contain digits only.")
        return value


class GenericMessageResponse(BaseModel):
    message: str


class TwoFactorSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    message: str | None = None


class TwoFactorConfirmRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class TwoFactorConfirmResponse(BaseModel):
    is_2fa_enabled: bool
    message: str


class TwoFactorVerifyLoginRequest(BaseModel):
    two_factor_token: str
    code: str = Field(..., min_length=6, max_length=8)


class TwoFactorDisableRequest(BaseModel):
    password: str
    code: str = Field(..., min_length=6, max_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr
    phone_number: str | None = None
    telegram_chat_id: str | None = None
    is_active: bool = True
    is_2fa_enabled: bool = False
    created_at: datetime | None = None