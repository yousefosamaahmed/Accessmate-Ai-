from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.extension_event import ExtensionEvent
from app.schemas.extension_event_schema import ExtensionEventCreate, ExtensionEventUpdate


class ExtensionEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_extension_event(self, event_data: ExtensionEventCreate) -> ExtensionEvent:
        extension_event = ExtensionEvent(**event_data.model_dump())

        self.db.add(extension_event)
        self.db.commit()
        self.db.refresh(extension_event)

        return extension_event

    def get_extension_event_by_id(self, extension_event_id: UUID) -> Optional[ExtensionEvent]:
        return (
            self.db.query(ExtensionEvent)
            .filter(ExtensionEvent.id == extension_event_id)
            .first()
        )

    def get_extension_events_by_user_id(self, user_id: UUID) -> List[ExtensionEvent]:
        return (
            self.db.query(ExtensionEvent)
            .filter(ExtensionEvent.user_id == user_id)
            .order_by(ExtensionEvent.created_at.desc())
            .all()
        )

    def update_extension_event(
        self,
        extension_event: ExtensionEvent,
        extension_event_data: ExtensionEventUpdate
    ) -> ExtensionEvent:
        update_data = extension_event_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(extension_event, field, value)

        self.db.commit()
        self.db.refresh(extension_event)

        return extension_event

    def delete_extension_event(self, extension_event: ExtensionEvent) -> bool:
        self.db.delete(extension_event)
        self.db.commit()

        return True