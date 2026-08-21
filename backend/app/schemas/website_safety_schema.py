from typing import Literal

from pydantic import (
    BaseModel,
    Field,
)


# ============================================================
# SHARED TYPES
# ============================================================

WebsiteSafetyLanguage = Literal[
    "ar",
    "en",
]


WebsiteSafetyRiskLevel = Literal[
    "low",
    "caution",
    "suspicious",
    "dangerous",
]


WebsiteSafetySeverity = Literal[
    "info",
    "low",
    "medium",
    "high",
    "critical",
]


WebsiteSafetyRecommendedAction = Literal[
    "allow",
    "caution",
    "warn",
    "block",
]


WebsiteSafetyOfficialStatus = Literal[
    "unknown",
    "official",
    "trusted",
    "unofficial",
    "possible_impersonation",
]


WebsiteSafetyThreatProviderStatus = Literal[
    "not_checked",
    "clean",
    "matched",
    "unavailable",
    "error",
]


# ============================================================
# REQUEST
# ============================================================


class WebsiteSafetyCheckRequest(BaseModel):
    url: str = Field(
        ...,
        min_length=3,
        max_length=4096,
        description=(
            "Website URL or domain to analyze."
        ),
        examples=[
            "https://accounts.google.com",
            "google.com",
        ],
    )

    language: WebsiteSafetyLanguage = Field(
        default="en",
        description=(
            "Language used for the accessible explanation."
        ),
    )

    explanation_level: str = Field(
        default="simple",
        min_length=1,
        max_length=50,
        description=(
            "Preferred explanation complexity."
        ),
    )

    voice_friendly: bool = Field(
        default=True,
        description=(
            "Whether the result should be easy to understand "
            "when read aloud."
        ),
    )


# ============================================================
# SECURITY SIGNAL
# ============================================================


class WebsiteSafetySignal(BaseModel):
    signal: str = Field(
        ...,
        min_length=1,
        max_length=120,
    )

    severity: WebsiteSafetySeverity

    description: str = Field(
        ...,
        min_length=1,
        max_length=1000,
    )

    source: str = Field(
        default="heuristic",
        description=(
            "Where this security signal came from."
        ),
    )


# ============================================================
# OFFICIAL DOMAIN INFORMATION
# ============================================================


class WebsiteSafetyOfficialDomainInfo(BaseModel):
    status: WebsiteSafetyOfficialStatus = (
        "unknown"
    )

    brand: str | None = None

    official_root_domain: str | None = None

    registrable_domain: str | None = None

    is_official_domain: bool = False

    is_trusted_domain: bool = False

    is_possible_impersonation: bool = False

    similarity_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description=(
            "Similarity to a known official brand domain. "
            "This is not the same as risk confidence."
        ),
    )


# ============================================================
# THREAT INTELLIGENCE
# ============================================================


class WebsiteSafetyThreatIntelligenceSource(
    BaseModel
):
    provider: str

    status: WebsiteSafetyThreatProviderStatus = (
        "not_checked"
    )

    matched: bool = False

    threat_types: list[str] = Field(
        default_factory=list
    )

    details: str | None = None


class WebsiteSafetyThreatIntelligence(
    BaseModel
):
    checked: bool = False

    is_known_threat: bool = False

    sources: list[
        WebsiteSafetyThreatIntelligenceSource
    ] = Field(
        default_factory=list
    )


# ============================================================
# RESPONSE
# ============================================================


class WebsiteSafetyCheckResponse(BaseModel):
    # --------------------------------------------------------
    # URL IDENTITY
    # --------------------------------------------------------

    input_url: str

    normalized_url: str | None = None

    domain: str | None = None

    registrable_domain: str | None = None

    scheme: str | None = None


    # --------------------------------------------------------
    # OFFICIAL / TRUSTED DOMAIN ANALYSIS
    # --------------------------------------------------------

    official_domain: (
        WebsiteSafetyOfficialDomainInfo
    ) = Field(
        default_factory=(
            WebsiteSafetyOfficialDomainInfo
        )
    )


    # --------------------------------------------------------
    # LIVE THREAT INTELLIGENCE
    # --------------------------------------------------------

    threat_intelligence: (
        WebsiteSafetyThreatIntelligence
    ) = Field(
        default_factory=(
            WebsiteSafetyThreatIntelligence
        )
    )


    # --------------------------------------------------------
    # RISK DECISION
    # --------------------------------------------------------

    risk_score: int = Field(
        ...,
        ge=0,
        le=100,
    )

    risk_level: WebsiteSafetyRiskLevel

    verdict: str

    is_potentially_risky: bool

    is_known_threat: bool = False

    recommended_action: (
        WebsiteSafetyRecommendedAction
    ) = "allow"


    # --------------------------------------------------------
    # DETECTION SIGNALS
    # --------------------------------------------------------

    signals: list[
        WebsiteSafetySignal
    ] = Field(
        default_factory=list
    )


    # --------------------------------------------------------
    # USER GUIDANCE
    # --------------------------------------------------------

    recommendation: str

    simple_explanation: str


    # --------------------------------------------------------
    # ACCESSIBILITY
    # --------------------------------------------------------

    language: WebsiteSafetyLanguage

    explanation_level: str

    voice_friendly: bool


    # --------------------------------------------------------
    # ENGINE METADATA
    # --------------------------------------------------------

    engine_version: str = "website_safety_v2"