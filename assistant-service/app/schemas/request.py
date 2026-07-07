from typing import Optional

from pydantic import BaseModel, field_validator


class ChatRequest(BaseModel):
    user_id: str
    question: str
    knowledge_space_id: Optional[int] = None

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question cannot be empty")
        return v
