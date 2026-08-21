from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.repositories.document_repository import DocumentRepository
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.repositories.user_repository import UserRepository
from app.schemas.document_schema import DocumentCreate, DocumentUpdate
from app.schemas.document_chunk import DocumentChunkCreate


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.document_repository = DocumentRepository(db)
        self.chunk_repository = DocumentChunkRepository(db)
        self.user_repository = UserRepository(db)

    def create_document(self, document_data: DocumentCreate) -> Document:
        user = self.user_repository.get_user_by_id(document_data.user_id)

        if not user:
            raise ValueError("User not found")

        document = self.document_repository.create_document(document_data)

        return document

    def get_document_by_id(self, document_id: UUID) -> Document:
        document = self.document_repository.get_document_by_id(document_id)

        if not document:
            raise ValueError("Document not found")

        return document

    def get_documents_by_user_id(self, user_id: UUID) -> list[Document]:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        return self.document_repository.get_documents_by_user_id(user_id)

    def update_document(
        self,
        document_id: UUID,
        document_data: DocumentUpdate
    ) -> Document:
        document = self.get_document_by_id(document_id)

        updated_document = self.document_repository.update_document(
            document,
            document_data
        )

        return updated_document

    def mark_document_processing(self, document_id: UUID) -> Document:
        document = self.get_document_by_id(document_id)

        update_data = DocumentUpdate(
            status="processing"
        )

        return self.document_repository.update_document(
            document,
            update_data
        )

    def mark_document_extracted(
        self,
        document_id: UUID,
        extracted_text: str,
        detected_language: str = "unknown"
    ) -> Document:
        document = self.get_document_by_id(document_id)

        update_data = DocumentUpdate(
            status="extracted",
            extracted_text=extracted_text,
            detected_language=detected_language
        )

        return self.document_repository.update_document(
            document,
            update_data
        )

    def mark_document_indexed(self, document_id: UUID) -> Document:
        document = self.get_document_by_id(document_id)

        update_data = DocumentUpdate(
            status="indexed"
        )

        return self.document_repository.update_document(
            document,
            update_data
        )

    def mark_document_failed(self, document_id: UUID) -> Document:
        document = self.get_document_by_id(document_id)

        update_data = DocumentUpdate(
            status="failed"
        )

        return self.document_repository.update_document(
            document,
            update_data
        )

    def create_document_chunk(
        self,
        chunk_data: DocumentChunkCreate
    ) -> DocumentChunk:
        document = self.get_document_by_id(chunk_data.document_id)

        if not document:
            raise ValueError("Document not found")

        chunk = self.chunk_repository.create_chunk(chunk_data)

        return chunk

    def create_document_chunks(
        self,
        chunks_data: list[DocumentChunkCreate]
    ) -> list[DocumentChunk]:
        if not chunks_data:
            return []

        document_id = chunks_data[0].document_id

        document = self.document_repository.get_document_by_id(document_id)

        if not document:
            raise ValueError("Document not found")

        for chunk_data in chunks_data:
            if chunk_data.document_id != document_id:
                raise ValueError("All chunks must belong to the same document")

        chunks = self.chunk_repository.create_chunks(chunks_data)

        return chunks

    def get_document_chunks(self, document_id: UUID) -> list[DocumentChunk]:
        document = self.get_document_by_id(document_id)

        return self.chunk_repository.get_chunks_by_document_id(document.id)

    def update_chunk_embedding(
        self,
        chunk: DocumentChunk,
        embedding_id: str,
        embedding_vector: list[float],
        metadata_json: dict | None = None
    ) -> DocumentChunk:
        updated_chunk = self.chunk_repository.update_chunk_embedding(
            chunk=chunk,
            embedding_id=embedding_id,
            embedding_vector=embedding_vector,
            metadata_json=metadata_json
        )

        return updated_chunk

    def search_document_chunks(
        self,
        document_id: UUID,
        query_vector: list[float],
        limit: int = 5
    ):
        document = self.get_document_by_id(document_id)

        return self.chunk_repository.search_similar_chunks(
            document_id=document.id,
            query_vector=query_vector,
            limit=limit
        )
    
    def delete_document(self, document_id: UUID) -> bool:
        document = self.get_document_by_id(document_id)

        self.chunk_repository.delete_chunks_by_document_id(document.id)
        self.document_repository.delete_document(document)

        return True