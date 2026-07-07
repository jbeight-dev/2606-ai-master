# AI Wiki Builder Service

FastAPI 기반 AI Wiki 자동 생성 서비스입니다.

## 프로젝트 개요

문서를 업로드하면 LangGraph 워크플로우가 LLM를 활용해 Wiki 초안을 자동 생성합니다.  
생성된 Wiki는 검수 후 승인/반려할 수 있으며, 승인된 Wiki는 Qdrant에 벡터(wiki_embeddings)로 저장되어 AI Assistant의 Knowledge Base로 활용됩니다.

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


    
    
    
  
    


       


    




    














    




    





     






ttings.QDRANT_URL}
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