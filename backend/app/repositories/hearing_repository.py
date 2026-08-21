from uuid import UUID

from sqlalchemy.orm import Session, selectinload

from app.models.hearing_caption import HearingCaption
from app.models.hearing_session import HearingSession
from app.models.hearing_sound_event import HearingSoundEvent


class HearingRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_session(self, session: HearingSession) -> HearingSession:
        self.db.add(session)
        self.db.flush()
        return session

    def add_caption(self, caption: HearingCaption) -> HearingCaption:
        self.db.add(caption)
        self.db.flush()
        return caption

    def get_session_for_user(
        self,
        session_id: UUID,
        user_id: UUID,
        *,
        with_captions: bool = False,
    ) -> HearingSession | None:
        query = self.db.query(HearingSession)

        if with_captions:
            query = query.options(
                selectinload(HearingSession.captions)
            )

        return (
            query
            .filter(HearingSession.id == session_id)
            .filter(HearingSession.user_id == user_id)
            .first()
        )

    def list_sessions_for_user(
        self,
        user_id: UUID,
        limit: int,
    ) -> list[HearingSession]:
        return (
            self.db.query(HearingSession)
            .options(selectinload(HearingSession.captions))
            .filter(HearingSession.user_id == user_id)
            .order_by(HearingSession.created_at.desc())
            .limit(limit)
            .all()
        )

    def add_sound_event(
        self,
        event: HearingSoundEvent,
    ) -> HearingSoundEvent:
        self.db.add(event)
        self.db.flush()
        return event

    def get_sound_event_by_client_id(
        self,
        user_id: UUID,
        client_id: str,
    ) -> HearingSoundEvent | None:
        return (
            self.db.query(HearingSoundEvent)
            .filter(HearingSoundEvent.user_id == user_id)
            .filter(HearingSoundEvent.client_id == client_id)
            .first()
        )

    def list_sound_events_for_user(
        self,
        user_id: UUID,
        limit: int,
    ) -> list[HearingSoundEvent]:
        return (
            self.db.query(HearingSoundEvent)
            .filter(HearingSoundEvent.user_id == user_id)
            .order_by(HearingSoundEvent.created_at.desc())
            .limit(limit)
            .all()
        )
