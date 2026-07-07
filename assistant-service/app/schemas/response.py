from pydantic import BaseModel
from typing import List, Optional


class WikiSource(BaseModel):
    wiki_id: int
    title: str
    similarity_score: float


class ChatResponse(BaseModel):
    success: bool
    intent: Optional[str] = None
    rewritten_query: Optional[str] = None
    answer: Optional[str] = None
    sources: List[WikiSource] = []
    elapsed_ms: Optional[int] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
