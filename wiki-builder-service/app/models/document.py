from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    ANALYZED = "ANALYZED"
    FAILED = "FAILED"


class DocumentType(str, enum.Enum):
    USER_MANUAL = "USER_MANUAL"
    ERD = "ERD"
    DATA_CATALOG = "DATA_CATALOG"
    GLOSSARY = "GLOSSARY"
    UNKNOWN = "UNKNOWN"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_space_id = Column(Integer, ForeignKey("knowledge_spaces.id"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False, default=DocumentType.UNKNOWN)
    status = Column(Enum(DocumentStatus), nullable=False, default=DocumentStatus.UPLOADED)
    analysis_elapsed_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    knowledge_space = relationship("KnowledgeSpace", back_populates="documents")
    wikis = relationship("Wiki", back_populates="document")
