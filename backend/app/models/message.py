import uuid
from sqlalchemy import Column, String, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False
    )

    role = Column(
        String(50),
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    structured_response_json = Column(      # رد منظم مثل summary / steps / sources
        JSONB,
        nullable=True
    )

    audio_url = Column(
        Text,
        nullable=True
    )

    assistant_language = Column(
        String(10),
        default="ar",
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable= False
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )