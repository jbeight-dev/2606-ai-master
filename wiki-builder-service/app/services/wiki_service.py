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

    def reject(self, db: Session, wiki_id: int, reasons: List[str], comment: str) -> Wiki:
        wiki = self.get_by_id(db, wiki_id)
        wiki.status = WikiStatus.REJECTED
        wiki.rejection_reasons = reasons
        wiki.rejection_comment = comment
        db.commit()
        db.refresh(wiki)
        return wiki

    def regenerate_content(self, db: Session, wiki: Wiki, data: Dict[str, Any]) -> Wiki:
        wiki.title = data.get("title") or wiki.title
        wiki.summary = data.get("summary", wiki.summary)
        wiki.markdown = data.get("markdown") or wiki.markdown
        wiki.tags = data.get("tags", wiki.tags)
        wiki.version += 1
        wiki.status = WikiStatus.DRAFT
        wiki.rejection_reasons = None
        wiki.rejection_comment = None
        db.commit()
        db.refresh(wiki)
        return wiki


wiki_service = WikiService()
