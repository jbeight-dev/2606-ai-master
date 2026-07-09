from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class WikiStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Wiki(Base):
    __tablename__ = "wikis"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_space_id = Column(Integer, ForeignKey("knowledge_spaces.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    markdown = Column(Text, nullable=False)
    status = Column(Enum(WikiStatus), nullable=False, default=WikiStatus.DRAFT)
    rejection_reasons = Column(JSON, nullable=True, default=list)
    rejection_comment = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    tags = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    knowledge_space = relationship("KnowledgeSpace", back_populates="wikis")
    document = relationship("Document", back_populates="wikis")
    regeneration_history = relationship("WikiRegenerationHistory", back_populates="wiki")
