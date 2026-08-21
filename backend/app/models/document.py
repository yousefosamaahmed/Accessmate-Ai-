import uuid

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

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

    original_file_name = Column(
        String(255),
        nullable=False
    )

    stored_file_name = Column(
        String(255),
        nullable=False
    )

    file_type = Column(
        String(20),
        nullable=False
    )

    # mime_type -> النوع التقني للملف مثل application/pdf أو image/png
    mime_type = Column(
        String(150),
        nullable=False
    )

    file_size = Column(
        BigInteger,
        nullable=False
    )

    file_path = Column(
        Text,
        nullable=False
    )

    status = Column(
        String(50),
        default="uploaded",
        nullable=False
    )

    extracted_text = Column(
        Text,
        nullable=True
    )

    detected_language = Column(
        String(20),
        default="unknown",
        nullable=False
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

    user = relationship(
        "User",
        back_populates="documents"
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )

    conversations = relationship(
        "Conversation",
        back_populates="document"
    )