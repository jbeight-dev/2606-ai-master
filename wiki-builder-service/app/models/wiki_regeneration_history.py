from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class WikiRegenerationHistory(Base):
    __tablename__ = "wiki_regeneration_history"

    id = Column(Integer, primary_key=True, index=True)
    wiki_id = Column(Integer, ForeignKey("wikis.id"), nullable=False)
    previous_version = Column(Integer, nullable=False)
    previous_title = Column(String(500), nullable=False)
    previous_summary = Column(Text, nullable=True)
    previous_markdown = Column(Text, nullable=False)
    rejection_reasons = Column(JSON, nullable=True, default=list)
    rejection_comment = Column(Text, nullable=True)
    prompt = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wiki = relationship("Wiki", back_populates="regeneration_history")
