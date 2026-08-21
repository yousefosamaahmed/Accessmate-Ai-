from typing import List, Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.trusted_domain import TrustedDomain
from app.schemas.trusted_domain_schema import (
    TrustedDomainCreate,
    TrustedDomainUpdate,
)


class TrustedDomainRepository:
    def __init__(self, db: Session):
        self.db = db

    # ========================================================
    # INTERNAL HELPERS
    # ========================================================

    def _commit_and_refresh(
        self,
        trusted_domain: TrustedDomain,
    ) -> TrustedDomain:
        try:
            self.db.commit()
            self.db.refresh(trusted_domain)

            return trusted_domain

        except Exception:
            self.db.rollback()
            raise

    def _normalize_domain(
        self,
        domain: str,
    ) -> str:
        """
        Normalize a hostname/domain for comparisons.

        The Pydantic schema already validates create/update payloads.
        This helper is for repository lookup methods that receive a
        plain string.
        """

        clean_domain = str(
            domain or ""
        ).strip().lower()

        clean_domain = (
            clean_domain
            .removeprefix("https://")
            .removeprefix("http://")
        )

        clean_domain = (
            clean_domain
            .split("/", 1)[0]
            .split("?", 1)[0]
            .split("#", 1)[0]
            .rstrip(".")
        )

        if ":" in clean_domain:
            hostname, _, port = (
                clean_domain.rpartition(":")
            )

            if (
                hostname
                and port.isdigit()
            ):
                clean_domain = hostname

        return clean_domain

    # ========================================================
    # CREATE
    # ========================================================

    def create_trusted_domain(
        self,
        user_id: UUID,
        domain_data: TrustedDomainCreate,
    ) -> TrustedDomain:
        """
        Create a trusted domain owned by the authenticated user.

        user_id is supplied by the backend, never trusted from
        the client payload.
        """

        trusted_domain = TrustedDomain(
            user_id=user_id,
            **domain_data.model_dump(),
        )

        try:
            self.db.add(
                trusted_domain
            )

            return self._commit_and_refresh(
                trusted_domain
            )

        except IntegrityError as error:
            self.db.rollback()

            raise ValueError(
                "This domain is already trusted by this user."
            ) from error

        except Exception:
            self.db.rollback()
            raise

    # ========================================================
    # READ
    # ========================================================

    def get_trusted_domain_by_id(
        self,
        domain_id: UUID,
    ) -> Optional[TrustedDomain]:
        """
        Internal unrestricted lookup.

        User-facing routes should normally use
        get_trusted_domain_by_id_for_user().
        """

        return (
            self.db.query(
                TrustedDomain
            )
            .filter(
                TrustedDomain.id
                == domain_id
            )
            .first()
        )

    def get_trusted_domain_by_id_for_user(
        self,
        domain_id: UUID,
        user_id: UUID,
    ) -> Optional[TrustedDomain]:
        """
        Ownership-safe lookup.
        """

        return (
            self.db.query(
                TrustedDomain
            )
            .filter(
                TrustedDomain.id
                == domain_id,
                TrustedDomain.user_id
                == user_id,
            )
            .first()
        )

    def get_trusted_domain_by_domain_for_user(
        self,
        official_domain: str,
        user_id: UUID,
    ) -> Optional[TrustedDomain]:
        clean_domain = self._normalize_domain(
            official_domain
        )

        if not clean_domain:
            return None

        return (
            self.db.query(
                TrustedDomain
            )
            .filter(
                TrustedDomain.user_id
                == user_id,
                TrustedDomain.official_domain
                == clean_domain,
            )
            .first()
        )

    def get_trusted_domains_by_user_id(
        self,
        user_id: UUID,
    ) -> List[TrustedDomain]:
        return (
            self.db.query(
                TrustedDomain
            )
            .filter(
                TrustedDomain.user_id
                == user_id
            )
            .order_by(
                TrustedDomain.created_at.desc()
            )
            .all()
        )

    def get_matching_trusted_domain_for_user(
        self,
        user_id: UUID,
        hostname: str,
    ) -> Optional[TrustedDomain]:
        """
        Find whether a hostname is covered by one of the user's
        trusted domains.

        Example:
            trusted: example.com

            example.com             -> match
            accounts.example.com    -> match
            example.com.evil.com    -> no match
        """

        clean_hostname = self._normalize_domain(
            hostname
        )

        if not clean_hostname:
            return None

        trusted_domains = (
            self.get_trusted_domains_by_user_id(
                user_id
            )
        )

        for trusted_domain in trusted_domains:
            trusted_root = self._normalize_domain(
                trusted_domain.official_domain
            )

            if not trusted_root:
                continue

            if (
                clean_hostname
                == trusted_root
            ):
                return trusted_domain

            if clean_hostname.endswith(
                f".{trusted_root}"
            ):
                return trusted_domain

        return None

    def is_domain_trusted_for_user(
        self,
        user_id: UUID,
        hostname: str,
    ) -> bool:
        return (
            self.get_matching_trusted_domain_for_user(
                user_id=user_id,
                hostname=hostname,
            )
            is not None
        )

    # ========================================================
    # UPDATE
    # ========================================================

    def update_trusted_domain(
        self,
        trusted_domain: TrustedDomain,
        domain_data: TrustedDomainUpdate,
    ) -> TrustedDomain:
        update_data = (
            domain_data.model_dump(
                exclude_unset=True
            )
        )

        for field, value in (
            update_data.items()
        ):
            setattr(
                trusted_domain,
                field,
                value,
            )

        try:
            return self._commit_and_refresh(
                trusted_domain
            )

        except IntegrityError as error:
            self.db.rollback()

            raise ValueError(
                "This domain is already trusted by this user."
            ) from error

        except Exception:
            self.db.rollback()
            raise

    # ========================================================
    # DELETE
    # ========================================================

    def delete_trusted_domain(
        self,
        trusted_domain: TrustedDomain,
    ) -> bool:
        try:
            self.db.delete(
                trusted_domain
            )

            self.db.commit()

            return True

        except Exception:
            self.db.rollback()
            raise