from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.schemas.conversation_schema import ConversationCreate, ConversationUpdate


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(self, conversation_data: ConversationCreate) -> Conversation:
        conversation = Conversation(**conversation_data.model_dump())

        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)

        return conversation

    def get_conversation_by_id(self, conversation_id: UUID) -> Optional[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )

    def get_conversations_by_user_id(self, user_id: UUID) -> List[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
            .all()
        )

    def update_conversation(
        self,
        conversation: Conversation,
        conversation_data: ConversationUpdate
    ) -> Conversation:
        update_data = conversation_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(conversation, field, value)

        self.db.commit()
        self.db.refresh(conversation)

        return conversation

    def delete_conversation(self, conversation: Conversation) -> bool:
        self.db.delete(conversation)
        self.db.commit()

        return True