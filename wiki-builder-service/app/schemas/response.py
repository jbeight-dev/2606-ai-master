from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class KnowledgeSpaceResponse(BaseModel):
    success: bool = True
    knowledge_space_id: int
    name: str
    status: str

    class Config:
        from_attributes = True


class KnowledgeSpaceListItem(BaseModel):
    knowledge_space_id: int
    name: str
    description: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KnowledgeSpaceListResponse(BaseModel):
    success: bool = True
    items: List[KnowledgeSpaceListItem]


class DocumentUploadResponse(BaseModel):
    success: bool = True
    document_id: int
    file_name: str
    document_type: str
    status: str

    class Config:
        from_attributes = True


class DocumentListItem(BaseModel):
    document_id: int
    file_name: str
    document_type: str
    status: str
    analysis_elapsed_ms: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    success: bool = True
    items: List[DocumentListItem]


class AnalyzeDocumentResponse(BaseModel):
    success: bool = True
    document_id: int
    status: str
    wiki_count: int
    embedding_count: int
    elapsed_ms: int


class WikiListItem(BaseModel):
    wiki_id: int
    title: str
    summary: Optional[str] = None
    status: str
    version: int
    tags: List[str] = []
    rejection_reasons: List[str] = []
    rejection_comment: Optional[str] = None

    class Config:
        from_attributes = True


class WikiListResponse(BaseModel):
    success: bool = True
    items: List[WikiListItem]


class WikiDetailResponse(BaseModel):
    success: bool = True
    wiki_id: int
    knowledge_space_id: int
    document_id: int
    title: str
    summary: Optional[str] = None
    markdown: str
    status: str
    version: int
    tags: List[str] = []
    rejection_reasons: List[str] = []
    rejection_comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WikiUpdateResponse(BaseModel):
    success: bool = True
    wiki_id: int
    title: str
    status: str
    version: int


class WikiApproveResponse(BaseModel):
    success: bool = True
    wiki_id: int
    status: str


class WikiRejectResponse(BaseModel):
    success: bool = True
    wiki_id: int
    status: str
    rejection_reasons: List[str] = []
    rejection_comment: Optional[str] = None


class WikiRegenerateResponse(BaseModel):
    success: bool = True
    wiki_id: int
    status: str
    version: int
    title: str
    summary: Optional[str] = None


class QAListItem(BaseModel):
    qa_id: int
    question: str
    answer: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QAListResponse(BaseModel):
    success: bool = True
    items: List[QAListItem]


class QADetailResponse(BaseModel):
    success: bool = True
    qa_id: int
    knowledge_space_id: int
    question: str
    answer: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QADeleteResponse(BaseModel):
    success: bool = True
    qa_id: int


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
