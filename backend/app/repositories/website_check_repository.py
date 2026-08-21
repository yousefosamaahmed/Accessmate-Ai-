from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.website_check import WebsiteCheck
from app.schemas.website_check_schema import (
    WebsiteCheckCreate,
    WebsiteCheckUpdate,
)


class WebsiteCheckRepository:
    def __init__(self, db: Session):
        self.db = db

    # ========================================================
    # INTERNAL HELPERS
    # ========================================================

    def _commit_and_refresh(
        self,
        website_check: WebsiteCheck,
    ) -> WebsiteCheck:
        """
        Commit the current transaction and refresh the object.

        Any database failure rolls the transaction back before
        the exception is propagated to the caller.
        """

        try:
            self.db.commit()
            self.db.refresh(website_check)

            return website_check

        except Exception:
            self.db.rollback()
            raise

    def _derive_reason(
        self,
        result: dict[str, Any],
        signals: list[dict[str, Any]],
    ) -> Optional[str]:
        """
        Build a useful compatibility reason from the V3 result.

        Prefer an explicit reason if one exists. Otherwise use the
        strongest security signal, then fall back to the verdict.
        """

        explicit_reason = result.get("reason")

        if explicit_reason:
            return str(explicit_reason)

        severity_priority = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1,
            "info": 0,
        }

        strongest_signal = None
        strongest_score = -1

        for signal in signals:
            if not isinstance(signal, dict):
                continue

            severity = str(
                signal.get(
                    "severity",
                    "",
                )
            ).lower()

            score = severity_priority.get(
                severity,
                -1,
            )

            description = signal.get(
                "description"
            )

            if (
                description
                and score > strongest_score
            ):
                strongest_score = score
                strongest_signal = str(
                    description
                )

        if strongest_signal:
            return strongest_signal

        verdict = result.get("verdict")

        if verdict:
            return str(verdict)

        return None

    # ========================================================
    # CREATE
    # ========================================================

    def create_website_check(
        self,
        check_data: WebsiteCheckCreate,
    ) -> WebsiteCheck:
        """
        Create a WebsiteCheck from an already validated
        WebsiteCheckCreate schema.
        """

        website_check = WebsiteCheck(
            **check_data.model_dump(
                exclude_none=True
            )
        )

        try:
            self.db.add(website_check)

            return self._commit_and_refresh(
                website_check
            )

        except Exception:
            self.db.rollback()
            raise

    def create_from_safety_result(
        self,
        user_id: UUID,
        result: dict[str, Any],
    ) -> WebsiteCheck:
        """
        Convert a Website Safety V3 result directly into a
        persistent WebsiteCheck row.

        The WebsiteSafetyService remains responsible for security
        analysis. This repository is responsible only for mapping
        and persistence.
        """

        if not isinstance(result, dict):
            raise ValueError(
                "Website safety result must be a dictionary."
            )

        input_url = str(
            result.get("input_url")
            or result.get("normalized_url")
            or ""
        ).strip()

        if not input_url:
            raise ValueError(
                "Website safety result is missing input_url."
            )

        domain = str(
            result.get("domain")
            or ""
        ).strip()

        if not domain:
            raise ValueError(
                "Website safety result is missing domain."
            )

        official_domain = result.get(
            "official_domain"
        )

        if not isinstance(
            official_domain,
            dict,
        ):
            official_domain = {}

        threat_intelligence = result.get(
            "threat_intelligence"
        )

        if not isinstance(
            threat_intelligence,
            dict,
        ):
            threat_intelligence = {}

        signals = result.get(
            "signals"
        )

        if not isinstance(
            signals,
            list,
        ):
            signals = []

        clean_signals: list[
            dict[str, Any]
        ] = [
            signal
            for signal in signals
            if isinstance(
                signal,
                dict,
            )
        ]

        risk_score_raw = result.get(
            "risk_score",
            0,
        )

        try:
            risk_score = int(
                risk_score_raw
            )

        except (
            TypeError,
            ValueError,
        ):
            risk_score = 0

        risk_score = max(
            0,
            min(
                100,
                risk_score,
            ),
        )

        risk_level = str(
            result.get(
                "risk_level"
            )
            or "low"
        ).strip()

        recommended_action = str(
            result.get(
                "recommended_action"
            )
            or "allow"
        ).strip()

        similarity_score = (
            official_domain.get(
                "similarity_score"
            )
        )

        check_data = WebsiteCheckCreate(
            # ------------------------------------------------
            # OWNERSHIP
            # ------------------------------------------------

            user_id=user_id,

            # ------------------------------------------------
            # URL
            # ------------------------------------------------

            url=input_url,

            normalized_url=result.get(
                "normalized_url"
            ),

            domain=domain,

            registrable_domain=result.get(
                "registrable_domain"
            ),

            scheme=result.get(
                "scheme"
            ),

            # ------------------------------------------------
            # RISK
            # ------------------------------------------------

            # Compatibility field.
            status=risk_level,

            risk_score=risk_score,

            risk_level=risk_level,

            is_potentially_risky=bool(
                result.get(
                    "is_potentially_risky",
                    False,
                )
            ),

            is_known_threat=bool(
                result.get(
                    "is_known_threat",
                    False,
                )
            ),

            action=recommended_action,

            verdict=result.get(
                "verdict"
            ),

            recommendation=result.get(
                "recommendation"
            ),

            simple_explanation=result.get(
                "simple_explanation"
            ),

            # ------------------------------------------------
            # OFFICIAL DOMAIN / IMPERSONATION
            # ------------------------------------------------

            expected_domain=(
                official_domain.get(
                    "official_root_domain"
                )
            ),

            brand=official_domain.get(
                "brand"
            ),

            official_root_domain=(
                official_domain.get(
                    "official_root_domain"
                )
            ),

            is_official_domain=bool(
                official_domain.get(
                    "is_official_domain",
                    False,
                )
            ),

            is_trusted_domain=bool(
                official_domain.get(
                    "is_trusted_domain",
                    False,
                )
            ),

            is_possible_impersonation=bool(
                official_domain.get(
                    "is_possible_impersonation",
                    False,
                )
            ),

            similarity_score=(
                similarity_score
            ),

            official_domain=(
                official_domain
            ),

            # ------------------------------------------------
            # THREAT INTELLIGENCE
            # ------------------------------------------------

            threat_intelligence=(
                threat_intelligence
            ),

            # ------------------------------------------------
            # SECURITY SIGNALS
            # ------------------------------------------------

            signals=clean_signals,

            reason=self._derive_reason(
                result=result,
                signals=clean_signals,
            ),

            # ------------------------------------------------
            # ACCESSIBILITY
            # ------------------------------------------------

            language=str(
                result.get(
                    "language"
                )
                or "en"
            ),

            explanation_level=str(
                result.get(
                    "explanation_level"
                )
                or "simple"
            ),

            voice_friendly=bool(
                result.get(
                    "voice_friendly",
                    True,
                )
            ),

            # ------------------------------------------------
            # ENGINE
            # ------------------------------------------------

            engine_version=result.get(
                "engine_version"
            ),
        )

        return self.create_website_check(
            check_data
        )

    # ========================================================
    # READ
    # ========================================================

    def get_website_check_by_id(
        self,
        check_id: UUID,
    ) -> Optional[WebsiteCheck]:
        return (
            self.db.query(
                WebsiteCheck
            )
            .filter(
                WebsiteCheck.id
                == check_id
            )
            .first()
        )

    def get_website_check_by_id_for_user(
        self,
        check_id: UUID,
        user_id: UUID,
    ) -> Optional[WebsiteCheck]:
        """
        Ownership-safe lookup.

        This should be preferred by user-facing endpoints so one
        authenticated user cannot retrieve another user's check.
        """

        return (
            self.db.query(
                WebsiteCheck
            )
            .filter(
                WebsiteCheck.id
                == check_id,
                WebsiteCheck.user_id
                == user_id,
            )
            .first()
        )

    def get_website_checks_by_user_id(
        self,
        user_id: UUID,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[WebsiteCheck]:
        query = (
            self.db.query(
                WebsiteCheck
            )
            .filter(
                WebsiteCheck.user_id
                == user_id
            )
            .order_by(
                WebsiteCheck.checked_at.desc()
            )
        )

        if offset > 0:
            query = query.offset(
                offset
            )

        if limit is not None:
            safe_limit = max(
                1,
                min(
                    int(limit),
                    200,
                ),
            )

            query = query.limit(
                safe_limit
            )

        return query.all()

    def get_latest_website_check_by_user_and_domain(
        self,
        user_id: UUID,
        domain: str,
    ) -> Optional[WebsiteCheck]:
        """
        Return the latest stored check for a domain belonging to
        the current user.
        """

        clean_domain = str(
            domain
        ).strip().lower()

        if not clean_domain:
            return None

        return (
            self.db.query(
                WebsiteCheck
            )
            .filter(
                WebsiteCheck.user_id
                == user_id,
                WebsiteCheck.domain
                == clean_domain,
            )
            .order_by(
                WebsiteCheck.checked_at.desc()
            )
            .first()
        )

    # ========================================================
    # UPDATE
    # ========================================================

    def update_website_check(
        self,
        website_check: WebsiteCheck,
        check_data: WebsiteCheckUpdate,
    ) -> WebsiteCheck:
        update_data = (
            check_data.model_dump(
                exclude_unset=True
            )
        )

        for field, value in (
            update_data.items()
        ):
            setattr(
                website_check,
                field,
                value,
            )

        try:
            return self._commit_and_refresh(
                website_check
            )

        except Exception:
            self.db.rollback()
            raise

    # ========================================================
    # DELETE
    # ========================================================

    def delete_website_check(
        self,
        website_check: WebsiteCheck,
    ) -> bool:
        try:
            self.db.delete(
                website_check
            )

            self.db.commit()

            return True

        except Exception:
            self.db.rollback()
            raise