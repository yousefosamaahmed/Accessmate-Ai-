from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.message import Message
from app.schemas.message_schema import MessageCreate, MessageUpdate


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_message(self, message_data: MessageCreate) -> Message:
        message = Message(**message_data.model_dump())

        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        return message

    def get_message_by_id(self, message_id: UUID) -> Optional[Message]:
        return (
            self.db.query(Message)
            .filter(Message.id == message_id)
            .first()
        )

    def get_messages_by_conversation_id(self, conversation_id: UUID) -> List[Message]:
        return (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )

    def update_message(
        self,
        message: Message,
        message_data: MessageUpdate
    ) -> Message:
        update_data = message_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(message, field, value)

        self.db.commit()
        self.db.refresh(message)

        return message

    def delete_message(self, message: Message) -> bool:
        self.db.delete(message)
        self.db.commit()

        return True