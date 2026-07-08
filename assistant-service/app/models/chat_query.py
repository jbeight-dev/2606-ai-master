from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class ChatQuery(Base):
    __tablename__ = "chat_queries"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_space_id = Column(Integer, nullable=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    question = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
