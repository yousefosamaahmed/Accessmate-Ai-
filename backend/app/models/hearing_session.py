import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as db_relationship
from sqlalchemy.sql import func

from app.database import Base


class HearingSession(Base):
    __tablename__ = "hearing_sessions"

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

    language = Column(
        String(10),
        nullable=False,
        default="en",
    )

    translation_enabled = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    translation_target = Column(
        String(10),
        nullable=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="saved",
        index=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    captions = db_relationship(
        "HearingCaption",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="HearingCaption.sequence.asc(), HearingCaption.created_at.asc()",
    )

    sound_events = db_relationship(
        "HearingSoundEvent",
        back_populates="session",
        passive_deletes=True,
    )
