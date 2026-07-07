import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.request import ChatRequest
from app.schemas.response import ChatResponse
from app.services.assistant_service import AssistantService
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

_service = AssistantService()


@router.post("/chat", response_model=ChatResponse, summary="AI Wiki 어시스턴트 질문")
async def chat(request: ChatRequest):
    """
    AI Wiki 어시스턴트에게 질문합니다.

    - **user_id**: 사용자 식별자
    - **question**: 질문 내용 (비어 있으면 400 반환)
    - **knowledge_space_id**: 답변 기준이 되는 Knowledge Space ID (선택, 생략 시 전체 범위)
    """
    try:
        response = await asyncio.to_thread(_service.chat, request)
        return response
    except Exception as e:
        logger.error("CHAT_ERROR user_id=%s error=%s", request.user_id, str(e))
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "AI 처리 중 오류가 발생했습니다."},
        )
