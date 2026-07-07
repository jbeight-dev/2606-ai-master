import time

from app.graphs.assistant_graph import AssistantGraph
from app.schemas.request import ChatRequest
from app.schemas.response import ChatResponse
from app.core.logger import get_logger

logger = get_logger(__name__)

_graph = AssistantGraph()


class AssistantService:
    def chat(self, request: ChatRequest) -> ChatResponse:
        start = time.monotonic()

        logger.info(
            "CHAT_REQUEST user_id=%s question_len=%d knowledge_space_id=%s",
            request.user_id,
            len(request.question),
            request.knowledge_space_id,
        )

        result = _graph.invoke(
            question=request.question,
            user_id=request.user_id,
            knowledge_space_id=request.knowledge_space_id,
        )

        elapsed_ms = int((time.monotonic() - start) * 1000)

        intent = result.get("intent")
        rewritten_query = result.get("rewritten_query")
        answer = result.get("final_answer")
        sources = [
            {
                "wiki_id": doc["wiki_id"],
                "title": doc.get("title", ""),
                "similarity_score": doc.get("similarity_score", 0.0),
            }
            for doc in result.get("reranked_docs", [])
        ]

        logger.info(
            "CHAT_RESPONSE user_id=%s intent=%s elapsed_ms=%d",
            request.user_id,
            intent,
            elapsed_ms,
        )

        return ChatResponse(
            success=True,
            intent=intent,
            rewritten_query=rewritten_query,
            answer=answer,
            sources=sources,
            elapsed_ms=elapsed_ms,
        )
