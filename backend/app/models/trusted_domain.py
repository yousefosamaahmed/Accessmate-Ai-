import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class TrustedDomain(Base):
    __tablename__ = "trusted_domains"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "official_domain",
            name="uq_trusted_domains_user_domain",
        ),
    )

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ========================================================
    # USER OWNERSHIP
    # ========================================================

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # DOMAIN
    # ========================================================

    brand_name = Column(
        String(150),
        nullable=False,
    )

    official_domain = Column(
        String(255),
        nullable=False,
        index=True,
    )

    category = Column(
        String(100),
        nullable=True,
    )

    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )