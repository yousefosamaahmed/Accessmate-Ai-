from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ============================================================
# BASE
# ============================================================


class TrustedDomainBase(BaseModel):
    brand_name: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    official_domain: str = Field(
        ...,
        min_length=3,
        max_length=255,
    )

    category: str | None = Field(
        default=None,
        max_length=100,
    )

    # --------------------------------------------------------
    # NORMALIZATION
    # --------------------------------------------------------

    @field_validator("brand_name")
    @classmethod
    def normalize_brand_name(
        cls,
        value: str,
    ) -> str:
        cleaned = " ".join(
            str(value).strip().split()
        )

        if not cleaned:
            raise ValueError(
                "Brand name is required."
            )

        return cleaned

    @field_validator("official_domain")
    @classmethod
    def normalize_official_domain(
        cls,
        value: str,
    ) -> str:
        cleaned = str(
            value
        ).strip().lower()

        # Remove common accidental URL prefixes.
        if cleaned.startswith(
            "https://"
        ):
            cleaned = cleaned[
                len("https://"):
            ]

        elif cleaned.startswith(
            "http://"
        ):
            cleaned = cleaned[
                len("http://"):
            ]

        # We store only the domain, not path/query/fragment.
        cleaned = (
            cleaned
            .split("/", 1)[0]
            .split("?", 1)[0]
            .split("#", 1)[0]
            .rstrip(".")
        )

        # Remove accidental credentials / port handling
        # is deliberately conservative here.
        if "@" in cleaned:
            raise ValueError(
                "Trusted domain must not contain credentials."
            )

        # IPv6 brackets should not be accepted as a trusted
        # public domain in this feature.
        if (
            cleaned.startswith("[")
            or cleaned.endswith("]")
        ):
            raise ValueError(
                "Trusted domain must be a normal domain name."
            )

        # Strip an ordinary port if one was pasted.
        if ":" in cleaned:
            hostname, _, port = (
                cleaned.rpartition(":")
            )

            if (
                hostname
                and port.isdigit()
            ):
                cleaned = hostname

        if not cleaned:
            raise ValueError(
                "Official domain is required."
            )

        if " " in cleaned:
            raise ValueError(
                "Official domain cannot contain spaces."
            )

        if "." not in cleaned:
            raise ValueError(
                "Enter a complete domain such as example.com."
            )

        labels = cleaned.split(".")

        for label in labels:
            if not label:
                raise ValueError(
                    "Official domain is invalid."
                )

            if len(label) > 63:
                raise ValueError(
                    "A domain label is too long."
                )

            if (
                label.startswith("-")
                or label.endswith("-")
            ):
                raise ValueError(
                    "Domain labels cannot start or end with '-'."
                )

            allowed = set(
                "abcdefghijklmnopqrstuvwxyz"
                "0123456789-"
            )

            if not set(label).issubset(
                allowed
            ):
                raise ValueError(
                    "Official domain contains invalid characters."
                )

        return cleaned

    @field_validator("category")
    @classmethod
    def normalize_category(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = " ".join(
            str(value).strip().split()
        )

        return cleaned or None


# ============================================================
# CREATE
# ============================================================


class TrustedDomainCreate(
    TrustedDomainBase
):
    """
    Client-facing create payload.

    user_id is intentionally NOT accepted from the client.
    The backend will always use current_user.id.
    """

    pass


# ============================================================
# UPDATE
# ============================================================


class TrustedDomainUpdate(
    BaseModel
):
    brand_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    official_domain: str | None = Field(
        default=None,
        min_length=3,
        max_length=255,
    )

    category: str | None = Field(
        default=None,
        max_length=100,
    )

    @field_validator("brand_name")
    @classmethod
    def normalize_brand_name(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = " ".join(
            str(value).strip().split()
        )

        if not cleaned:
            raise ValueError(
                "Brand name cannot be empty."
            )

        return cleaned

    @field_validator("official_domain")
    @classmethod
    def normalize_official_domain(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        # Reuse the exact create validation.
        validated = (
            TrustedDomainBase(
                brand_name="validation",
                official_domain=value,
            )
        )

        return validated.official_domain

    @field_validator("category")
    @classmethod
    def normalize_category(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = " ".join(
            str(value).strip().split()
        )

        return cleaned or None


# ============================================================
# RESPONSE
# ============================================================


class TrustedDomainResponse(
    TrustedDomainBase
):
    id: UUID

    user_id: UUID

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )