from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.request import UpdateWikiRequest
from app.schemas.response import (
    WikiListResponse,
    WikiListItem,
    WikiDetailResponse,
    WikiUpdateResponse,
    WikiApproveResponse,
    WikiRejectResponse,
)
from app.services.wiki_service import wiki_service
from app.services.qdrant_service import qdrant_service

router = APIRouter(tags=["Wikis"])


@router.get(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/wikis",
    response_model=WikiListResponse,
)
def list_wikis(knowledge_space_id: int, db: Session = Depends(get_db)):
    wikis = wiki_service.get_by_knowledge_space(db, knowledge_space_id)
    return WikiListResponse(
        success=True,
        items=[
            WikiListItem(
                wiki_id=w.id,
                title=w.title,
                summary=w.summary,
                status=w.status.value,
                version=w.version,
                tags=w.tags or [],
            )
            for w in wikis
        ],
    )


@router.get("/api/v1/wikis/{wiki_id}", response_model=WikiDetailResponse)
def get_wiki(wiki_id: int, db: Session = Depends(get_db)):
    w = wiki_service.get_by_id(db, wiki_id)
    return WikiDetailResponse(
        success=True,
        wiki_id=w.id,
        knowledge_space_id=w.knowledge_space_id,
        document_id=w.document_id,
        title=w.title,
        summary=w.summary,
        markdown=w.markdown,
        status=w.status.value,
        version=w.version,
        tags=w.tags or [],
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


@router.put("/api/v1/wikis/{wiki_id}", response_model=WikiUpdateResponse)
def update_wiki(wiki_id: int, request: UpdateWikiRequest, db: Session = Depends(get_db)):
    w = wiki_service.update(db, wiki_id, request)
    return WikiUpdateResponse(
        success=True,
        wiki_id=w.id,
        title=w.title,
        status=w.status.value,
        version=w.version,
    )


@router.post("/api/v1/wikis/{wiki_id}/approve", response_model=WikiApproveResponse)
def approve_wiki(wiki_id: int, db: Session = Depends(get_db)):
    w = wiki_service.approve(db, wiki_id)
    qdrant_service.update_wiki_status(wiki_id, "APPROVED")
    return WikiApproveResponse(success=True, wiki_id=w.id, status=w.status.value)


@router.post("/api/v1/wikis/{wiki_id}/reject", response_model=WikiRejectResponse)
def reject_wiki(wiki_id: int, db: Session = Depends(get_db)):
    w = wiki_service.reject(db, wiki_id)
    qdrant_service.update_wiki_status(wiki_id, "REJECTED")
    return WikiRejectResponse(success=True, wiki_id=w.id, status=w.status.value)
