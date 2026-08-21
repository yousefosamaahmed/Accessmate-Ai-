import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as db_relationship
from sqlalchemy.sql import func

from app.database import Base


class HearingSoundEvent(Base):
    __tablename__ = "hearing_sound_events"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "client_id",
            name="uq_hearing_sound_event_user_client",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hearing_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    care_alert_id = Column(
        UUID(as_uuid=True),
        ForeignKey("care_alerts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    client_id = Column(
        String(120),
        nullable=False,
    )

    category = Column(
        String(40),
        nullable=False,
        index=True,
    )

    label = Column(
        String(160),
        nullable=False,
    )

    confidence = Column(
        Numeric(5, 4),
        nullable=False,
    )

    threshold = Column(
        Numeric(5, 4),
        nullable=False,
    )

    model = Column(
        String(160),
        nullable=False,
        default="yamnet",
    )

    is_critical = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session = db_relationship(
        "HearingSession",
        back_populates="sound_events",
    )
