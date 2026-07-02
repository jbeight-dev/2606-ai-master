from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.models.wiki import Wiki, WikiStatus
from app.schemas.request import UpdateWikiRequest
from app.core.exception import NotFoundException


class WikiService:
    def create_batch(
        self,
        db: Session,
        knowledge_space_id: int,
        document_id: int,
        wiki_data_list: List[Dict[str, Any]],
    ) -> List[Wiki]:
        wikis = []
        for data in wiki_data_list:
            wiki = Wiki(
                knowledge_space_id=knowledge_space_id,
                document_id=document_id,
                title=data.get("title", ""),
                summary=data.get("summary", ""),
                markdown=data.get("markdown", ""),
                status=WikiStatus.DRAFT,
                version=1,
                tags=data.get("tags", []),
            )
            db.add(wiki)
            wikis.append(wiki)

        db.commit()
        for wiki in wikis:
            db.refresh(wiki)
        return wikis

    def get_by_id(self, db: Session, wiki_id: int) -> Wiki:
        wiki = db.query(Wiki).filter(Wiki.id == wiki_id).first()
        if not wiki:
            raise NotFoundException(f"Wiki를 찾을 수 없습니다. id={wiki_id}")
        return wiki

    def get_by_knowledge_space(self, db: Session, knowledge_space_id: int) -> List[Wiki]:
        return (
            db.query(Wiki)
            .filter(Wiki.knowledge_space_id == knowledge_space_id)
            .order_by(Wiki.created_at.desc())
            .all()
        )

    def update(self, db: Session, wiki_id: int, request: UpdateWikiRequest) -> Wiki:
        wiki = self.get_by_id(db, wiki_id)
        wiki.title = request.title
        wiki.summary = request.summary
        wiki.markdown = request.markdown
        wiki.version += 1
        db.commit()
        db.refresh(wiki)
        return wiki

    def approve(self, db: Session, wiki_id: int) -> Wiki:
        wiki = self.get_by_id(db, wiki_id)
        wiki.status = WikiStatus.APPROVED
        db.commit()
        db.refresh(wiki)
        return wiki

    def reject(self, db: Session, wiki_id: int) -> Wiki:
        wiki = self.get_by_id(db, wiki_id)
        wiki.status = WikiStatus.REJECTED
        db.commit()
        db.refresh(wiki)
        return wiki


wiki_service = WikiService()
