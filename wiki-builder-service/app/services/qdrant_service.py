import uuid
from typing import List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    PayloadSchemaType,
    Filter,
    FieldCondition,
    MatchValue,
)

from app.core.config import settings
from app.core.logger import logger
from app.core.exception import WikiBuilderException


class QdrantService:
    def __init__(self):
        self._client = None

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            kwargs = {"url": settings.QDRANT_URL}
            if settings.QDRANT_API_KEY:
                kwargs["api_key"] = settings.QDRANT_API_KEY
            self._client = QdrantClient(**kwargs)
        return self._client

    def _ensure_collection(self, vector_size: int) -> None:
        client = self._get_client()
        collections = [c.name for c in client.get_collections().collections]
        if settings.QDRANT_COLLECTION_NAME not in collections:
            client.create_collection(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            logger.info(f"[qdrant_service] Created collection: {settings.QDRANT_COLLECTION_NAME}")

    def upsert_wikis(
        self,
        wiki_ids: List[int],
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
    ) -> int:
        if not vectors:
            return 0

        try:
            self._ensure_collection(vector_size=len(vectors[0]))
            client = self._get_client()

            points = [
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={**payload, "wiki_id": wiki_ids[i]},
                )
                for i, (vector, payload) in enumerate(zip(vectors, payloads))
            ]

            client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=points,
            )
            logger.info(f"[qdrant_service] Upserted {len(points)} vectors")
            return len(points)
        except Exception as e:
            raise WikiBuilderException(f"Qdrant 저장 오류: {e}", status_code=500)

    def update_wiki_status(self, wiki_id: int, status: str) -> None:
        try:
            client = self._get_client()
            client.set_payload(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                payload={"status": status},
                points=Filter(
                    must=[FieldCondition(key="wiki_id", match=MatchValue(value=wiki_id))]
                ),
            )
            logger.info(f"[qdrant_service] Updated wiki_id={wiki_id} status={status}")
        except Exception as e:
            logger.warning(f"[qdrant_service] Failed to update wiki status in Qdrant: {e}")


qdrant_service = QdrantService()
