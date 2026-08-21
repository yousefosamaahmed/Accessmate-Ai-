import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AccessibilityProfile(Base):
    __tablename__ = "accessibility_profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    assistant_language = Column(
        String(10),
        default="ar",
        nullable=False
    )

    detected_spoken_language = Column(
        String(50),
        default="unknown",
        nullable=True
    )

    language_detection_confidence = Column(
        Numeric(5, 4),
        nullable=True
    )

    mode = Column(
        String(100),
        default="simple_explanation",
        nullable=False
    )

    interaction_type = Column(
        String(100),
        default="voice_text",
        nullable=False
    )

    safe_browsing_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    voice_guidance_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    font_size = Column(
        String(30),
        default="normal",
        nullable=False
    )

    high_contrast = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="accessibility_profile"
    )