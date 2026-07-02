from typing import List

from app.core.config import settings
from app.core.logger import logger
from app.core.exception import WikiBuilderException


class EmbeddingService:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        return self._client

    def generate(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        logger.info(f"[embedding_service] Generating embeddings for {len(texts)} texts")
        try:
            client = self._get_client()
            vectors = []
            for text in texts:
                response = client.models.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    contents=text,
                )
                vectors.append(response.embeddings[0].values)
            logger.info(f"[embedding_service] Generated {len(vectors)} embeddings")
            return vectors
        except Exception as e:
            raise WikiBuilderException(f"Embedding 생성 오류: {e}", status_code=500)


embedding_service = EmbeddingService()
