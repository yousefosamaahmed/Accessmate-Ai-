from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    feature = Column(String(100), nullable=False, index=True)
    request_type = Column(String(100), nullable=False, index=True)

    input_text = Column(Text, nullable=True)
    output_text = Column(Text, nullable=True)

    provider = Column(String(100), nullable=True)
    model_name = Column(String(200), nullable=True)

    status = Column(String(50), nullable=False, default="success", index=True)
    confidence = Column(Float, nullable=True)

    is_voice_friendly = Column(Boolean, nullable=False, default=True)
    should_speak = Column(Boolean, nullable=False, default=False)

    metadata_json = Column(JSONB, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )