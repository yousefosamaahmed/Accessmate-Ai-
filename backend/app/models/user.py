import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    full_name = Column(
        String(150),
        nullable=True
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        Text,
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    is_2fa_enabled = Column(
        Boolean,
        default=False,
        nullable=False
    )

    totp_secret = Column(
        String(255),
        nullable=True
    )

    two_factor_confirmed_at = Column(
        DateTime(timezone=False),
        nullable=True
    )

    last_login_at = Column(
        DateTime(timezone=False),
        nullable=True
    )

    failed_login_attempts = Column(
        Integer,
        default=0,
        nullable=False
    )

    locked_until = Column(
        DateTime(timezone=False),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    accessibility_profile = relationship(
        "AccessibilityProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    documents = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    website_checks = relationship(
        "WebsiteCheck",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    extension_events = relationship(
        "ExtensionEvent",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    speech_logs = relationship(
        "SpeechLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )