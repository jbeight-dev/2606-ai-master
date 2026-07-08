from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.request import CreateQARequest, UpdateQARequest
from app.schemas.response import (
    QAListResponse,
    QAListItem,
    QADetailResponse,
    QADeleteResponse,
)
from app.services.qa_service import qa_service

router = APIRouter(tags=["QA"])


@router.get(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/qas",
    response_model=QAListResponse,
)
def list_qas(knowledge_space_id: int, db: Session = Depends(get_db)):
    qas = qa_service.get_by_knowledge_space(db, knowledge_space_id)
    return QAListResponse(
        success=True,
        items=[
            QAListItem(
                qa_id=qa.id,
                question=qa.question,
                answer=qa.answer,
                created_at=qa.created_at,
                updated_at=qa.updated_at,
            )
            for qa in qas
        ],
    )


@router.post(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/qas",
    response_model=QADetailResponse,
)
def create_qa(knowledge_space_id: int, request: CreateQARequest, db: Session = Depends(get_db)):
    qa = qa_service.create(db, knowledge_space_id, request)
    return QADetailResponse(
        success=True,
        qa_id=qa.id,
        knowledge_space_id=qa.knowledge_space_id,
        question=qa.question,
        answer=qa.answer,
        created_at=qa.created_at,
        updated_at=qa.updated_at,
    )


@router.put("/api/v1/qas/{qa_id}", response_model=QADetailResponse)
def update_qa(qa_id: int, request: UpdateQARequest, db: Session = Depends(get_db)):
    qa = qa_service.update(db, qa_id, request)
    return QADetailResponse(
        success=True,
        qa_id=qa.id,
        knowledge_space_id=qa.knowledge_space_id,
        question=qa.question,
        answer=qa.answer,
        created_at=qa.created_at,
        updated_at=qa.updated_at,
    )


@router.delete("/api/v1/qas/{qa_id}", response_model=QADeleteResponse)
def delete_qa(qa_id: int, db: Session = Depends(get_db)):
    qa_service.delete(db, qa_id)
    return QADeleteResponse(success=True, qa_id=qa_id)
