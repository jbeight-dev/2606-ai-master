from pydantic import BaseModel
from typing import Optional


class ChatResponse(BaseModel):
    success: bool
    intent: Optional[str] = None
    rewritten_query: Optional[str] = None
    answer: Optional[str] = None
    elapsed_ms: Optional[int] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
