# AI Wiki Builder Service — PRD (구현 현황)


## 목표

AI Wiki Builder를 FastAPI 기반 독립 서비스로 개발한다.

POC 수준의 프로젝트로, Frontend가 AI Wiki Builder API를 직접 호출한다.

사용자는 Knowledge Space를 생성한 뒤 문서를 업로드하고, AI 문서 분석을 실행하여 Wiki 초안을 생성한다.

생성된 Wiki는 검수 후 승인/반려할 수 있으며, 승인된 Wiki는 Qdrant에 벡터로 저장되어 AI Assistant(별도 `assistant-service`)의 Knowledge Base로 활용된다.

⸻

## 시스템 구조

```
Frontend (별도 frontend/ 프로젝트)
     │
HTTP REST
     ▼
AI Wiki Builder (FastAPI, wiki-builder-service)
     │
     ▼
builder_graph.py (LangGraph)
     │
     ├── Google Gemini (LLM + Embedding)
     ├── PostgreSQL
     └── Qdrant
```

POC 단계이므로 별도 Backend 없이 Frontend가 FastAPI를 직접 호출한다. 인증/권한은 적용하지 않는다.

> **Google Gemini(`google-genai` SDK)**로 LLM 및 Embedding을 모두 처리한다.

⸻

## 프로젝트 구조 (실제)

```
wiki-builder-service/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── knowledge_spaces.py
│   │   ├── documents.py
│   │   └── wikis.py
│   ├── services/
│   │   ├── knowledge_space_service.py
│   │   ├── document_service.py
│   │   ├── wiki_service.py
│   │   ├── embedding_service.py
│   │   ├── qdrant_service.py
│   │   └── analysis_service.py     # LangGraph 오케스트레이션 (DocumentAnalysisService)
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
│   │   └── builder_graph.py
│   ├── prompts/
│   │   └── builder_prompt.py
│   ├── storage/uploads/
│   └── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

⸻

## 구현된 주요 기능

* Knowledge Space 생성 / 목록 조회 / 삭제(soft delete)
* 문서 업로드 (`.txt`만 허용)
* 문서 목록 조회
* AI 문서 분석 실행 (LangGraph 워크플로우)
* 분석 결과에 따른 문서 유형 자동 재분류 (업로드 시 지정한 타입과 AI 분류 결과가 다르면 갱신)
* Wiki 초안 생성 (문서 1건 → 여러 Wiki로 분리)
* Wiki 목록 / 상세 조회
* Wiki 수정 (버전 증가)
* Wiki 승인 / 반려 (Qdrant payload 상태 동기화)
* Embedding 생성 (Gemini Embedding)
* Qdrant 저장 및 상태(status) 업데이트
* Rate Limit / API 미응답 등 LLM 호출 오류에 대한 전용 예외 처리

⸻

## LangGraph Workflow

```
START
  ↓
load_document
  ↓
classify_document   ← document_type이 미지정/UNKNOWN일 때만 Gemini로 분류
  ↓
analyze_structure    ← Gemini로 섹션 구조 추출
  ↓
generate_wiki         ← Gemini로 Wiki 초안(JSON) 생성
  ↓
generate_metadata     ← tags/summary 기본값 보정
  ↓
save_wiki             ← Placeholder (실제 저장은 wiki_service에서 수행)
  ↓
generate_embedding    ← Placeholder (실제 임베딩은 embedding_service에서 수행)
  ↓
save_vector           ← Placeholder (실제 저장은 qdrant_service에서 수행)
  ↓
END
```

`WikiBuilderGraph.invoke()`는 `knowledge_space_id`, `document_id`, `document_name`, `document_text`, `document_type`을 받아 그래프를 실행한다. CLI 실행 코드는 없으며 API에서만 호출된다.

### LLM 호출 (`call_gemini`)

* `google.genai.Client`를 통해 Gemini(`settings.LLM_MODEL`, 기본값 `gemini-2.5-flash`)를 호출하는 공통 헬퍼.
* `GOOGLE_API_KEY`가 없으면 클라이언트를 생성하지 않고 `None`을 반환 → 각 노드는 빈 결과로 폴백한다(예: `sections: []`, `wikis: []`).
* Gemini `APIError` 발생 시 상태 코드에 따라 `RateLimitException`(429) 또는 `APIUnavailableException`(503)을 발생시켜 상위로 전파한다.

⸻

## Service 계층

FastAPI가 LangGraph를 직접 호출하지 않고 `DocumentAnalysisService`(`analysis_service.py`)를 통해서만 호출한다.

```python
class DocumentAnalysisService:
    def analyze(self, db: Session, document_id: int) -> AnalyzeDocumentResponse:
        document = document_service.get_by_id(db, document_id)
        document_text = document_service.read_file(document.file_path)

        result = wiki_builder_graph.invoke(
            knowledge_space_id=document.knowledge_space_id,
            document_id=document.id,
            document_name=document.file_name,
            document_text=document_text,
            document_type=document.document_type.value,
        )

        # AI 분류 결과가 기존 타입과 다르면 문서 타입 갱신
        # Wiki 저장 → Embedding 생성 → Qdrant 저장 → 문서 상태 ANALYZED
```

오류 발생 시(`RateLimitException`, `APIUnavailableException`, `DocumentAnalysisException`, 그 외 모든 예외) 문서 상태를 `FAILED`로 표시한 뒤 예외를 재전파한다.

⸻

## API 명세 (실제 라우트)

### Health Check

`GET /health` → `{"status": "UP"}`

⸻

### Knowledge Space 생성

`POST /api/v1/knowledge-spaces`

Request
```json
{ "name": "AI 비전 검사 시스템", "description": "..." }
```
Response
```json
{ "success": true, "knowledge_space_id": 1, "name": "AI 비전 검사 시스템", "status": "ACTIVE" }
```

### Knowledge Space 목록 조회

`GET /api/v1/knowledge-spaces` — `status = ACTIVE`인 항목만 반환한다.

### Knowledge Space 삭제

`DELETE /api/v1/knowledge-spaces/{knowledge_space_id}`

* 실제 레코드는 삭제하지 않고 `status`를 `INACTIVE`로 변경하는 **soft delete**로 구현되어 있다.
* 응답은 생성/조회와 동일한 `KnowledgeSpaceResponse` 형태로, 변경된 `status`를 반환한다.

⸻

### 문서 업로드

`POST /api/v1/knowledge-spaces/{knowledge_space_id}/documents` (multipart/form-data: `file`, `document_type`)

* `.txt` 확장자만 허용 (`ALLOWED_EXTENSIONS = {".txt"}`).
* 저장 경로: `app/storage/uploads/{knowledge_space_id}/{file_name}`
* `document_type`이 `DocumentType` enum 값이 아니면 `UNKNOWN`으로 저장한다.

### 문서 목록 조회

`GET /api/v1/knowledge-spaces/{knowledge_space_id}/documents`

### AI 문서 분석 실행

`POST /api/v1/documents/{document_id}/analyze`

Response
```json
{
  "success": true,
  "document_id": 10,
  "status": "ANALYZED",
  "wiki_count": 8,
  "embedding_count": 8,
  "elapsed_ms": 5200
}
```

⸻

### Wiki 목록 / 상세 / 수정 / 승인 / 반려

* `GET /api/v1/knowledge-spaces/{knowledge_space_id}/wikis`
* `GET /api/v1/wikis/{wiki_id}`
* `PUT /api/v1/wikis/{wiki_id}` — 제목/요약/본문 수정, `version` 자동 증가
* `POST /api/v1/wikis/{wiki_id}/approve` — `status=APPROVED`, Qdrant payload 동기화
* `POST /api/v1/wikis/{wiki_id}/reject` — `status=REJECTED`, Qdrant payload 동기화

⸻

## 데이터 모델 (SQLAlchemy)

### knowledge_spaces

| 컬럼 | 설명 |
|---|---|
| id | PK |
| name | 이름 |
| description | 설명 |
| status | `ACTIVE` / `INACTIVE` (삭제 시 `INACTIVE`) |
| created_at / updated_at | 타임스탬프 |

### documents

| 컬럼 | 설명 |
|---|---|
| id | PK |
| knowledge_space_id | FK |
| file_name / file_path | 원본 파일명 / 저장 경로 |
| document_type | `USER_MANUAL` / `ERD` / `DATA_CATALOG` / `GLOSSARY` / `UNKNOWN` — 분석 후 AI 분류 결과로 갱신될 수 있음 |
| status | `UPLOADED` / `ANALYZED` / `FAILED` |
| created_at / updated_at | 타임스탬프 |

### wikis

| 컬럼 | 설명 |
|---|---|
| id | PK |
| knowledge_space_id / document_id | FK |
| title / summary / markdown | Wiki 본문 |
| status | `DRAFT` / `APPROVED` / `REJECTED` |
| version | 수정 시마다 +1 |
| tags | JSON 배열 |
| created_at / updated_at | 타임스탬프 |

⸻

## Qdrant Payload

```json
{
  "knowledge_space_id": 1,
  "document_id": 10,
  "wiki_id": 100,
  "title": "AI 모델 평가",
  "status": "DRAFT",
  "document_type": "USER_MANUAL",
  "tags": ["AI평가", "비전검사", "판정"]
}
```

승인/반려 시 `qdrant_service.update_wiki_status()`가 `wiki_id` 필터로 payload의 `status`만 갱신한다(임베딩 벡터는 최초 저장 시점 그대로 유지).

⸻

## AI Wiki Builder System Prompt / 세부 프롬프트

시스템 프롬프트(`WIKI_BUILDER_SYSTEM_PROMPT`)는 최초 지시서와 동일하게 유지된다. 문서 분류 프롬프트(`CLASSIFY_DOCUMENT_PROMPT`)는 이후 아래와 같이 보강되었다.

* 파일명(`document_name`)을 함께 전달하여 분류 정확도를 높임
* "UNKNOWN은 문서 내용이 전혀 부족하거나, 위 유형과 명확히 관련이 없을 때만 선택한다"는 가이드 추가로 UNKNOWN 남용을 방지

⸻

## Error Handling

`WikiBuilderException`을 베이스로 아래 하위 예외를 정의한다.

| 예외 | 상태 코드 | 용도 |
|---|---|---|
| `NotFoundException` | 404 | Knowledge Space / Document / Wiki 미존재 |
| `DocumentAnalysisException` | 500 | Wiki 초안 생성 실패 등 분석 오류 |
| `RateLimitException` | 429 | Gemini API 요청 한도 초과 |
| `APIUnavailableException` | 503 | Gemini API 응답 불가 |

전역 핸들러(`main.py`)가 `WikiBuilderException`, `RequestValidationError`, 그 외 `Exception`을 각각 처리하여 `{"success": false, "message": "..."}` 형태로 응답한다.

⸻

## 환경변수 (`.env.example` 기준)

```
# Google Gemini
GOOGLE_API_KEY=
LLM_MODEL=gemini-2.5-flash
EMBEDDING_MODEL=models/gemini-embedding-001

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wiki_builder

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=wiki_embeddings

# App
STORAGE_PATH=app/storage/uploads
PORT=8000
LOG_LEVEL=INFO
```

> 최초 지시서의 `AZURE_OPENAI_*` 환경변수는 더 이상 사용하지 않는다.

⸻

## CORS

POC이므로 모든 Origin을 허용한다(`allow_origins=["*"]`). 운영 전환 시 환경변수 기반 허용 Origin으로 교체가 필요하다.

⸻

## 실행

```bash
cd wiki-builder-service
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker

`Dockerfile`은 `python:3.12-slim` 기반이며 `gcc`, `libpq-dev`를 설치하고 `app/requirements.txt`를 설치한 뒤 `app/storage/uploads` 디렉터리를 생성하고 uvicorn으로 실행한다.

```bash
docker build -t wiki-builder .
docker run -p 8000:8000 --env-file .env wiki-builder
```

⸻

## requirements.txt (실제)

```
fastapi>=0.115.0
uvicorn>=0.30.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
python-dotenv>=1.0.0
langgraph>=0.2.0
langchain>=0.3.0
google-genai>=1.0.0
sqlalchemy>=2.0.0
alembic>=1.13.0
psycopg2-binary>=2.9.0
qdrant-client>=1.11.0
httpx>=0.27.0
python-multipart>=0.0.12
```

> 최초 지시서에 있던 `langchain-openai`, `openai`는 사용하지 않고 `google-genai`로 대체되었다.

⸻

## PoC 제약사항

* 문서 형식은 `.txt`만 지원한다.
* 인증/권한은 적용하지 않는다.
* 문서는 Local File System에 저장한다.
* PDF, DOCX, XLSX, CSV는 후속 확장 대상이다.
* 비동기 Queue는 적용하지 않는다.
* 장기 메모리는 구현하지 않는다.
* Knowledge Space 삭제는 물리 삭제가 아닌 soft delete(`INACTIVE`)이며, 연결된 문서/Wiki/Qdrant 벡터는 함께 정리되지 않는다.
* Wiki 승인 이후 `assistant-service`에서 검색 대상으로 사용한다.

⸻

## 완료 기준 (충족 여부)

* [x] Knowledge Space를 생성/조회/삭제할 수 있다.
* [x] TXT 문서를 업로드할 수 있다.
* [x] 업로드된 문서를 Local Storage에 저장할 수 있다.
* [x] AI 문서 분석 API를 호출하면 LangGraph가 실행된다.
* [x] Wiki 초안이 Markdown으로 생성된다.
* [x] Wiki가 PostgreSQL에 저장된다.
* [x] Wiki 본문 기준 Embedding이 생성된다(Gemini Embedding).
* [x] Embedding이 Qdrant에 저장된다.
* [x] Wiki 목록과 상세를 조회할 수 있다.
* [x] Wiki를 수정할 수 있다.
* [x] Wiki를 승인/반려할 수 있다.
* [x] 승인된 Wiki만 Assistant에서 검색 대상으로 사용할 수 있도록 상태값이 관리된다.
* [x] Docker에서 실행 가능하다.
* [x] Swagger에서 API 테스트가 가능하다.
* [x] LLM 호출 실패(Rate Limit / API 미응답)에 대한 전용 예외 처리가 추가되었다.
* [x] 문서 분석 시 AI 분류 결과로 문서 유형을 재보정한다.

⸻

## 향후 확장 (미구현)

* 분석 이력 저장, Prompt Version 관리, 재분석, 비동기 Queue, 실패 재처리 (최초 지시서상 Service Layer 확장 계획, 아직 미구현)
* Knowledge Space 삭제 시 연관 Document/Wiki/Qdrant 벡터 정리(cascade)
* PDF/DOCX/XLSX/CSV 등 문서 형식 확장
* 인증/권한 적용
