from pydantic import BaseModel, field_validator
from typing import List, Optional
from app.models.document import DocumentType


class CreateKnowledgeSpaceRequest(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Knowledge Space 이름은 비어 있을 수 없습니다.")
        return v.strip()


class UpdateWikiRequest(BaseModel):
    title: str
    summary: Optional[str] = None
    markdown: str

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Wiki 제목은 비어 있을 수 없습니다.")
        return v.strip()

    @field_validator("markdown")
    @classmethod
    def markdown_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Wiki 본문은 비어 있을 수 없습니다.")
        return v


REJECTION_REASONS = (
    "핵심 내용 누락",
    "사실 오류",
    "구조 부적절",
    "너무 요약됨",
    "불필요한 내용 포함",
    "문서 유형 오분류",
    "그 외 사유",
)


class RejectWikiRequest(BaseModel):
    reasons: List[str]
    comment: str

    @field_validator("reasons")
    @classmethod
    def reasons_must_be_valid(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("반려 사유를 하나 이상 선택해주세요.")
        for reason in v:
            if reason not in REJECTION_REASONS:
                raise ValueError(f"올바르지 않은 반려 사유입니다: {reason}")
        return v

    @field_validator("comment")
    @classmethod
    def comment_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("반려 코멘트는 비어 있을 수 없습니다.")
        return v.strip()


class CreateQARequest(BaseModel):
    question: str
    answer: str

    @field_validator("question")
    @classmethod
    def question_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("질문은 비어 있을 수 없습니다.")
        return v.strip()

    @field_validator("answer")
    @classmethod
    def answer_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("답변은 비어 있을 수 없습니다.")
        return v.strip()


class UpdateQARequest(BaseModel):
    question: str
    answer: str

    @field_validator("question")
    @classmethod
    def question_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("질문은 비어 있을 수 없습니다.")
        return v.strip()

    @field_validator("answer")
    @classmethod
    def answer_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("답변은 비어 있을 수 없습니다.")
        return v.strip()
