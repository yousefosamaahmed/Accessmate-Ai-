from uuid import UUID

from sqlalchemy.orm import Session

from app.services.rag_service import RAGService


class AssistantDocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.rag_service = RAGService(db)

    def chat_with_document(
        self,
        document_id: UUID,
        user_id: UUID,
        question: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        limit: int = 5
    ) -> dict:
        return self.rag_service.answer_document_question(
            document_id=document_id,
            user_id=user_id,
            question=question,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            limit=limit
        )

    # Compatibility alias لو endpoint قديم بينادي الاسم ده
    def answer_document_question(
        self,
        document_id: UUID,
        user_id: UUID,
        question: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        limit: int = 5
    ) -> dict:
        return self.chat_with_document(
            document_id=document_id,
            user_id=user_id,
            question=question,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            limit=limit
        )