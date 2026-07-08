from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class QA(Base):
    __tablename__ = "qas"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_space_id = Column(Integer, ForeignKey("knowledge_spaces.id"), nullable=False)
    question = Column(String(1000), nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    knowledge_space = relationship("KnowledgeSpace", back_populates="qas")
