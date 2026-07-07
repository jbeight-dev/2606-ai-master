from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.core import config
from app.core.logger import get_logger

logger = get_logger(__name__)


class QdrantService:
    def __init__(self):
        self._client: Optional[QdrantClient] = None

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            kwargs = {"url": config.QDRANT_URL}
            if config.QDRANT_API_KEY:
                kwargs["api_key"] = config.QDRANT_API_KEY
            self._client = QdrantClient(**kwargs)
        return self._client

    def search(
        self,
        vector: List[float],
        knowledge_space_id: Optional[int],
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        must = [FieldCondition(key="status", match=MatchValue(value="APPROVED"))]
        if knowledge_space_id is not None:
            must.append(
                FieldCondition(key="knowledge_space_id", match=MatchValue(value=knowledge_space_id))
            )

        try:
            client = self._get_client()
            hits = client.query_points(
                collection_name=config.QDRANT_COLLECTION_NAME,
                query=vector,
                query_filter=Filter(must=must),
                limit=limit,
            ).points
        except Exception as e:
            logger.warning("[qdrant_service] search failed: %s", e)
            return []

        return [
            {
                "wiki_id": hit.payload.get("wiki_id"),
                "similarity_score": round(hit.score, 4),
            }
            for hit in hits
        ]


qdrant_service = QdrantService()
