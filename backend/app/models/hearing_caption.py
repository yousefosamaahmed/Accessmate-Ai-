import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as db_relationship
from sqlalchemy.sql import func

from app.database import Base


class HearingCaption(Base):
    __tablename__ = "hearing_captions"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "client_id",
            name="uq_hearing_caption_session_client",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hearing_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    client_id = Column(
        String(120),
        nullable=False,
    )

    sequence = Column(
        Integer,
        nullable=False,
        default=0,
    )

    text = Column(
        Text,
        nullable=False,
    )

    translated_text = Column(
        Text,
        nullable=True,
    )

    detected_language = Column(
        String(10),
        nullable=False,
        default="en",
    )

    translation_target = Column(
        String(10),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session = db_relationship(
        "HearingSession",
        back_populates="captions",
    )
