from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


CareAlertStatus = Literal[
    "pending",
    "sent",
    "acknowledged",
    "resolved",
    "failed",
]


class CareAlertBase(BaseModel):
    caregiver_id: UUID | None = None
    daily_need_action_id: UUID | None = None

    alert_type: str = "daily_need"
    intent: str
    message: str

    channel: str = "telegram"

    risk_level: str = "low"

    confidence: Decimal | None = Field(
        default=None,
        ge=0,
        le=1,
    )

    source: str = "careboard"

    confirmed_by_user: bool = False


class CareAlertCreate(CareAlertBase):
    """
    Client payload used to create a new alert.

    The backend owns lifecycle fields such as:
    status,
    sent_at,
    acknowledged_at,
    resolved_at,
    error_message.
    """

    pass


class CareAlertUpdate(BaseModel):
    caregiver_id: UUID | None = None
    daily_need_action_id: UUID | None = None

    alert_type: str | None = None
    intent: str | None = None
    message: str | None = None

    channel: str | None = None

    risk_level: str | None = None

    confidence: Decimal | None = Field(
        default=None,
        ge=0,
        le=1,
    )

    source: str | None = None

    confirmed_by_user: bool | None = None


class CareAlertOut(CareAlertBase):
    id: UUID
    user_id: UUID

    status: CareAlertStatus

    error_message: str | None = None

    sent_at: datetime | None = None
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )