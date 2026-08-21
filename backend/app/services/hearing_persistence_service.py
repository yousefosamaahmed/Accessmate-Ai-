from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.care_alert import CareAlert
from app.models.hearing_caption import HearingCaption
from app.models.hearing_session import HearingSession
from app.models.hearing_sound_event import HearingSoundEvent
from app.repositories.hearing_repository import HearingRepository
from app.schemas.hearing_persistence_schema import (
    HearingSessionCreate,
    HearingSessionSummaryOut,
    HearingSoundEventCreate,
)


class HearingPersistenceService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = HearingRepository(db)

    def save_session(
        self,
        user_id: UUID,
        payload: HearingSessionCreate,
    ) -> HearingSession:
        now = datetime.now(timezone.utc)

        session = HearingSession(
            user_id=user_id,
            language=payload.language,
            translation_enabled=payload.translation_enabled,
            translation_target=(
                payload.translation_target
                if payload.translation_enabled
                else None
            ),
            status="saved",
            started_at=(
                payload.captions[0].created_at
                if payload.captions and payload.captions[0].created_at
                else now
            ),
            ended_at=(
                payload.captions[-1].created_at
                if payload.captions and payload.captions[-1].created_at
                else now
            ),
        )

        try:
            self.repository.add_session(session)

            for index, item in enumerate(payload.captions):
                caption = HearingCaption(
                    session_id=session.id,
                    user_id=user_id,
                    client_id=item.client_id,
                    sequence=item.sequence if item.sequence >= 0 else index,
                    text=item.text.strip(),
                    translated_text=(
                        item.translated_text.strip()
                        if item.translated_text
                        else None
                    ),
                    detected_language=item.detected_language,
                    translation_target=item.translation_target,
                )

                if item.created_at is not None:
                    caption.created_at = item.created_at

                self.repository.add_caption(caption)

            self.db.commit()

            return self.repository.get_session_for_user(
                session.id,
                user_id,
                with_captions=True,
            )

        except IntegrityError as error:
            self.db.rollback()
            raise ValueError(
                "This hearing session contains duplicate caption identifiers."
            ) from error

        except Exception:
            self.db.rollback()
            raise

    def list_sessions(
        self,
        user_id: UUID,
        limit: int,
    ) -> list[HearingSessionSummaryOut]:
        sessions = self.repository.list_sessions_for_user(
            user_id,
            limit,
        )

        return [
            HearingSessionSummaryOut(
                id=item.id,
                user_id=item.user_id,
                language=item.language,
                translation_enabled=item.translation_enabled,
                translation_target=item.translation_target,
                status=item.status,
                started_at=item.started_at,
                ended_at=item.ended_at,
                created_at=item.created_at,
                caption_count=len(item.captions),
            )
            for item in sessions
        ]

    def get_session(
        self,
        user_id: UUID,
        session_id: UUID,
    ) -> HearingSession:
        session = self.repository.get_session_for_user(
            session_id,
            user_id,
            with_captions=True,
        )

        if session is None:
            raise ValueError("Hearing session not found")

        return session

    def delete_session(
        self,
        user_id: UUID,
        session_id: UUID,
    ) -> None:
        session = self.repository.get_session_for_user(
            session_id,
            user_id,
        )

        if session is None:
            raise ValueError("Hearing session not found")

        self.db.delete(session)
        self.db.commit()

    def save_sound_event(
        self,
        user_id: UUID,
        payload: HearingSoundEventCreate,
    ) -> HearingSoundEvent:
        existing = self.repository.get_sound_event_by_client_id(
            user_id,
            payload.client_id,
        )

        if existing is not None:
            return existing

        if payload.session_id is not None:
            session = self.repository.get_session_for_user(
                payload.session_id,
                user_id,
            )

            if session is None:
                raise ValueError("Hearing session not found")

        event = HearingSoundEvent(
            user_id=user_id,
            session_id=payload.session_id,
            client_id=payload.client_id,
            category=payload.category.strip().lower(),
            label=payload.label.strip(),
            confidence=payload.confidence,
            threshold=payload.threshold,
            model=payload.model.strip(),
            is_critical=(
                payload.category.strip().lower()
                in {"alarm", "siren"}
            ),
        )

        try:
            self.repository.add_sound_event(event)
            self.db.commit()
            self.db.refresh(event)
            return event

        except IntegrityError:
            self.db.rollback()

            existing = self.repository.get_sound_event_by_client_id(
                user_id,
                payload.client_id,
            )

            if existing is not None:
                return existing

            raise

        except Exception:
            self.db.rollback()
            raise

    def list_sound_events(
        self,
        user_id: UUID,
        limit: int,
    ) -> list[HearingSoundEvent]:
        return self.repository.list_sound_events_for_user(
            user_id,
            limit,
        )

    def link_sound_event_to_care_alert(
        self,
        user_id: UUID,
        client_id: str,
        care_alert_id: UUID,
    ) -> HearingSoundEvent:
        event = self.repository.get_sound_event_by_client_id(
            user_id,
            client_id,
        )

        if event is None:
            raise ValueError("Hearing sound event not found")

        alert = (
            self.db.query(CareAlert)
            .filter(CareAlert.id == care_alert_id)
            .filter(CareAlert.user_id == user_id)
            .first()
        )

        if alert is None:
            raise ValueError("Care alert not found")

        event.care_alert_id = alert.id
        self.db.commit()
        self.db.refresh(event)

        return event
