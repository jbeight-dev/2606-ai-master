from typing import List

from app.core.logger import logger
from app.core.llm_client import embed_texts
from app.core.exception import WikiBuilderException


class EmbeddingService:
    def generate(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        logger.info(f"[embedding_service] Generating embeddings for {len(texts)} texts")
        try:
            vectors = embed_texts(texts)
            logger.info(f"[embedding_service] Generated {len(vectors)} embeddings")
            return vectors
        except Exception as e:
            raise WikiBuilderException(f"Embedding 생성 오류: {e}", status_code=500)


embedding_service = EmbeddingService()
