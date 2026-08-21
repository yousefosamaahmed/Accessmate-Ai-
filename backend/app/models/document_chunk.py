import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False
    )

    chunk_index = Column(
        Integer,
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    embedding_id = Column(
        String(255),
        nullable=True
    )

    embedding_vector = Column(
        Vector(384),
        nullable=True
    )

    metadata_json = Column(
        JSONB,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False
    )

    document = relationship(
        "Document",
        back_populates="chunks"
    )