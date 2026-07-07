import os
import shutil
from pathlib import Path
from sqlalchemy.orm import Session
from typing import List
from fastapi import UploadFile

from app.models.document import Document, DocumentStatus, DocumentType
from app.core.config import settings
from app.core.exception import NotFoundException, WikiBuilderException
from app.core.logger import logger


ALLOWED_EXTENSIONS = {".txt"}


class DocumentService:
    def validate_file(self, file: UploadFile) -> None:
        if not file.filename:
            raise WikiBuilderException("파일명이 없습니다.", status_code=400)
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise WikiBuilderException(f"지원하지 않는 파일 형식입니다. (허용: {', '.join(ALLOWED_EXTENSIONS)})", status_code=400)

    def save_file(self, file: UploadFile, knowledge_space_id: int) -> str:
        upload_dir = Path(settings.STORAGE_PATH) / str(knowledge_space_id)
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / file.filename
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        logger.info(f"[document_service] Saved file: {file_path}")
        return str(file_path)

    def create(
        self,
        db: Session,
        knowledge_space_id: int,
        file: UploadFile,
        document_type: str,
    ) -> Document:
        self.validate_file(file)
        file_path = self.save_file(file, knowledge_space_id)

        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            doc_type = DocumentType.UNKNOWN

        doc = Document(
            knowledge_space_id=knowledge_space_id,
            file_name=file.filename,
            file_path=file_path,
            document_type=doc_type,
            status=DocumentStatus.UPLOADED,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def get_by_id(self, db: Session, document_id: int) -> Document:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise NotFoundException(f"문서를 찾을 수 없습니다. id={document_id}")
        return doc

    def get_by_knowledge_space(self, db: Session, knowledge_space_id: int) -> List[Document]:
        return (
            db.query(Document)
            .filter(Document.knowledge_space_id == knowledge_space_id)
            .order_by(Document.created_at.desc())
            .all()
        )

    def read_file(self, file_path: str) -> str:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            raise WikiBuilderException(f"파일을 읽을 수 없습니다: {file_path}", status_code=500)
        except Exception as e:
            raise WikiBuilderException(f"파일 읽기 오류: {e}", status_code=500)

    def mark_analyzed(self, db: Session, document: Document) -> Document:
        document.status = DocumentStatus.ANALYZED
        db.commit()
        db.refresh(document)
        return document

    def mark_failed(self, db: Session, document: Document) -> Document:
        document.status = DocumentStatus.FAILED
        db.commit()
        db.refresh(document)
        return document

    def update_document_type(self, db: Session, document: Document, classified_type: str) -> Document:
        try:
            document.document_type = DocumentType(classified_type)
        except ValueError:
            document.document_type = DocumentType.UNKNOWN
        db.commit()
        db.refresh(document)
        return document


document_service = DocumentService()
