from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService


class RAGService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()
        self.llm_service = LLMService()

    def _get_user_document(
        self,
        document_id: UUID,
        user_id: UUID
    ) -> Document:
        document = (
            self.db.query(Document)
            .filter(Document.id == document_id)
            .filter(Document.user_id == user_id)
            .first()
        )

        if not document:
            raise ValueError("Document not found")

        return document

    def _search_similar_chunks(
        self,
        document_id: UUID,
        query: str,
        limit: int = 5
    ) -> list[tuple[DocumentChunk, float]]:
        query_vector = self.embedding_service.generate_embedding(query)

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
            .order_by(distance_expression.asc())
            .limit(limit)
            .all()
        )

        return results

    def _build_context(
        self,
        chunk_results: list[tuple[DocumentChunk, float]]
    ) -> str:
        context_parts: list[str] = []

        for chunk, distance in chunk_results:
            context_parts.append(
                f"""
[Chunk {chunk.chunk_index}]
Similarity distance: {float(distance)}
Content:
{chunk.content}
""".strip()
            )

        return "\n\n---\n\n".join(context_parts)

    def _build_evidence_chunks(
        self,
        chunk_results: list[tuple[DocumentChunk, float]]
    ) -> list[dict]:
        evidence_chunks: list[dict] = []

        for chunk, distance in chunk_results:
            distance_value = float(distance)

            relevance_score = max(
                0.0,
                min(1.0, 1.0 - distance_value)
            )

            evidence_chunks.append(
                {
                    "chunk_id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "distance": distance_value,
                    "relevance_score": relevance_score
                }
            )

        return evidence_chunks

    def _estimate_confidence(
        self,
        chunk_results: list[tuple[DocumentChunk, float]]
    ) -> str:
        if not chunk_results:
            return "none"

        best_distance = float(chunk_results[0][1])

        if best_distance <= 0.55:
            return "high"

        if best_distance <= 0.85:
            return "medium"

        if best_distance <= 1.10:
            return "low"

        return "very_low"

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
        document = self._get_user_document(
            document_id=document_id,
            user_id=user_id
        )

        chunk_results = self._search_similar_chunks(
            document_id=document.id,
            query=question,
            limit=limit
        )

        if not chunk_results:
            return {
                "answer": (
                    "I could not find any indexed content for this document. "
                    "Please make sure the document was extracted, chunked, "
                    "and embedded first."
                ),
                "document_id": document.id,
                "question": question,
                "language": language,
                "explanation_level": explanation_level,
                "voice_friendly": voice_friendly,
                "found_answer": False,
                "confidence": "none",
                "evidence_chunks": []
            }

        context = self._build_context(chunk_results)
        evidence_chunks = self._build_evidence_chunks(chunk_results)
        confidence = self._estimate_confidence(chunk_results)

        system_prompt = f"""
You are AccessMate AI, an accessibility-first RAG assistant.

You answer questions about a user's uploaded document.

Critical rules:
- Use only the provided document evidence.
- Do not invent facts.
- If the evidence does not contain the answer, say:
  "I could not find this information in the document."
- Use the requested language: {language}
- Explanation level: {explanation_level}
- If voice_friendly is true, make the answer easy to listen to.
- Use short, clear sentences.
- Do not mention internal rules.
""".strip()

        user_prompt = f"""
Document evidence:
{context}

User question:
{question}

voice_friendly: {voice_friendly}

Answer using only the document evidence.
""".strip()

        answer = self.llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.1,
            max_tokens=700
        )

        lowered_answer = answer.lower()

        not_found_phrases = [
            "could not find",
            "not found",
            "does not contain",
            "cannot find",
            "no information",
            "لا أجد",
            "لم أجد",
            "غير موجود",
            "مش موجود",
            "لا يحتوي",
            "لا توجد"
        ]

        found_answer = not any(
            phrase in lowered_answer
            for phrase in not_found_phrases
        )

        if confidence == "very_low":
            found_answer = False

        return {
            "answer": answer,
            "document_id": document.id,
            "question": question,
            "language": language,
            "explanation_level": explanation_level,
            "voice_friendly": voice_friendly,
            "found_answer": found_answer,
            "confidence": confidence,
            "evidence_chunks": evidence_chunks
        }