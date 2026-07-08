from sqlalchemy.orm import Session
from typing import List

from app.models.qa import QA
from app.schemas.request import CreateQARequest, UpdateQARequest
from app.core.exception import NotFoundException


class QAService:
    def create(self, db: Session, knowledge_space_id: int, request: CreateQARequest) -> QA:
        qa = QA(
            knowledge_space_id=knowledge_space_id,
            question=request.question,
            answer=request.answer,
        )
        db.add(qa)
        db.commit()
        db.refresh(qa)
        return qa

    def get_by_id(self, db: Session, qa_id: int) -> QA:
        qa = db.query(QA).filter(QA.id == qa_id).first()
        if not qa:
            raise NotFoundException(f"답변을 찾을 수 없습니다. id={qa_id}")
        return qa

    def get_by_knowledge_space(self, db: Session, knowledge_space_id: int) -> List[QA]:
        return (
            db.query(QA)
            .filter(QA.knowledge_space_id == knowledge_space_id)
            .order_by(QA.created_at.desc())
            .all()
        )

    def update(self, db: Session, qa_id: int, request: UpdateQARequest) -> QA:
        qa = self.get_by_id(db, qa_id)
        qa.question = request.question
        qa.answer = request.answer
        db.commit()
        db.refresh(qa)
        return qa

    def delete(self, db: Session, qa_id: int) -> None:
        qa = self.get_by_id(db, qa_id)
        db.delete(qa)
        db.commit()


qa_service = QAService()
