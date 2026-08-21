from functools import lru_cache
from uuid import uuid4

import numpy as np
from sentence_transformers import SentenceTransformer


EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIMENSION = 384


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(EMBEDDING_MODEL_NAME)


class EmbeddingService:
    def __init__(self, dimension: int = EMBEDDING_DIMENSION):
        self.dimension = dimension
        self.provider = "sentence_transformers"
        self.model_name = EMBEDDING_MODEL_NAME

    def generate_embedding(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise ValueError("Text is required to generate embedding")

        model = get_embedding_model()

        embedding = model.encode(
            text.strip(),
            normalize_embeddings=True
        )

        vector = np.asarray(embedding, dtype=np.float32).tolist()

        if len(vector) != self.dimension:
            raise ValueError(
                f"Embedding dimension mismatch. "
                f"Expected {self.dimension}, got {len(vector)}"
            )

        return vector

    def generate_embedding_payload(
        self,
        text: str
    ) -> tuple[str, list[float], dict]:
        vector = self.generate_embedding(text)
        embedding_id = str(uuid4())

        metadata = {
            "embedding_id": embedding_id,
            "embedding_provider": self.provider,
            "embedding_model": self.model_name,
            "embedding_dimension": self.dimension,
            "embedding_storage": "postgresql_pgvector",
            "embedding_normalized": True
        }

        return embedding_id, vector, metadata