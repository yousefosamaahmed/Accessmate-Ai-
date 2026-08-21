# backend/app/models/conversation.py

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )

    website_check_id = Column(
        UUID(as_uuid=True),
        ForeignKey("website_checks.id", ondelete="SET NULL"),
        nullable=True,
    )

    title = Column(
        String(255),
        nullable=True,
    )

    conversation_type = Column(
        String(50),
        default="general",
        nullable=False,
    )

    # =====================================================
    # Archive state
    # False = appears in Recent Chats
    # True  = appears in Archive
    # =====================================================
    is_archived = Column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="conversations",
    )

    document = relationship(
        "Document",
        back_populates="conversations",
    )

    website_check = relationship(
        "WebsiteCheck",
        back_populates="conversations",
    )

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )