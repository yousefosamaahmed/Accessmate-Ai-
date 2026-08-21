from typing import List
from uuid import UUID

from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from app.schemas.document_chunk import DocumentChunkCreate


class DocumentChunkRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_chunk(self, chunk_data: DocumentChunkCreate) -> DocumentChunk:
        chunk = DocumentChunk(
            **chunk_data.model_dump()
        )

        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)

        return chunk

    def create_chunks(
        self,
        chunks_data: List[DocumentChunkCreate]
    ) -> List[DocumentChunk]:
        chunks = [
            DocumentChunk(
                **chunk_data.model_dump()
            )
            for chunk_data in chunks_data
        ]

        self.db.add_all(chunks)
        self.db.commit()

        for chunk in chunks:
            self.db.refresh(chunk)

        return chunks

    def get_chunks_by_document_id(
        self,
        document_id: UUID
    ) -> List[DocumentChunk]:
        return (
            self.db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )

    def update_chunk_embedding(
        self,
        chunk: DocumentChunk,
        embedding_id: str,
        embedding_vector: list[float],
        metadata_json: dict | None = None
    ) -> DocumentChunk:
        chunk.embedding_id = embedding_id
        chunk.embedding_vector = embedding_vector

        if metadata_json is not None:
            existing_metadata = dict(
                chunk.metadata_json or {}
            )

            updated_metadata = {
                **existing_metadata,
                **metadata_json
            }

            chunk.metadata_json = updated_metadata

        self.db.commit()
        self.db.refresh(chunk)

        return chunk

    def search_similar_chunks(
        self,
        document_id: UUID,
        query_vector: list[float],
        limit: int = 5
    ) -> list[tuple[DocumentChunk, float]]:
        distance_expression = DocumentChunk.embedding_vector.cosine_distance(
            query_vector
        )

        results = (
            self.db.query(
                DocumentChunk,
                distance_expression.label("distance")
            )
            .filter(DocumentChunk.document_id == document_id)
            .filter(DocumentChunk.embedding_vector.isnot(None))
            .order_by(asc("distance"))
            .limit(limit)
            .all()
        )

        return results

    def delete_chunks_by_document_id(
        self,
        document_id: UUID
    ) -> bool:
        chunks = (
            self.db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .all()
        )

        for chunk in chunks:
            self.db.delete(chunk)

        self.db.commit()

        return True