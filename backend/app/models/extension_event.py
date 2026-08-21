import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ExtensionEvent(Base):
    __tablename__ = "extension_events"

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

    event_type = Column(
        String(50),
        nullable=False
    )

    url = Column(
        Text,
        nullable=True
    )

    domain = Column(
        String(255),
        nullable=True
    )

    payload_json = Column(
        JSONB,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="extension_events"
    )