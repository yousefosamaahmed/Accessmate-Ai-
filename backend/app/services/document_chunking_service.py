from app.schemas.document_chunk import DocumentChunkCreate


class DocumentChunkingService:
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 150
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> list[str]:
        cleaned_text = text.strip()

        if not cleaned_text:
            return []

        chunks = []
        start = 0
        text_length = len(cleaned_text)

        while start < text_length:
            end = start + self.chunk_size
            chunk = cleaned_text[start:end].strip()

            if chunk:
                chunks.append(chunk)

            if end >= text_length:
                break

            start = end - self.chunk_overlap

        return chunks

    def build_document_chunks(
        self,
        document_id,
        text: str
    ) -> list[DocumentChunkCreate]:
        chunks = self.split_text(text)

        chunk_objects = []

        for index, chunk in enumerate(chunks):
            chunk_objects.append(
                DocumentChunkCreate(
                    document_id=document_id,
                    chunk_index=index,
                    content=chunk,
                    embedding_id=None,
                    metadata_json={
                        "chunk_size": len(chunk),
                        "chunk_overlap": self.chunk_overlap,
                        "chunking_strategy": "fixed_character_window"
                    }
                )
            )

        return chunk_objects