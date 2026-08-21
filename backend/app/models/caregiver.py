import uuid

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as db_relationship
from sqlalchemy.sql import func

from app.database import Base


class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    full_name = Column(String(150), nullable=False)
    relationship = Column(String(80), nullable=True)

    phone_number = Column(String(30), nullable=True)
    telegram_chat_id = Column(String(100), nullable=True)
    whatsapp_number = Column(String(30), nullable=True)

    preferred_channel = Column(String(30), nullable=False, default="telegram")

    is_primary = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    alerts = db_relationship("CareAlert", back_populates="caregiver")