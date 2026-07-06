from sqlalchemy.orm import Session
from typing import List

from app.models.knowledge_space import KnowledgeSpace, KnowledgeSpaceStatus
from app.schemas.request import CreateKnowledgeSpaceRequest
from app.core.exception import NotFoundException


class KnowledgeSpaceService:
    def create(self, db: Session, request: CreateKnowledgeSpaceRequest) -> KnowledgeSpace:
        ks = KnowledgeSpace(
            name=request.name,
            description=request.description,
            status=KnowledgeSpaceStatus.ACTIVE,
        )
        db.add(ks)
        db.commit()
        db.refresh(ks)
        return ks

    def get_all(self, db: Session) -> List[KnowledgeSpace]:
        return db.query(KnowledgeSpace).filter(
            KnowledgeSpace.status == KnowledgeSpaceStatus.ACTIVE
        ).order_by(KnowledgeSpace.created_at.desc()).all()

    def get_by_id(self, db: Session, knowledge_space_id: int) -> KnowledgeSpace:
        ks = db.query(KnowledgeSpace).filter(KnowledgeSpace.id == knowledge_space_id).first()
        if not ks:
            raise NotFoundException(f"Knowledge Space를 찾을 수 없습니다. id={knowledge_space_id}")
        return ks

    def delete_space(self, db: Session, knowledge_space_id: int) -> KnowledgeSpace:
        ks = self.get_by_id(db, knowledge_space_id)
        ks.status = KnowledgeSpaceStatus.INACTIVE
        db.commit()
        db.refresh(ks)
        return ks


knowledge_space_service = KnowledgeSpaceService()
