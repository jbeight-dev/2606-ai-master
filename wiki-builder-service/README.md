# AI Wiki Builder Service

FastAPI 기반 AI Wiki 자동 생성 서비스입니다.

## 프로젝트 개요

문서를 업로드하면 LangGraph 워크플로우가 LLM를 활용해 Wiki 초안을 자동 생성합니다.  
생성된 Wiki는 검수 후 승인/반려할 수 있으며, 승인된 Wiki는 Qdrant에 벡터로 저장되어 AI Assistant의 Knowledge Base로 활용됩니다.

## 프로젝트 구조

```
wiki-builder-service/
├── app/
│   ├── main.py                    # FastAPI 앱 진입점
│   ├── api/
│   │   ├── knowledge_spaces.py    # Knowledge Space API
│   │   ├── documents.py           # 문서 업로드/분석 API
│   │   └── wikis.py               # Wiki CRUD API
│   ├── services/
│   │   ├── knowledge_space_service.py
│   │   ├── document_service.py
│   │   ├── wiki_service.py
│   │   ├── embedding_service.py
│   │   ├── qdrant_service.py
│   │   └── analysis_service.py    # LangGraph 분석 오케스트레이터
│   ├── schemas/
│   │   ├── request.py
│   │   └── response.py
│   ├── models/
│   │   ├── knowledge_space.py
│   │   ├── document.py
│   │   └── wiki.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── logger.py
│   │   └── exception.py
│   ├── graphs/
│   │   └── builder_graph.py       # LangGraph 워크플로우
│   ├── prompts/
│   │   └── builder_prompt.py
│   └── requirements.txt
├── Dockerfile
└── README.md
```

## 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다.


## 실행 방법

```bash
cd wiki-builder-service
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker 실행 방법

```bash
docker build -t wiki-builder .
docker run -p 8000:8000 --env-file .env wiki-builder
```

## Swagger UI

서버 실행 후 브라우저에서 접속:

```
http://localhost:8000/docs
```

## API 예제

### Knowledge Space 생성

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-spaces \
  -H "Content-Type: application/json" \
  -d '{"name": "AI 비전 검사 시스템", "description": "비전 검사 시스템 사용자 매뉴얼"}'
```

### 문서 업로드

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-spaces/1/documents \
  -F "file=@vision_manual.txt" \
  -F "document_type=USER_MANUAL"
```

### AI 문서 분석 실행

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/analyze
```

### Wiki 목록 조회

```bash
curl http://localhost:8000/api/v1/knowledge-spaces/1/wikis
```

### Wiki 상세 조회

```bash
curl http://localhost:8000/api/v1/wikis/1
```

### Wiki 수정

```bash
curl -X PUT http://localhost:8000/api/v1/wikis/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "수정된 제목", "summary": "수정된 요약", "markdown": "# 수정된 내용"}'
```

### Wiki 승인

```bash
curl -X POST http://localhost:8000/api/v1/wikis/1/approve
```

### Wiki 반려

```bash
curl -X POST http://localhost:8000/api/v1/wikis/1/reject
```

### Health Check

```bash
curl http://localhost:8000/health
```

## PoC 제약사항

- 문서 형식은 `.txt`만 지원합니다.
- 인증/권한은 적용되지 않습니다.
- 문서는 Local File System에 저장됩니다.
- 비동기 Queue는 적용되지 않습니다.
- PDF, DOCX, XLSX, CSV는 후속 확장 대상입니다.


PRD 내용을 확인했습니다. 현재 wiki-builder-service 디렉토리 구조를 먼저 파악하겠습니다.

Bash List existing files in wiki-builder-service
IN
find /Users/jbpark/workspace/2026-ai-master/wiki-builder-service -type f | sort

OUT
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/prd-builder.md
Bash Check aiapp-md directory for existing graph code
IN
ls /Users/jbpark/workspace/2026-ai-master/aiapp-md/

OUT
README.md
assistant_graph.py
jbtest_proto_langgraph.py
myvenv
prd_assistant.md
prd_fastapi.md
requirements.txt
services
wiki
Bash Read existing LangGraph prototype code
IN
cat /Users/jbpark/workspace/2026-ai-master/aiapp-md/jbtest_proto_langgraph.py

OUT
"""
langgraph.py
AI Wiki Assistant - LangGraph Workflow

흐름:
1. 사용자 질문 입력
2. Intent Classifier
3. Query Rewrite
4. Markdown Retriever
5. Document Reranker
6. Context Builder
7. Answer Generator
8. Confidence Checker
"""

import re
from pathlib import Path
from datetime import datetime
from typing import TypedDict, List, Dict, Any, Literal, Optional
from langgraph.graph import StateGraph, START, END


# =========================================================
# 1. State 정의
# =========================================================

class WikiAssistantState(TypedDict, total=False):
    question: str

    intent: Literal[
        "wiki_question",
        "general_question",
        "unclear"
    ]

    rewritten_query: str

    retrieved_docs: List[Dict[str, Any]]
    reranked_docs: List[Dict[str, Any]]

    context: str
    answer: str

    confidence_score: float
    confidence_result: Literal["PASS", "FAIL"]
    confidence_reason: str

    final_answer: str


# =========================================================
# 2. Node 구현
# =========================================================

def intent_classifier(state: WikiAssistantState) -> WikiAssistantState:
    question = state["question"]

    # TODO: LLM으로 의도 분류
    # 예시 규칙 기반
    if len(question.strip()) < 3:
        intent = "unclear"
    else:
        intent = "wiki_question"

    return {
        **state,
        "intent": intent
    }


def query_rewrite(state: WikiAssistantState) -> WikiAssistantState:
    question = state["question"]

    # TODO: LLM으로 검색 친화적인 질의로 변환
    rewritten_query = question.strip()

    return {
        **state,
        "rewritten_query": rewritten_query
    }


def _load_wiki_sections(wiki_dir: Path) -> List[Dict[str, Any]]:
    docs = []
    for md_file in sorted(wiki_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        updated_at = datetime.fromtimestamp(md_file.stat().st_mtime).strftime("%Y-%m-%d")

        # # / ## / ### 헤딩 기준으로 섹션 분할
        sections = re.split(r'\n(?=#{1,3} )', text)

        for i, section in enumerate(sections):
            section = section.strip()
            if not section:
                continue

            lines = section.split('\n')
            title = lines[0].lstrip('#').strip() or md_file.stem
            content = '\n'.join(lines[1:]).strip()

            docs.append({
                "doc_id": f"{md_file.stem}_{i:03d}",
                "title": title,
                "content": content or section,
                "updated_at": updated_at,
                "source": md_file.name,
                "_search_text": section.lower(),
            })
    return docs


def _keyword_score(query: str, search_text: str) -> float:
    query_tokens = set(re.findall(r'\w+', query.lower()))
    if not query_tokens:
        return 0.0
    hits = sum(1 for t in query_tokens if t in search_text)
    return round(hits / len(query_tokens), 2)


def markdown_retriever(state: WikiAssistantState) -> WikiAssistantState:
    query = state["rewritten_query"]

    wiki_dir = Path(__file__).parent / "wiki"
    all_sections = _load_wiki_sections(wiki_dir)

    scored = []
    for doc in all_sections:
        score = _keyword_score(query, doc["_search_text"])
        if score > 0:
            scored.append({k: v for k, v in doc.items() if k != "_search_text"} | {"similarity_score": score})

    scored.sort(key=lambda d: d["similarity_score"], reverse=True)
    retrieved_docs = scored[:5]

    return {
        **state,
        "retrieved_docs": retrieved_docs
    }


def document_reranker(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("retrieved_docs", [])

    def rerank_score(doc: Dict[str, Any]) -> float:
        similarity = doc.get("similarity_score", 0)

        # 최신성 점수 예시
        updated_at = doc.get("updated_at", "")
        recency_score = 0.1 if updated_at >= "2026-06-01" else 0

        return similarity + recency_score

    reranked_docs = sorted(
        docs,
        key=rerank_score,
        reverse=True
    )

    return {
        **state,
        "reranked_docs": reranked_docs
    }


def context_builder(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("reranked_docs", [])

    context_blocks = []

    for doc in docs:
        block = f"""
## {doc.get("title")}

{doc.get("content")}

- source: {doc.get("source")}
- updated_at: {doc.get("updated_at")}
"""
        context_blocks.append(block.strip())

    context = "\n\n---\n\n".join(context_blocks)

    return {
        **state,
        "context": context
    }


def answer_generator(state: WikiAssistantState) -> WikiAssistantState:
    question = state["question"]
    context = state.get("context", "")

    # TODO: 실제 LLM 호출로 대체
    answer = f"""
질문에 대한 답변입니다.

제공된 Wiki 문서 기준으로 보면, 설비 등록 권한은 문서 버전에 따라 다르게 설명되어 있습니다.
사용자 매뉴얼에서는 관리자 권한이 필요하다고 되어 있으나, 최신 릴리즈노트에서는 일반 사용자도 일부 설비 정보를 등록할 수 있다고 설명합니다.

따라서 최신 기준으로는 일반 사용자도 일부 등록이 가능하지만, 전체 등록 권한은 관리자 권한이 필요할 수 있습니다.
"""

    return {
        **state,
        "answer": answer.strip()
    }


def confidence_checker(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("reranked_docs", [])
    answer = state.get("answer", "")

    if not docs:
        return {
            **state,
            "confidence_score": 0.0,
            "confidence_result": "FAIL",
            "confidence_reason": "검색된 문서가 없습니다.",
            "final_answer": "관련 문서를 찾지 못해 정확한 답변을 드리기 어렵습니다."
        }

    top_score = docs[0].get("similarity_score", 0)
    doc_count = len(docs)

    score = 0.0

    if top_score >= 0.8:
        score += 0.5
    elif top_score >= 0.6:
        score += 0.3

    if doc_count >= 2:
        score += 0.2

    if answer:
        score += 0.2

    if any(doc.get("updated_at", "") >= "2026-06-01" for doc in docs):
        score += 0.1

    score = round(score, 2)

    if score >= 0.7:
        result = "PASS"
        reason = "관련 문서와 최신 문서를 기반으로 답변이 생성되었습니다."
        final_answer = f"""
{answer}

---

신뢰도: {int(score * 100)}%
검증 결과: {result}
근거 문서:
{chr(10).join([f"- {doc.get('source')}" for doc in docs])}
""".strip()
    else:
        result = "FAIL"
        reason = "검색 문서의 관련도 또는 근거가 충분하지 않습니다."
        final_answer = f"""
제공된 Wiki 문서만으로는 정확한 답변을 드리기 어렵습니다.

검증 결과: {result}
신뢰도: {int(score * 100)}%
사유: {reason}
""".strip()

    return {
        **state,
        "confidence_score": score,
        "confidence_result": result,
        "confidence_reason": reason,
        "final_answer": final_answer
    }


def ask_clarification(state: WikiAssistantState) -> WikiAssistantState:
    return {
        **state,
        "final_answer": "질문이 명확하지 않습니다. 어떤 기능이나 문서 기준으로 확인할지 조금 더 구체적으로 입력해 주세요."
    }


def general_answer(state: WikiAssistantState) -> WikiAssistantState:
    return {
        **state,
        "final_answer": "이 질문은 Wiki 문서 검색이 필요하지 않은 일반 질문으로 판단되었습니다."
    }


# =========================================================
# 3. Routing 함수
# =========================================================

def route_by_intent(state: WikiAssistantState) -> str:
    intent = state.get("intent")

    if intent == "wiki_question":
        return "query_rewrite"

    if intent == "general_question":
        return "general_answer"

    return "ask_clarification"


# =========================================================
# 4. Graph 구성
# =========================================================

def build_graph():
    graph = StateGraph(WikiAssistantState)

    graph.add_node("intent_classifier", intent_classifier)
    graph.add_node("query_rewrite", query_rewrite)
    graph.add_node("markdown_retriever", markdown_retriever)
    graph.add_node("document_reranker", document_reranker)
    graph.add_node("context_builder", context_builder)
    graph.add_node("answer_generator", answer_generator)
    graph.add_node("confidence_checker", confidence_checker)
    graph.add_node("ask_clarification", ask_clarification)
    graph.add_node("general_answer", general_answer)

    graph.add_edge(START, "intent_classifier")

    graph.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "query_rewrite": "query_rewrite",
            "general_answer": "general_answer",
            "ask_clarification": "ask_clarification"
        }
    )

    graph.add_edge("query_rewrite", "markdown_retriever")
    graph.add_edge("markdown_retriever", "document_reranker")
    graph.add_edge("document_reranker", "context_builder")
    graph.add_edge("context_builder", "answer_generator")
    graph.add_edge("answer_generator", "confidence_checker")
    graph.add_edge("confidence_checker", END)

    graph.add_edge("ask_clarification", END)
    graph.add_edge("general_answer", END)

    return graph.compile()


# =========================================================
# 5. 실행 예시
# =========================================================

if __name__ == "__main__":
    app = build_graph()

    result = app.invoke({
       # "question": "설비 등록은 누가 할 수 있나요?"
       "question": "GOOD과 DEFECT의 차이는 무엇인가?"
    })

    print(result["final_answer"])
PRD 내용을 파악했습니다. 기존 LangGraph 코드는 Assistant용이라 Wiki Builder는 처음부터 구현해야 합니다. 지금 바로 전체 프로젝트를 구현하겠습니다.

Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
Bash Create wiki-builder-service directory structure
IN
mkdir -p /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/{api,services,schemas,models,core,graphs,prompts,storage/uploads}

OUT
(Bash completed with no output)
Bash Create __init__.py files
IN
touch /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/api/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/schemas/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/models/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/core/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/graphs/__init__.py \
  /Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/prompts/__init__.py

OUT
(Bash completed with no output)
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
이제 core 모듈부터 구현합니다.

Write config.py
27 lines
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-02-01"
    AZURE_OPENAI_DEPLOYMENT_NAME: str = ""
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: str = ""

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/wiki_builder"

    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_NAME: str = "wiki_embeddings"

    STORAGE_PATH: str = "app/storage/uploads"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
Write database.py
25 lines
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator
from app.core.config import settings


engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
Write logger.py
26 lines
import logging
import sys
from app.core.config import settings


def setup_logger() -> logging.Logger:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("wiki_builder")
    logger.setLevel(log_level)
    logger.addHandler(handler)
    logger.propagate = False

    return logger


logger = setup_logger()
Write exception.py
46 lines
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.logger import logger


class WikiBuilderException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(WikiBuilderException):
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class DocumentAnalysisException(WikiBuilderException):
    def __init__(self, message: str):
        super().__init__(message, status_code=500)


async def wiki_builder_exception_handler(request: Request, exc: WikiBuilderException) -> JSONResponse:
    logger.error(f"WikiBuilderException: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message}
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "입력값이 올바르지 않습니다.", "detail": exc.errors()}
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "서버 내부 오류가 발생했습니다."}
    )
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
이제 SQLAlchemy 모델을 구현합니다.

Write knowledge_space.py
25 lines
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class KnowledgeSpaceStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class KnowledgeSpace(Base):
    __tablename__ = "knowledge_spaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    status = Column(Enum(KnowledgeSpaceStatus), nullable=False, default=KnowledgeSpaceStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    documents = relationship("Document", back_populates="knowledge_space")
    wikis = relationship("Wiki", back_populates="knowledge_space")
Write document.py
36 lines
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    knowledge_space = relationship("KnowledgeSpace", back_populates="documents")
    wikis = relationship("Wiki", back_populates="document")
Write wiki.py
31 lines
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
    version = Column(Integer, nullable=False, default=1)
    tags = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    knowledge_space = relationship("KnowledgeSpace", back_populates="wikis")
    document = relationship("Document", back_populates="wikis")
Write __init__.py
Write failed
from app.models.knowledge_space import KnowledgeSpace, KnowledgeSpaceStatus
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.wiki import Wiki, WikiStatus

__all__ = [
    "KnowledgeSpace", "KnowledgeSpaceStatus",
    "Document", "DocumentStatus", "DocumentType",
    "Wiki", "WikiStatus",
]
Read __init__.py
Write __init__.py
10 lines
from app.models.knowledge_space import KnowledgeSpace, KnowledgeSpaceStatus
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.wiki import Wiki, WikiStatus

__all__ = [
    "KnowledgeSpace", "KnowledgeSpaceStatus",
    "Document", "DocumentStatus", "DocumentType",
    "Wiki", "WikiStatus",
]
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
Write request.py
36 lines
from pydantic import BaseModel, field_validator
from typing import Optional
from app.models.document import DocumentType


class CreateKnowledgeSpaceRequest(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Knowledge Space 이름은 비어 있을 수 없습니다.")
        return v.strip()


class UpdateWikiRequest(BaseModel):
    title: str
    summary: Optional[str] = None
    markdown: str

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Wiki 제목은 비어 있을 수 없습니다.")
        return v.strip()

    @field_validator("markdown")
    @classmethod
    def markdown_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Wiki 본문은 비어 있을 수 없습니다.")
        return v
Write response.py
126 lines
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class KnowledgeSpaceResponse(BaseModel):
    success: bool = True
    knowledge_space_id: int
    name: str
    status: str

    class Config:
        from_attributes = True


class KnowledgeSpaceListItem(BaseModel):
    knowledge_space_id: int
    name: str
    description: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KnowledgeSpaceListResponse(BaseModel):
    success: bool = True
    items: List[KnowledgeSpaceListItem]


class DocumentUploadResponse(BaseModel):
    success: bool = True
    document_id: int
    file_name: str
    document_type: str
    status: str

    class Config:
        from_attributes = True


class DocumentListItem(BaseModel):
    document_id: int
    file_name: str
    document_type: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    success: bool = True
    items: List[DocumentListItem]


class AnalyzeDocumentResponse(BaseModel):
    success: bool = True
    document_id: int
    status: str
    wiki_count: int
    embedding_count: int
    elapsed_ms: int


class WikiListItem(BaseModel):
    wiki_id: int
    title: str
    summary: Optional[str] = None
    status: str
    version: int
    tags: List[str] = []

    class Config:
        from_attributes = True


class WikiListResponse(BaseModel):
    success: bool = True
    items: List[WikiListItem]


class WikiDetailResponse(BaseModel):
    success: bool = True
    wiki_id: int
    knowledge_space_id: int
    document_id: int
    title: str
    summary: Optional[str] = None
    markdown: str
    status: str
    version: int
    tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WikiUpdateResponse(BaseModel):
    success: bool = True
    wiki_id: int
    title: str
    status: str
    version: int


class WikiApproveResponse(BaseModel):
    success: bool = True
    wiki_id: int
    status: str


class WikiRejectResponse(BaseModel):
    success: bool = True
    wiki_id: int
    status: str


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
Write builder_prompt.py
72 lines
WIKI_BUILDER_SYSTEM_PROMPT = """당신은 AI Wiki Builder이다.
역할
- 업로드된 문서를 분석하여 AI가 검색하기 쉬운 Wiki 형태의 Knowledge로 변환한다.
- 문서의 종류나 도메인을 미리 가정하지 않는다.
- 문서에 포함된 정보를 논리적으로 구조화하여 Markdown으로 생성한다.
행동 원칙
1. 문서의 주제를 먼저 파악한다.
2. 문서의 구조를 분석한다.
3. 의미적으로 독립적인 주제는 각각 하나의 Wiki로 분리한다.
4. 문서에 존재하지 않는 내용은 생성하지 않는다.
5. 원문의 의미를 변경하지 않는다.
6. 검색하기 쉽도록 제목과 계층 구조를 명확하게 작성한다.
7. 중복 내용은 하나로 통합한다.
8. 표는 가능한 한 유지한다.
9. 목록은 Markdown 리스트로 표현한다.
10. 사람이 검수하기 쉬운 형태로 작성한다.
출력 원칙
- 각 Wiki는 독립적으로 읽을 수 있어야 한다.
- 제목, 개요, 본문, 관련 개념, 태그를 포함한다.
- 원문에 없는 기능, 절차, 정책은 추가하지 않는다.
- 승인 여부는 판단하지 않는다."""

CLASSIFY_DOCUMENT_PROMPT = """아래 문서를 읽고 문서 유형을 분류하라.

문서 유형 목록:
- USER_MANUAL: 사용자 매뉴얼, 사용법 안내서
- ERD: 엔티티 관계 다이어그램 설명
- DATA_CATALOG: 데이터 카탈로그, 데이터 사전
- GLOSSARY: 용어집, 용어 정의
- UNKNOWN: 위 유형에 해당하지 않음

문서:
{document_text}

반드시 다음 JSON 형식으로만 응답하라:
{{"document_type": "<유형>"}}"""

ANALYZE_STRUCTURE_PROMPT = """아래 문서의 구조를 분석하고 주요 섹션 목록을 추출하라.

문서 유형: {document_type}

문서:
{document_text}

반드시 다음 JSON 형식으로만 응답하라:
{{
  "sections": [
    {{"title": "섹션 제목", "description": "섹션 설명"}}
  ]
}}"""

GENERATE_WIKI_PROMPT = """아래 문서의 섹션을 기반으로 Wiki를 생성하라.

문서 유형: {document_type}
섹션 정보: {sections}

원본 문서:
{document_text}

각 의미적으로 독립적인 주제마다 하나의 Wiki를 생성하라.
반드시 다음 JSON 형식으로만 응답하라:
{{
  "wikis": [
    {{
      "title": "Wiki 제목",
      "summary": "한 줄 요약",
      "markdown": "# Wiki 제목\\n\\n## 개요\\n...",
      "tags": ["태그1", "태그2"]
    }}
  ]
}}"""
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
이제 LangGraph 워크플로우를 구현합니다.

Write builder_graph.py
192 lines
import json
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config import settings
from app.core.logger import logger
from app.prompts.builder_prompt import (
    WIKI_BUILDER_SYSTEM_PROMPT,
    CLASSIFY_DOCUMENT_PROMPT,
    ANALYZE_STRUCTURE_PROMPT,
    GENERATE_WIKI_PROMPT,
)


class WikiBuilderState(TypedDict, total=False):
    knowledge_space_id: int
    document_id: int
    document_text: str
    document_type: Optional[str]

    classified_type: str
    sections: List[Dict[str, Any]]

    wikis: List[Dict[str, Any]]
    error: Optional[str]


def _get_llm() -> AzureChatOpenAI:
    return AzureChatOpenAI(
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_key=settings.AZURE_OPENAI_API_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
        temperature=0,
    )


def _parse_json_response(content: str) -> Dict[str, Any]:
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
    return json.loads(content)


def load_document(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[load_document] document_id={state.get('document_id')}")
    return state


def classify_document(state: WikiBuilderState) -> WikiBuilderState:
    document_type = state.get("document_type")
    if document_type and document_type != "UNKNOWN":
        logger.info(f"[classify_document] Using provided type: {document_type}")
        return {**state, "classified_type": document_type}

    logger.info(f"[classify_document] Classifying document_id={state.get('document_id')}")
    llm = _get_llm()

    prompt = CLASSIFY_DOCUMENT_PROMPT.format(document_text=state["document_text"][:3000])
    messages = [
        SystemMessage(content=WIKI_BUILDER_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    response = llm.invoke(messages)
    result = _parse_json_response(response.content)
    classified_type = result.get("document_type", "UNKNOWN")

    logger.info(f"[classify_document] classified_type={classified_type}")
    return {**state, "classified_type": classified_type}


def analyze_structure(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[analyze_structure] document_id={state.get('document_id')}")
    llm = _get_llm()

    prompt = ANALYZE_STRUCTURE_PROMPT.format(
        document_type=state.get("classified_type", "UNKNOWN"),
        document_text=state["document_text"][:4000],
    )
    messages = [
        SystemMessage(content=WIKI_BUILDER_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    response = llm.invoke(messages)
    result = _parse_json_response(response.content)
    sections = result.get("sections", [])

    logger.info(f"[analyze_structure] sections_count={len(sections)}")
    return {**state, "sections": sections}


def generate_wiki(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[generate_wiki] document_id={state.get('document_id')}")
    llm = _get_llm()

    sections_str = json.dumps(state.get("sections", []), ensure_ascii=False)
    prompt = GENERATE_WIKI_PROMPT.format(
        document_type=state.get("classified_type", "UNKNOWN"),
        sections=sections_str,
        document_text=state["document_text"][:6000],
    )
    messages = [
        SystemMessage(content=WIKI_BUILDER_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    response = llm.invoke(messages)
    result = _parse_json_response(response.content)
    wikis = result.get("wikis", [])

    logger.info(f"[generate_wiki] wiki_count={len(wikis)}")
    return {**state, "wikis": wikis}


def generate_metadata(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[generate_metadata] wiki_count={len(state.get('wikis', []))}")
    wikis = state.get("wikis", [])
    for wiki in wikis:
        if not wiki.get("tags"):
            wiki["tags"] = []
        if not wiki.get("summary"):
            wiki["summary"] = wiki.get("title", "")
    return {**state, "wikis": wikis}


def save_wiki(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[save_wiki] Placeholder - actual save done in wiki_service")
    return state


def generate_embedding(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[generate_embedding] Placeholder - actual embedding done in embedding_service")
    return state


def save_vector(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[save_vector] Placeholder - actual vector save done in qdrant_service")
    return state


def build_graph():
    graph = StateGraph(WikiBuilderState)

    graph.add_node("load_document", load_document)
    graph.add_node("classify_document", classify_document)
    graph.add_node("analyze_structure", analyze_structure)
    graph.add_node("generate_wiki", generate_wiki)
    graph.add_node("generate_metadata", generate_metadata)
    graph.add_node("save_wiki", save_wiki)
    graph.add_node("generate_embedding", generate_embedding)
    graph.add_node("save_vector", save_vector)

    graph.add_edge(START, "load_document")
    graph.add_edge("load_document", "classify_document")
    graph.add_edge("classify_document", "analyze_structure")
    graph.add_edge("analyze_structure", "generate_wiki")
    graph.add_edge("generate_wiki", "generate_metadata")
    graph.add_edge("generate_metadata", "save_wiki")
    graph.add_edge("save_wiki", "generate_embedding")
    graph.add_edge("generate_embedding", "save_vector")
    graph.add_edge("save_vector", END)

    return graph.compile()


class WikiBuilderGraph:
    def __init__(self):
        self.graph = build_graph()

    def invoke(
        self,
        knowledge_space_id: int,
        document_id: int,
        document_text: str,
        document_type: Optional[str] = None,
    ) -> dict:
        state = {
            "knowledge_space_id": knowledge_space_id,
            "document_id": document_id,
            "document_text": document_text,
            "document_type": document_type,
        }
        return self.graph.invoke(state)


wiki_builder_graph = WikiBuilderGraph()
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
Service 계층을 구현합니다.

Write knowledge_space_service.py
32 lines
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
        return db.query(KnowledgeSpace).order_by(KnowledgeSpace.created_at.desc()).all()

    def get_by_id(self, db: Session, knowledge_space_id: int) -> KnowledgeSpace:
        ks = db.query(KnowledgeSpace).filter(KnowledgeSpace.id == knowledge_space_id).first()
        if not ks:
            raise NotFoundException(f"Knowledge Space를 찾을 수 없습니다. id={knowledge_space_id}")
        return ks


knowledge_space_service = KnowledgeSpaceService()
Write document_service.py
100 lines
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


document_service = DocumentService()
Write wiki_service.py
77 lines
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
Write embedding_service.py
38 lines
from typing import List
from langchain_openai import AzureOpenAIEmbeddings

from app.core.config import settings
from app.core.logger import logger
from app.core.exception import WikiBuilderException


class EmbeddingService:
    def __init__(self):
        self._embeddings = None

    def _get_embeddings(self) -> AzureOpenAIEmbeddings:
        if self._embeddings is None:
            self._embeddings = AzureOpenAIEmbeddings(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_deployment=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
            )
        return self._embeddings

    def generate(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        logger.info(f"[embedding_service] Generating embeddings for {len(texts)} texts")
        try:
            embeddings_model = self._get_embeddings()
            vectors = embeddings_model.embed_documents(texts)
            logger.info(f"[embedding_service] Generated {len(vectors)} embeddings")
            return vectors
        except Exception as e:
            raise WikiBuilderException(f"Embedding 생성 오류: {e}", status_code=500)


embedding_service = EmbeddingService()
Write qdrant_service.py
89 lines
import uuid
from typing import List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    PayloadSchemaType,
    Filter,
    FieldCondition,
    MatchValue,
)

from app.core.config import settings
from app.core.logger import logger
from app.core.exception import WikiBuilderException


class QdrantService:
    def __init__(self):
        self._client = None

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            kwargs = {"url": settings.QDRANT_URL}
            if settings.QDRANT_API_KEY:
                kwargs["api_key"] = settings.QDRANT_API_KEY
            self._client = QdrantClient(**kwargs)
        return self._client

    def _ensure_collection(self, vector_size: int) -> None:
        client = self._get_client()
        collections = [c.name for c in client.get_collections().collections]
        if settings.QDRANT_COLLECTION_NAME not in collections:
            client.create_collection(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            logger.info(f"[qdrant_service] Created collection: {settings.QDRANT_COLLECTION_NAME}")

    def upsert_wikis(
        self,
        wiki_ids: List[int],
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
    ) -> int:
        if not vectors:
            return 0

        try:
            self._ensure_collection(vector_size=len(vectors[0]))
            client = self._get_client()

            points = [
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={**payload, "wiki_id": wiki_ids[i]},
                )
                for i, (vector, payload) in enumerate(zip(vectors, payloads))
            ]

            client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=points,
            )
            logger.info(f"[qdrant_service] Upserted {len(points)} vectors")
            return len(points)
        except Exception as e:
            raise WikiBuilderException(f"Qdrant 저장 오류: {e}", status_code=500)

    def update_wiki_status(self, wiki_id: int, status: str) -> None:
        try:
            client = self._get_client()
            client.set_payload(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                payload={"status": status},
                points=Filter(
                    must=[FieldCondition(key="wiki_id", match=MatchValue(value=wiki_id))]
                ),
            )
            logger.info(f"[qdrant_service] Updated wiki_id={wiki_id} status={status}")
        except Exception as e:
            logger.warning(f"[qdrant_service] Failed to update wiki status in Qdrant: {e}")


qdrant_service = QdrantService()
이제 핵심 Document Analysis Service를 구현합니다.

Write analysis_service.py
99 lines
import time
from sqlalchemy.orm import Session

from app.graphs.builder_graph import wiki_builder_graph
from app.services.document_service import document_service
from app.services.wiki_service import wiki_service
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.schemas.response import AnalyzeDocumentResponse
from app.core.logger import logger
from app.core.exception import DocumentAnalysisException


class DocumentAnalysisService:
    def analyze(self, db: Session, document_id: int) -> AnalyzeDocumentResponse:
        start_time = time.time()

        document = document_service.get_by_id(db, document_id)
        logger.info(
            f"[analysis_service] Start analysis "
            f"document_id={document_id} "
            f"file_name={document.file_name} "
            f"knowledge_space_id={document.knowledge_space_id} "
            f"document_type={document.document_type.value}"
        )

        try:
            document_text = document_service.read_file(document.file_path)

            result = wiki_builder_graph.invoke(
                knowledge_space_id=document.knowledge_space_id,
                document_id=document.id,
                document_text=document_text,
                document_type=document.document_type.value,
            )

            wiki_data_list = result.get("wikis", [])
            if not wiki_data_list:
                raise DocumentAnalysisException("Wiki 초안이 생성되지 않았습니다.")

            saved_wikis = wiki_service.create_batch(
                db=db,
                knowledge_space_id=document.knowledge_space_id,
                document_id=document.id,
                wiki_data_list=wiki_data_list,
            )

            wiki_texts = [w.markdown for w in saved_wikis]
            vectors = embedding_service.generate(wiki_texts)

            payloads = [
                {
                    "knowledge_space_id": document.knowledge_space_id,
                    "document_id": document.id,
                    "title": w.title,
                    "status": w.status.value,
                    "document_type": document.document_type.value,
                    "tags": w.tags or [],
                }
                for w in saved_wikis
            ]

            embedding_count = qdrant_service.upsert_wikis(
                wiki_ids=[w.id for w in saved_wikis],
                vectors=vectors,
                payloads=payloads,
            )

            document_service.mark_analyzed(db, document)

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(
                f"[analysis_service] Completed "
                f"document_id={document_id} "
                f"wiki_count={len(saved_wikis)} "
                f"embedding_count={embedding_count} "
                f"elapsed_ms={elapsed_ms}"
            )

            return AnalyzeDocumentResponse(
                success=True,
                document_id=document_id,
                status="ANALYZED",
                wiki_count=len(saved_wikis),
                embedding_count=embedding_count,
                elapsed_ms=elapsed_ms,
            )

        except DocumentAnalysisException:
            document_service.mark_failed(db, document)
            raise
        except Exception as e:
            document_service.mark_failed(db, document)
            logger.error(f"[analysis_service] Error document_id={document_id}: {e}", exc_info=True)
            raise DocumentAnalysisException(f"AI 문서 분석 중 오류가 발생했습니다.")


document_analysis_service = DocumentAnalysisService()
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
이제 API 라우트를 구현합니다.

Write knowledge_spaces.py
42 lines
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.request import CreateKnowledgeSpaceRequest
from app.schemas.response import KnowledgeSpaceResponse, KnowledgeSpaceListResponse, KnowledgeSpaceListItem
from app.services.knowledge_space_service import knowledge_space_service

router = APIRouter(prefix="/api/v1/knowledge-spaces", tags=["Knowledge Spaces"])


@router.post("", response_model=KnowledgeSpaceResponse)
def create_knowledge_space(
    request: CreateKnowledgeSpaceRequest,
    db: Session = Depends(get_db),
):
    ks = knowledge_space_service.create(db, request)
    return KnowledgeSpaceResponse(
        success=True,
        knowledge_space_id=ks.id,
        name=ks.name,
        status=ks.status.value,
    )


@router.get("", response_model=KnowledgeSpaceListResponse)
def list_knowledge_spaces(db: Session = Depends(get_db)):
    items = knowledge_space_service.get_all(db)
    return KnowledgeSpaceListResponse(
        success=True,
        items=[
            KnowledgeSpaceListItem(
                knowledge_space_id=ks.id,
                name=ks.name,
                description=ks.description,
                status=ks.status.value,
                created_at=ks.created_at,
            )
            for ks in items
        ],
    )
Write documents.py
62 lines
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.response import DocumentUploadResponse, DocumentListResponse, DocumentListItem, AnalyzeDocumentResponse
from app.services.knowledge_space_service import knowledge_space_service
from app.services.document_service import document_service
from app.services.analysis_service import document_analysis_service

router = APIRouter(tags=["Documents"])


@router.post(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/documents",
    response_model=DocumentUploadResponse,
)
def upload_document(
    knowledge_space_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(default="UNKNOWN"),
    db: Session = Depends(get_db),
):
    knowledge_space_service.get_by_id(db, knowledge_space_id)
    doc = document_service.create(db, knowledge_space_id, file, document_type)
    return DocumentUploadResponse(
        success=True,
        document_id=doc.id,
        file_name=doc.file_name,
        document_type=doc.document_type.value,
        status=doc.status.value,
    )


@router.get(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/documents",
    response_model=DocumentListResponse,
)
def list_documents(knowledge_space_id: int, db: Session = Depends(get_db)):
    knowledge_space_service.get_by_id(db, knowledge_space_id)
    docs = document_service.get_by_knowledge_space(db, knowledge_space_id)
    return DocumentListResponse(
        success=True,
        items=[
            DocumentListItem(
                document_id=d.id,
                file_name=d.file_name,
                document_type=d.document_type.value,
                status=d.status.value,
                created_at=d.created_at,
            )
            for d in docs
        ],
    )


@router.post(
    "/api/v1/documents/{document_id}/analyze",
    response_model=AnalyzeDocumentResponse,
)
def analyze_document(document_id: int, db: Session = Depends(get_db)):
    return document_analysis_service.analyze(db, document_id)
Write wikis.py
85 lines
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.request import UpdateWikiRequest
from app.schemas.response import (
    WikiListResponse,
    WikiListItem,
    WikiDetailResponse,
    WikiUpdateResponse,
    WikiApproveResponse,
    WikiRejectResponse,
)
from app.services.wiki_service import wiki_service
from app.services.qdrant_service import qdrant_service

router = APIRouter(tags=["Wikis"])


@router.get(
    "/api/v1/knowledge-spaces/{knowledge_space_id}/wikis",
    response_model=WikiListResponse,
)
def list_wikis(knowledge_space_id: int, db: Session = Depends(get_db)):
    wikis = wiki_service.get_by_knowledge_space(db, knowledge_space_id)
    return WikiListResponse(
        success=True,
        items=[
            WikiListItem(
                wiki_id=w.id,
                title=w.title,
                summary=w.summary,
                status=w.status.value,
                version=w.version,
                tags=w.tags or [],
            )
            for w in wikis
        ],
    )


@router.get("/api/v1/wikis/{wiki_id}", response_model=WikiDetailResponse)
def get_wiki(wiki_id: int, db: Session = Depends(get_db)):
    w = wiki_service.get_by_id(db, wiki_id)
    return WikiDetailResponse(
        success=True,
        wiki_id=w.id,
        knowledge_space_id=w.knowledge_space_id,
        document_id=w.document_id,
        title=w.title,
        summary=w.summary,
        markdown=w.markdown,
        status=w.status.value,
        version=w.version,
        tags=w.tags or [],
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


@router.put("/api/v1/wikis/{wiki_id}", response_model=WikiUpdateResponse)
def update_wiki(wiki_id: int, request: UpdateWikiRequest, db: Session = Depends(get_db)):
    w = wiki_service.update(db, wiki_id, request)
    return WikiUpdateResponse(
        success=True,
        wiki_id=w.id,
        title=w.title,
        status=w.status.value,
        version=w.version,
    )


@router.post("/api/v1/wikis/{wiki_id}/approve", response_model=WikiApproveResponse)
def approve_wiki(wiki_id: int, db: Session = Depends(get_db)):
    w = wiki_service.approve(db, wiki_id)
    qdrant_service.update_wiki_status(wiki_id, "APPROVED")
    return WikiApproveResponse(success=True, wiki_id=w.id, status=w.status.value)


@router.post("/api/v1/wikis/{wiki_id}/reject", response_model=WikiRejectResponse)
def reject_wiki(wiki_id: int, db: Session = Depends(get_db)):
    w = wiki_service.reject(db, wiki_id)
    qdrant_service.update_wiki_status(wiki_id, "REJECTED")
    return WikiRejectResponse(success=True, wiki_id=w.id, status=w.status.value)
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
Write main.py
45 lines
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.database import create_tables
from app.core.exception import (
    WikiBuilderException,
    wiki_builder_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.api import knowledge_spaces, documents, wikis

app = FastAPI(
    title="AI Wiki Builder",
    description="문서를 업로드하고 AI가 Wiki를 자동 생성하는 서비스",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(WikiBuilderException, wiki_builder_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(knowledge_spaces.router)
app.include_router(documents.router)
app.include_router(wikis.router)


@app.on_event("startup")
def startup_event():
    create_tables()


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "UP"}
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
Write requirements.txt
17 lines
fastapi==0.115.0
uvicorn==0.30.6
pydantic==2.9.2
pydantic-settings==2.5.2
python-dotenv==1.0.1
langgraph==0.2.38
langchain==0.3.3
langchain-openai==0.2.3
langchain-core==0.3.10
openai==1.51.2
sqlalchemy==2.0.35
alembic==1.13.3
psycopg2-binary==2.9.9
qdrant-client==1.11.3
httpx==0.27.2
python-multipart==0.0.12
Write Dockerfile
23 lines
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN mkdir -p app/storage/uploads

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
Write README.md
162 lines
# AI Wiki Builder Service

FastAPI 기반 AI Wiki 자동 생성 서비스입니다.

## 프로젝트 개요

문서를 업로드하면 LangGraph 워크플로우가 Azure OpenAI를 활용해 Wiki 초안을 자동 생성합니다.  
생성된 Wiki는 검수 후 승인/반려할 수 있으며, 승인된 Wiki는 Qdrant에 벡터로 저장되어 AI Assistant의 Knowledge Base로 활용됩니다.

## 프로젝트 구조

```
wiki-builder-service/
├── app/
│   ├── main.py                    # FastAPI 앱 진입점
│   ├── api/
│   │   ├── knowledge_spaces.py    # Knowledge Space API
│   │   ├── documents.py           # 문서 업로드/분석 API
│   │   └── wikis.py               # Wiki CRUD API
│   ├── services/
│   │   ├── knowledge_space_service.py
│   │   ├── document_service.py
│   │   ├── wiki_service.py
│   │   ├── embedding_service.py
│   │   ├── qdrant_service.py
│   │   └── analysis_service.py    # LangGraph 분석 오케스트레이터
│   ├── schemas/
│   │   ├── request.py
│   │   └── response.py
│   ├── models/
│   │   ├── knowledge_space.py
│   │   ├── document.py
│   │   └── wiki.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── logger.py
│   │   └── exception.py
│   ├── graphs/
│   │   └── builder_graph.py       # LangGraph 워크플로우
│   ├── prompts/
│   │   └── builder_prompt.py
│   └── requirements.txt
├── Dockerfile
└── README.md
```

## 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다.

```env
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-small

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wiki_builder

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=wiki_embeddings

STORAGE_PATH=app/storage/uploads
PORT=8000
LOG_LEVEL=INFO
```

## 실행 방법

```bash
cd wiki-builder-service
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker 실행 방법

```bash
docker build -t wiki-builder .
docker run -p 8000:8000 --env-file .env wiki-builder
```

## Swagger UI

서버 실행 후 브라우저에서 접속:

```
http://localhost:8000/docs
```

## API 예제

### Knowledge Space 생성

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-spaces \
  -H "Content-Type: application/json" \
  -d '{"name": "AI 비전 검사 시스템", "description": "비전 검사 시스템 사용자 매뉴얼"}'
```

### 문서 업로드

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-spaces/1/documents \
  -F "file=@vision_manual.txt" \
  -F "document_type=USER_MANUAL"
```

### AI 문서 분석 실행

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/analyze
```

### Wiki 목록 조회

```bash
curl http://localhost:8000/api/v1/knowledge-spaces/1/wikis
```

### Wiki 상세 조회

```bash
curl http://localhost:8000/api/v1/wikis/1
```

### Wiki 수정

```bash
curl -X PUT http://localhost:8000/api/v1/wikis/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "수정된 제목", "summary": "수정된 요약", "markdown": "# 수정된 내용"}'
```

### Wiki 승인

```bash
curl -X POST http://localhost:8000/api/v1/wikis/1/approve
```

### Wiki 반려

```bash
curl -X POST http://localhost:8000/api/v1/wikis/1/reject
```

### Health Check

```bash
curl http://localhost:8000/health
```

## PoC 제약사항

- 문서 형식은 `.txt`만 지원합니다.
- 인증/권한은 적용되지 않습니다.
- 문서는 Local File System에 저장됩니다.
- 비동기 Queue는 적용되지 않습니다.
- PDF, DOCX, XLSX, CSV는 후속 확장 대상입니다.
Update Todos

Create project directory structure

Implement core modules (config, database, logger, exception)

Implement SQLAlchemy models (knowledge_space, document, wiki)

Implement Pydantic schemas (request, response)

Implement builder_prompt.py

Implement LangGraph builder_graph.py

Implement service layer (5 services)

Implement API routes (knowledge_spaces, documents, wikis)

Implement main.py (FastAPI app)

Create requirements.txt, Dockerfile, README.md
최종 파일 구조를 확인합니다.

Bash Verify all created files
IN
find /Users/jbpark/workspace/2026-ai-master/wiki-builder-service -type f | sort

OUT
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/Dockerfile
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/README.md
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/api/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/api/documents.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/api/knowledge_spaces.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/api/wikis.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/core/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/core/config.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/core/database.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/core/exception.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/core/logger.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/graphs/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/graphs/builder_graph.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/main.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/models/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/models/document.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/models/knowledge_space.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/models/wiki.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/prompts/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/prompts/builder_prompt.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/requirements.txt
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/schemas/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/schemas/request.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/schemas/response.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/__init__.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/analysis_service.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/document_service.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/embedding_service.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/knowledge_space_service.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/qdrant_service.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/app/services/wiki_service.py
/Users/jbpark/workspace/2026-ai-master/wiki-builder-service/prd-builder.md
모든 파일이 생성되었습니다. PRD 기준으로 구현이 완료되었습니다.

구현 완료 요약
PRD 지시서를 바탕으로 wiki-builder-service 전체를 구현했습니다.

생성된 파일 (33개)
레이어	파일
Core	config.py, database.py, logger.py, exception.py
Models	knowledge_space.py, document.py, wiki.py
Schemas	request.py, response.py
LangGraph	builder_graph.py - 9단계 워크플로우
Prompts	builder_prompt.py
Services	analysis_service.py, document_service.py, wiki_service.py, embedding_service.py, qdrant_service.py, knowledge_space_service.py
API	knowledge_spaces.py, documents.py, wikis.py
App	main.py
인프라	requirements.txt, Dockerfile, README.md
다음 단계
.env 파일을 생성하고 Azure OpenAI / PostgreSQL / Qdrant 연결 정보를 설정한 뒤 실행하면 됩니다:


cd wiki-builder-service
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload