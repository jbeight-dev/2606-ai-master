from pydantic import BaseModel, field_validator
from typing import Optional
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
