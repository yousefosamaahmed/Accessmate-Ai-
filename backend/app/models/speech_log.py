import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class SpeechLog(Base):
    __tablename__ = "speech_logs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    audio_input_path = Column(
        Text,
        nullable=True
    )

    transcript = Column(
        Text,
        nullable=True
    )

    detected_language = Column(
        String(20),
        default="unknown",
        nullable=False            
    )

    confidence = Column(
        Numeric(5, 4),
        nullable=True
    )

    tts_output_path = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="speech_logs"
    )