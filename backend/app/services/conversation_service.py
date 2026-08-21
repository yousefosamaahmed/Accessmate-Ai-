from uuid import UUID

from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.website_check_repository import WebsiteCheckRepository
from app.schemas.conversation_schema import ConversationCreate, ConversationUpdate
from app.schemas.message_schema import MessageCreate, MessageUpdate


class ConversationService:
    def __init__(self, db: Session):
        self.db = db
        self.conversation_repository = ConversationRepository(db)
        self.message_repository = MessageRepository(db)
        self.user_repository = UserRepository(db)
        self.document_repository = DocumentRepository(db)
        self.website_check_repository = WebsiteCheckRepository(db)

    def create_conversation(
        self,
        conversation_data: ConversationCreate
    ) -> Conversation:
        user = self.user_repository.get_user_by_id(conversation_data.user_id)

        if not user:
            raise ValueError("User not found")

        if conversation_data.document_id:
            document = self.document_repository.get_document_by_id(
                conversation_data.document_id
            )

            if not document:
                raise ValueError("Document not found")

        if conversation_data.website_check_id:
            website_check = self.website_check_repository.get_website_check_by_id(
                conversation_data.website_check_id
            )

            if not website_check:
                raise ValueError("Website check not found")

        conversation = self.conversation_repository.create_conversation(
            conversation_data
        )

        return conversation

    def get_conversation_by_id(self, conversation_id: UUID) -> Conversation:
        conversation = self.conversation_repository.get_conversation_by_id(
            conversation_id
        )

        if not conversation:
            raise ValueError("Conversation not found")

        return conversation

    def get_user_conversations(self, user_id: UUID) -> list[Conversation]:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        conversations = self.conversation_repository.get_conversations_by_user_id(
            user_id
        )

        return conversations

    def update_conversation(
        self,
        conversation_id: UUID,
        conversation_data: ConversationUpdate
    ) -> Conversation:
        conversation = self.get_conversation_by_id(conversation_id)

        updated_conversation = self.conversation_repository.update_conversation(
            conversation,
            conversation_data
        )

        return updated_conversation

    def delete_conversation(self, conversation_id: UUID) -> bool:
        conversation = self.get_conversation_by_id(conversation_id)

        self.conversation_repository.delete_conversation(conversation)

        return True

    def add_message_to_conversation(
        self,
        message_data: MessageCreate
    ) -> Message:
        self.get_conversation_by_id(message_data.conversation_id)

        message = self.message_repository.create_message(message_data)

        return message

    def get_conversation_messages(
        self,
        conversation_id: UUID
    ) -> list[Message]:
        conversation = self.get_conversation_by_id(conversation_id)

        messages = self.message_repository.get_messages_by_conversation_id(
            conversation.id
        )

        return messages

    def get_message_by_id(self, message_id: UUID) -> Message:
        message = self.message_repository.get_message_by_id(message_id)

        if not message:
            raise ValueError("Message not found")

        return message

    def update_message(
        self,
        message_id: UUID,
        message_data: MessageUpdate
    ) -> Message:
        message = self.get_message_by_id(message_id)

        updated_message = self.message_repository.update_message(
            message,
            message_data
        )

        return updated_message

    def delete_message(self, message_id: UUID) -> bool:
        message = self.get_message_by_id(message_id)

        self.message_repository.delete_message(message)

        return True