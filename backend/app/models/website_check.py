import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class WebsiteCheck(Base):
    __tablename__ = "website_checks"

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
    # URL IDENTITY
    # ========================================================

    url = Column(
        Text,
        nullable=False,
    )

    normalized_url = Column(
        Text,
        nullable=True,
    )

    domain = Column(
        String(255),
        nullable=False,
        index=True,
    )

    registrable_domain = Column(
        String(255),
        nullable=True,
        index=True,
    )

    scheme = Column(
        String(20),
        nullable=True,
    )

    # ========================================================
    # RISK RESULT
    # ========================================================

    status = Column(
        String(50),
        nullable=False,
    )

    risk_score = Column(
        Integer,
        nullable=False,
    )

    risk_level = Column(
        String(50),
        nullable=True,
        index=True,
    )

    is_potentially_risky = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_known_threat = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    action = Column(
        String(50),
        nullable=False,
    )

    verdict = Column(
        Text,
        nullable=True,
    )

    recommendation = Column(
        Text,
        nullable=True,
    )

    simple_explanation = Column(
        Text,
        nullable=True,
    )

    # ========================================================
    # OFFICIAL DOMAIN / IMPERSONATION
    # ========================================================

    expected_domain = Column(
        String(255),
        nullable=True,
    )

    brand = Column(
        String(100),
        nullable=True,
        index=True,
    )

    official_root_domain = Column(
        String(255),
        nullable=True,
    )

    is_official_domain = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_trusted_domain = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_possible_impersonation = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    similarity_score = Column(
        Float,
        nullable=True,
    )

    official_domain = Column(
        JSONB,
        nullable=True,
    )

    # ========================================================
    # THREAT INTELLIGENCE
    # ========================================================

    threat_intelligence = Column(
        JSONB,
        nullable=True,
    )

    # ========================================================
    # SECURITY SIGNALS
    # ========================================================

    signals = Column(
        JSONB,
        nullable=True,
    )

    reason = Column(
        Text,
        nullable=True,
    )

    # ========================================================
    # ACCESSIBILITY
    # ========================================================

    language = Column(
        String(20),
        nullable=False,
        default="en",
    )

    explanation_level = Column(
        String(50),
        nullable=False,
        default="simple",
    )

    voice_friendly = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    # ========================================================
    # ENGINE METADATA
    # ========================================================

    engine_version = Column(
        String(100),
        nullable=True,
    )

    # ========================================================
    # TIMESTAMP
    # ========================================================

    checked_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    user = relationship(
        "User",
        back_populates="website_checks",
    )

    conversations = relationship(
        "Conversation",
        back_populates="website_check",
    )