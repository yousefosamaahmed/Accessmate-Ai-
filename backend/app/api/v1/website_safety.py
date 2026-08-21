import logging
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.website_check import WebsiteCheck
from app.models.trusted_domain import TrustedDomain
from app.repositories.ai_interaction_repository import (
    AIInteractionRepository,
)
from app.repositories.website_check_repository import (
    WebsiteCheckRepository,
)
from app.repositories.trusted_domain_repository import (
    TrustedDomainRepository,
)
from app.schemas.website_check_schema import (
    WebsiteCheckResponse,
)
from app.schemas.website_safety_schema import (
    WebsiteSafetyCheckRequest,
    WebsiteSafetyCheckResponse,
)
from app.schemas.trusted_domain_schema import (
    TrustedDomainCreate,
    TrustedDomainResponse,
    TrustedDomainUpdate,
)
from app.services.website_safety_service import (
    WebsiteSafetyService,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/website-safety",
    tags=["Website Safety"],
)


# ============================================================
# HELPERS
# ============================================================


def apply_user_trusted_domain(
    result: dict,
    trusted_domain: TrustedDomain | None,
) -> dict:
    """
    Add the authenticated user's trusted-domain information
    to the Website Safety result.

    Important:
    Trust NEVER overrides malware/phishing detection.

    Example:
        trusted domain + known threat
        -> remains dangerous / block
    """

    if trusted_domain is None:
        return result

    official_domain = result.get(
        "official_domain"
    )

    if not isinstance(
        official_domain,
        dict,
    ):
        official_domain = {}

    official_domain = dict(
        official_domain
    )

    # Mark it as trusted by this specific user.
    official_domain[
        "is_trusted_domain"
    ] = True

    # If it is already an official globally-known domain,
    # keep the "official" status.
    #
    # Otherwise mark it as user-trusted.
    if not official_domain.get(
        "is_official_domain",
        False,
    ):
        official_domain[
            "status"
        ] = "trusted"

    # Use the user's metadata only where the safety engine
    # did not already identify a stronger official brand.
    if not official_domain.get(
        "brand"
    ):
        official_domain[
            "brand"
        ] = trusted_domain.brand_name

    if not official_domain.get(
        "official_root_domain"
    ):
        official_domain[
            "official_root_domain"
        ] = trusted_domain.official_domain

    result[
        "official_domain"
    ] = official_domain

    # --------------------------------------------------------
    # ADD AN INFORMATIONAL SIGNAL
    # --------------------------------------------------------

    signals = result.get(
        "signals",
        [],
    )

    if not isinstance(
        signals,
        list,
    ):
        signals = []

    already_added = any(
        isinstance(
            signal,
            dict,
        )
        and signal.get(
            "signal"
        )
        == "user_trusted_domain"
        for signal in signals
    )

    if not already_added:
        signals.append(
            {
                "signal": (
                    "user_trusted_domain"
                ),
                "severity": "info",
                "description": (
                    "This domain is in the "
                    "authenticated user's trusted "
                    "domain list."
                ),
                "source": (
                    "user_trusted_domains"
                ),
            }
        )

    result[
        "signals"
    ] = signals

    # --------------------------------------------------------
    # SECURITY RULE
    # --------------------------------------------------------
    #
    # DO NOT modify:
    #
    # risk_score
    # risk_level
    # is_known_threat
    # recommended_action
    #
    # A user-trusted domain can still become compromised.

    return result


def safe_log_ai_interaction(
    db: Session,
    current_user: User,
    request_data: WebsiteSafetyCheckRequest,
    result: dict,
    website_check_id: str | None = None,
) -> None:
    """
    AI audit logging is secondary.

    Failure here must not break the Website Safety response
    or delete the WebsiteCheck that was already persisted.
    """

    try:
        signals = result.get(
            "signals",
            [],
        )

        if not isinstance(
            signals,
            list,
        ):
            signals = []

        threat_intelligence = (
            result.get(
                "threat_intelligence",
                {},
            )
        )

        if not isinstance(
            threat_intelligence,
            dict,
        ):
            threat_intelligence = {}

        official_domain = result.get(
            "official_domain",
            {},
        )

        if not isinstance(
            official_domain,
            dict,
        ):
            official_domain = {}

        provider_statuses = []

        for source in (
            threat_intelligence.get(
                "sources",
                [],
            )
        ):
            if not isinstance(
                source,
                dict,
            ):
                continue

            provider_statuses.append(
                {
                    "provider": (
                        source.get(
                            "provider"
                        )
                    ),
                    "status": (
                        source.get(
                            "status"
                        )
                    ),
                    "matched": (
                        source.get(
                            "matched"
                        )
                    ),
                    "threat_types": (
                        source.get(
                            "threat_types",
                            [],
                        )
                    ),
                }
            )

        repository = (
            AIInteractionRepository(
                db
            )
        )

        repository.create_interaction(
            user_id=current_user.id,
            feature="website_safety",
            request_type="check",
            input_text=request_data.url,
            output_text=(
                result.get(
                    "simple_explanation"
                )
                or result.get(
                    "recommendation"
                )
                or result.get(
                    "verdict"
                )
            ),
            provider=(
                "local_plus_community_"
                "threat_intelligence_plus_llm"
            ),
            model_name=(
                result.get(
                    "engine_version"
                )
                or "website_safety_v3"
            ),
            status="success",

            # risk_score is NOT a probability/confidence.
            confidence=None,

            is_voice_friendly=(
                request_data.voice_friendly
            ),
            should_speak=False,

            metadata_json={
                "endpoint": (
                    "/api/v1/"
                    "website-safety/check"
                ),

                "website_check_id": (
                    website_check_id
                ),

                "input_url": (
                    result.get(
                        "input_url"
                    )
                ),

                "normalized_url": (
                    result.get(
                        "normalized_url"
                    )
                ),

                "domain": (
                    result.get(
                        "domain"
                    )
                ),

                "registrable_domain": (
                    result.get(
                        "registrable_domain"
                    )
                ),

                "scheme": (
                    result.get(
                        "scheme"
                    )
                ),

                "risk_score": (
                    result.get(
                        "risk_score"
                    )
                ),

                "risk_level": (
                    result.get(
                        "risk_level"
                    )
                ),

                "verdict": (
                    result.get(
                        "verdict"
                    )
                ),

                "is_potentially_risky": (
                    result.get(
                        "is_potentially_risky"
                    )
                ),

                "is_known_threat": (
                    result.get(
                        "is_known_threat"
                    )
                ),

                "recommended_action": (
                    result.get(
                        "recommended_action"
                    )
                ),

                "brand": (
                    official_domain.get(
                        "brand"
                    )
                ),

                "official_root_domain": (
                    official_domain.get(
                        "official_root_domain"
                    )
                ),

                "is_official_domain": (
                    official_domain.get(
                        "is_official_domain"
                    )
                ),

                "is_trusted_domain": (
                    official_domain.get(
                        "is_trusted_domain"
                    )
                ),

                "is_possible_impersonation": (
                    official_domain.get(
                        "is_possible_impersonation"
                    )
                ),

                "provider_statuses": (
                    provider_statuses
                ),

                "signals_count": len(
                    signals
                ),

                "signals": signals,

                "language": (
                    request_data.language
                ),

                "explanation_level": (
                    request_data
                    .explanation_level
                ),

                "engine_version": (
                    result.get(
                        "engine_version"
                    )
                ),
            },
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to store Website Safety "
            "AI interaction audit."
        )


# ============================================================
# WEBSITE SAFETY CHECK
# ============================================================


@router.post(
    "/check",
    response_model=WebsiteSafetyCheckResponse,
)
def check_website_safety(
    request_data: WebsiteSafetyCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    # --------------------------------------------------------
    # STEP 1
    # RUN WEBSITE SAFETY V3
    # --------------------------------------------------------

    service = WebsiteSafetyService()

    try:
        result = service.check_url(
            url=request_data.url,
            language=(
                request_data.language
            ),
            explanation_level=(
                request_data
                .explanation_level
            ),
            voice_friendly=(
                request_data
                .voice_friendly
            ),
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        )

    except Exception as error:
        logger.exception(
            "Website Safety engine failed."
        )

        error_text = str(
            error
        )

        if (
            "RateLimitError"
            in error_text
            or "rate_limit"
            in error_text.lower()
            or "too many requests"
            in error_text.lower()
            or "429"
            in error_text
        ):
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "A Website Safety dependency "
                    "is temporarily rate-limited. "
                    "Please try again shortly."
                ),
            )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Website Safety service is "
                "temporarily unavailable."
            ),
        )

    # --------------------------------------------------------
    # STEP 2
    # USER TRUSTED DOMAIN LOOKUP
    # --------------------------------------------------------

    try:
        trusted_domain_repository = (
            TrustedDomainRepository(
                db
            )
        )

        trusted_domain = (
            trusted_domain_repository
            .get_matching_trusted_domain_for_user(
                user_id=(
                    current_user.id
                ),
                hostname=str(
                    result.get(
                        "domain"
                    )
                    or ""
                ),
            )
        )

        result = apply_user_trusted_domain(
            result=result,
            trusted_domain=trusted_domain,
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Trusted-domain lookup failed."
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Website analysis completed, "
                "but trusted-domain verification "
                "could not be completed."
            ),
        )

    # --------------------------------------------------------
    # STEP 3
    # PERSIST WEBSITE CHECK
    # --------------------------------------------------------

    try:
        website_check_repository = (
            WebsiteCheckRepository(
                db
            )
        )

        website_check = (
            website_check_repository
            .create_from_safety_result(
                user_id=(
                    current_user.id
                ),
                result=result,
            )
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Website Safety result could not "
            "be persisted."
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Website Safety analysis "
                "completed, but the result "
                "could not be saved."
            ),
        )

    # --------------------------------------------------------
    # STEP 4
    # SECONDARY AI AUDIT
    # --------------------------------------------------------

    safe_log_ai_interaction(
        db=db,
        current_user=current_user,
        request_data=request_data,
        result=result,
        website_check_id=str(
            website_check.id
        ),
    )

    # --------------------------------------------------------
    # STEP 5
    # RETURN RESULT
    # --------------------------------------------------------

    return WebsiteSafetyCheckResponse(
        **result
    )


# ============================================================
# WEBSITE CHECK HISTORY
# ============================================================


@router.get(
    "/history",
    response_model=list[
        WebsiteCheckResponse
    ],
)
def get_my_website_safety_history(
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        WebsiteCheckRepository(
            db
        )
    )

    return (
        repository
        .get_website_checks_by_user_id(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    )


@router.get(
    "/history/{check_id}",
    response_model=WebsiteCheckResponse,
)
def get_my_website_safety_check(
    check_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        WebsiteCheckRepository(
            db
        )
    )

    website_check = (
        repository
        .get_website_check_by_id_for_user(
            check_id=check_id,
            user_id=current_user.id,
        )
    )

    if website_check is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Website check not found."
            ),
        )

    return website_check


@router.delete(
    "/history/{check_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_website_safety_check(
    check_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        WebsiteCheckRepository(
            db
        )
    )

    website_check = (
        repository
        .get_website_check_by_id_for_user(
            check_id=check_id,
            user_id=current_user.id,
        )
    )

    if website_check is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Website check not found."
            ),
        )

    repository.delete_website_check(
        website_check
    )

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )


# ============================================================
# TRUSTED DOMAINS
# ============================================================


@router.get(
    "/trusted-domains",
    response_model=list[
        TrustedDomainResponse
    ],
)
def get_my_trusted_domains(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        TrustedDomainRepository(
            db
        )
    )

    return (
        repository
        .get_trusted_domains_by_user_id(
            current_user.id
        )
    )


@router.post(
    "/trusted-domains",
    response_model=TrustedDomainResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_trusted_domain(
    domain_data: TrustedDomainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        TrustedDomainRepository(
            db
        )
    )

    existing = (
        repository
        .get_trusted_domain_by_domain_for_user(
            official_domain=(
                domain_data.official_domain
            ),
            user_id=current_user.id,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "This domain is already "
                "in your trusted list."
            ),
        )

    try:
        return (
            repository
            .create_trusted_domain(
                user_id=(
                    current_user.id
                ),
                domain_data=domain_data,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(error),
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to create trusted domain."
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Trusted domain could not "
                "be created."
            ),
        )


@router.patch(
    "/trusted-domains/{domain_id}",
    response_model=TrustedDomainResponse,
)
def update_my_trusted_domain(
    domain_id: UUID,
    domain_data: TrustedDomainUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        TrustedDomainRepository(
            db
        )
    )

    trusted_domain = (
        repository
        .get_trusted_domain_by_id_for_user(
            domain_id=domain_id,
            user_id=current_user.id,
        )
    )

    if trusted_domain is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Trusted domain not found."
            ),
        )

    # --------------------------------------------------------
    # DUPLICATE DOMAIN CHECK
    # --------------------------------------------------------

    if (
        domain_data.official_domain
        is not None
    ):
        existing = (
            repository
            .get_trusted_domain_by_domain_for_user(
                official_domain=(
                    domain_data
                    .official_domain
                ),
                user_id=current_user.id,
            )
        )

        if (
            existing is not None
            and existing.id
            != trusted_domain.id
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "This domain is already "
                    "in your trusted list."
                ),
            )

    try:
        return (
            repository
            .update_trusted_domain(
                trusted_domain=(
                    trusted_domain
                ),
                domain_data=domain_data,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(error),
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to update trusted domain."
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Trusted domain could not "
                "be updated."
            ),
        )


@router.delete(
    "/trusted-domains/{domain_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_trusted_domain(
    domain_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    repository = (
        TrustedDomainRepository(
            db
        )
    )

    trusted_domain = (
        repository
        .get_trusted_domain_by_id_for_user(
            domain_id=domain_id,
            user_id=current_user.id,
        )
    )

    if trusted_domain is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Trusted domain not found."
            ),
        )

    repository.delete_trusted_domain(
        trusted_domain
    )

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )