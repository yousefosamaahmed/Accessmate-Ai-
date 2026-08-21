import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as db_relationship
from sqlalchemy.sql import func

from app.database import Base


class CareAlert(Base):
    __tablename__ = "care_alerts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    caregiver_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "caregivers.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    daily_need_action_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "daily_need_actions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # =====================================================
    # ALERT CONTENT
    # =====================================================

    alert_type = Column(
        String(80),
        nullable=False,
        default="daily_need",
    )

    intent = Column(
        String(120),
        nullable=False,
        index=True,
    )

    message = Column(
        Text,
        nullable=False,
    )

    # =====================================================
    # DELIVERY
    # =====================================================

    channel = Column(
        String(30),
        nullable=False,
        default="telegram",
    )

    status = Column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )

    # Supported lifecycle:
    #
    # pending
    # sent
    # acknowledged
    # resolved
    # failed

    # =====================================================
    # RISK / AI CONTEXT
    # =====================================================

    risk_level = Column(
        String(20),
        nullable=False,
        default="low",
    )

    confidence = Column(
        Numeric(5, 4),
        nullable=True,
    )

    source = Column(
        String(40),
        nullable=False,
        default="careboard",
    )

    # Example sources:
    #
    # careboard
    # hearing_assistant
    # camera
    # workspace
    # voice

    confirmed_by_user = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # =====================================================
    # DELIVERY / FAILURE INFORMATION
    # =====================================================

    error_message = Column(
        Text,
        nullable=True,
    )

    sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # =====================================================
    # CARE LIFECYCLE
    # =====================================================

    acknowledged_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # =====================================================
    # AUDIT
    # =====================================================

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # =====================================================
    # RELATIONSHIPS
    # =====================================================

    caregiver = db_relationship(
        "Caregiver",
        back_populates="alerts",
    )

