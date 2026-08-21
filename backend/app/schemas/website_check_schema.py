from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# BASE
# ============================================================


class WebsiteCheckBase(BaseModel):
    # --------------------------------------------------------
    # URL IDENTITY
    # --------------------------------------------------------

    url: str = Field(
        ...,
        min_length=3,
        max_length=4096,
    )

    normalized_url: str | None = None

    domain: str | None = Field(
        default=None,
        max_length=255,
    )

    registrable_domain: str | None = Field(
        default=None,
        max_length=255,
    )

    scheme: str | None = Field(
        default=None,
        max_length=20,
    )

    # --------------------------------------------------------
    # RISK RESULT
    # --------------------------------------------------------

    status: str | None = Field(
        default=None,
        max_length=50,
    )

    risk_score: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )

    risk_level: str | None = Field(
        default=None,
        max_length=50,
    )

    is_potentially_risky: bool | None = None

    is_known_threat: bool | None = None

    action: str | None = Field(
        default=None,
        max_length=50,
    )

    verdict: str | None = None

    recommendation: str | None = None

    simple_explanation: str | None = None

    # --------------------------------------------------------
    # OFFICIAL DOMAIN / IMPERSONATION
    # --------------------------------------------------------

    expected_domain: str | None = Field(
        default=None,
        max_length=255,
    )

    brand: str | None = Field(
        default=None,
        max_length=100,
    )

    official_root_domain: str | None = Field(
        default=None,
        max_length=255,
    )

    is_official_domain: bool | None = None

    is_trusted_domain: bool | None = None

    is_possible_impersonation: bool | None = None

    similarity_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    official_domain: dict[str, Any] | None = None

    # --------------------------------------------------------
    # THREAT INTELLIGENCE
    # --------------------------------------------------------

    threat_intelligence: dict[str, Any] | None = None

    # --------------------------------------------------------
    # SECURITY SIGNALS
    # --------------------------------------------------------

    signals: list[
        dict[str, Any]
    ] | None = None

    reason: str | None = None

    # --------------------------------------------------------
    # ACCESSIBILITY
    # --------------------------------------------------------

    language: str | None = Field(
        default="en",
        max_length=20,
    )

    explanation_level: str | None = Field(
        default="simple",
        max_length=50,
    )

    voice_friendly: bool | None = True

    # --------------------------------------------------------
    # ENGINE METADATA
    # --------------------------------------------------------

    engine_version: str | None = Field(
        default=None,
        max_length=100,
    )


# ============================================================
# CREATE
# ============================================================


class WebsiteCheckCreate(WebsiteCheckBase):
    user_id: UUID

    domain: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    status: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    risk_score: int = Field(
        ...,
        ge=0,
        le=100,
    )

    action: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    is_potentially_risky: bool = False

    is_known_threat: bool = False

    is_official_domain: bool = False

    is_trusted_domain: bool = False

    is_possible_impersonation: bool = False

    language: str = Field(
        default="en",
        max_length=20,
    )

    explanation_level: str = Field(
        default="simple",
        max_length=50,
    )

    voice_friendly: bool = True


# ============================================================
# UPDATE
# ============================================================


class WebsiteCheckUpdate(BaseModel):
    url: str | None = Field(
        default=None,
        min_length=3,
        max_length=4096,
    )

    normalized_url: str | None = None

    domain: str | None = Field(
        default=None,
        max_length=255,
    )

    registrable_domain: str | None = Field(
        default=None,
        max_length=255,
    )

    scheme: str | None = Field(
        default=None,
        max_length=20,
    )

    status: str | None = Field(
        default=None,
        max_length=50,
    )

    risk_score: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )

    risk_level: str | None = Field(
        default=None,
        max_length=50,
    )

    is_potentially_risky: bool | None = None

    is_known_threat: bool | None = None

    action: str | None = Field(
        default=None,
        max_length=50,
    )

    verdict: str | None = None

    recommendation: str | None = None

    simple_explanation: str | None = None

    expected_domain: str | None = Field(
        default=None,
        max_length=255,
    )

    brand: str | None = Field(
        default=None,
        max_length=100,
    )

    official_root_domain: str | None = Field(
        default=None,
        max_length=255,
    )

    is_official_domain: bool | None = None

    is_trusted_domain: bool | None = None

    is_possible_impersonation: bool | None = None

    similarity_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    official_domain: dict[str, Any] | None = None

    threat_intelligence: dict[str, Any] | None = None

    signals: list[
        dict[str, Any]
    ] | None = None

    reason: str | None = None

    language: str | None = Field(
        default=None,
        max_length=20,
    )

    explanation_level: str | None = Field(
        default=None,
        max_length=50,
    )

    voice_friendly: bool | None = None

    engine_version: str | None = Field(
        default=None,
        max_length=100,
    )


# ============================================================
# RESPONSE
# ============================================================


class WebsiteCheckResponse(WebsiteCheckBase):
    id: UUID

    user_id: UUID

    checked_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )