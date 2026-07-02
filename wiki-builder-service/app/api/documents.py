from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.response import DocumentUploadResponse, DocumentListResponse, DocumentListItem, AnalyzeDocumentResponse
from app.services.knowledge_space_service import knowledge_space_service
from app.services.document_service import document_service
from app.services.analysis_service import document_analysis_service

router = APIRouter(tags=["Documents"])


@router.post(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/documents",
    response_model=DocumentUploadResponse,
)
def upload_document(
    knowledge_space_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(default="UNKNOWN"),
    db: Session = Depends(get_db),
):
    knowledge_space_service.get_by_id(db, knowledge_space_id)
    doc = document_service.create(db, knowledge_space_id, file, document_type)
    return DocumentUploadResponse(
        success=True,
        document_id=doc.id,
        file_name=doc.file_name,
        document_type=doc.document_type.value,
        status=doc.status.value,
    )


@router.get(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/documents",
    response_model=DocumentListResponse,
)
def list_documents(knowledge_space_id: int, db: Session = Depends(get_db)):
    knowledge_space_service.get_by_id(db, knowledge_space_id)
    docs = document_service.get_by_knowledge_space(db, knowledge_space_id)
    return DocumentListResponse(
        success=True,
        items=[
            DocumentListItem(
                document_id=d.id,
                file_name=d.file_name,
                document_type=d.document_type.value,
                status=d.status.value,
                created_at=d.created_at,
            )
            for d in docs
        ],
    )


@router.post(
    "/api/v1/documents/{document_id}/analyze",
    response_model=AnalyzeDocumentResponse,
)
def analyze_document(document_id: int, db: Session = Depends(get_db)):
    return document_analysis_service.analyze(db, document_id)
