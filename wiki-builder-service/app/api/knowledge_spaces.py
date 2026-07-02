from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.request import CreateKnowledgeSpaceRequest
from app.schemas.response import KnowledgeSpaceResponse, KnowledgeSpaceListResponse, KnowledgeSpaceListItem
from app.services.knowledge_space_service import knowledge_space_service

router = APIRouter(prefix="/api/v1/knowledge-spaces", tags=["Knowledge Spaces"])


@router.post("", response_model=KnowledgeSpaceResponse)
def create_knowledge_space(
    request: CreateKnowledgeSpaceRequest,
    db: Session = Depends(get_db),
):
    ks = knowledge_space_service.create(db, request)
    return KnowledgeSpaceResponse(
        success=True,
        knowledge_space_id=ks.id,
        name=ks.name,
        status=ks.status.value,
    )


@router.get("", response_model=KnowledgeSpaceListResponse)
def list_knowledge_spaces(db: Session = Depends(get_db)):
    items = knowledge_space_service.get_all(db)
    return KnowledgeSpaceListResponse(
        success=True,
        items=[
            KnowledgeSpaceListItem(
                knowledge_space_id=ks.id,
                name=ks.name,
                description=ks.description,
                status=ks.status.value,
                created_at=ks.created_at,
            )
            for ks in items
        ],
    )
