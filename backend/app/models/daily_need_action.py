import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class DailyNeedAction(Base):
    __tablename__ = "daily_need_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    code = Column(String(80), nullable=False, unique=True, index=True)
    name_ar = Column(String(150), nullable=False)
    name_en = Column(String(150), nullable=False)

    intent = Column(String(120), nullable=False, index=True)
    category = Column(String(80), nullable=False, default="general", index=True)
    risk_level = Column(String(20), nullable=False, default="low", index=True)

    default_message_ar = Column(Text, nullable=False)
    default_message_en = Column(Text, nullable=False)

    icon = Column(String(120), nullable=True)
    color = Column(String(40), nullable=True)

    requires_confirmation = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)