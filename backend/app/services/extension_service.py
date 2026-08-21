from uuid import UUID

from sqlalchemy.orm import Session

from app.models.extension_event import ExtensionEvent
from app.repositories.extension_event_repository import ExtensionEventRepository
from app.repositories.user_repository import UserRepository
from app.schemas.extension_event_schema import ExtensionEventCreate


class ExtensionService:
    def __init__(self, db: Session):
        self.db = db
        self.extension_event_repository = ExtensionEventRepository(db)
        self.user_repository = UserRepository(db)

    def log_event(self, event_data: ExtensionEventCreate) -> ExtensionEvent:
        user = self.user_repository.get_user_by_id(event_data.user_id)

        if not user:
            raise ValueError("User not found")

        event = self.extension_event_repository.create_extension_event(
            event_data
        )

        return event

    def get_user_events(self, user_id: UUID) -> list[ExtensionEvent]:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        return self.extension_event_repository.get_extension_events_by_user_id(
            user_id
        )