AI Wiki Builder FastAPI 서비스 개발 지시서

목표

AI Wiki Builder를 FastAPI 기반 독립 서비스로 개발한다.

POC 수준의 프로젝트로, Frontend가 AI Wiki Builder API를 직접 호출한다.

사용자는 Knowledge Space를 생성한 뒤 문서를 업로드하고, AI 문서 분석을 실행하여 Wiki 초안을 생성한다.

생성된 Wiki는 검수 후 승인할 수 있으며, 승인된 Wiki는 향후 AI Assistant의 Knowledge Base로 활용된다.

⸻

시스템 구조

Frontend
     │
HTTP REST
     ▼
AI Wiki Builder (FastAPI)
     │
     ▼
builder_graph.py (LangGraph)
     │
     ├── Azure OpenAI GPT-4.1
     ├── PostgreSQL
     └── Qdrant

POC 단계이므로 별도 Backend 없이 Frontend가 FastAPI를 직접 호출한다.

인증/권한은 적용하지 않는다.

⸻

프로젝트 구조

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
│   │   └── qdrant_service.py
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
│   ├── storage/
│   │   └── uploads/
│   └── requirements.txt
├── Dockerfile
└── README.md

⸻

주요 기능

* Knowledge Space 생성
* Knowledge Space 목록 조회
* 문서 업로드
* 문서 목록 조회
* AI 문서 분석 실행
* Wiki 초안 생성
* Wiki 목록 조회
* Wiki 상세 조회
* Wiki 수정
* Wiki 승인
* Wiki 반려
* Embedding 생성
* Qdrant 저장

⸻

LangGraph 리팩토링

builder_graph.py는 서비스에서 호출 가능한 구조로 작성한다.

class WikiBuilderGraph:
    def __init__(self):
        self.graph = build_graph()
    def invoke(
        self,
        knowledge_space_id: int,
        document_id: int,
        document_text: str,
        document_type: str | None = None
    ) -> dict:
        state = {
            "knowledge_space_id": knowledge_space_id,
            "document_id": document_id,
            "document_text": document_text,
            "document_type": document_type
        }
        return self.graph.invoke(state)

CLI 실행 코드는 제거하고 API에서만 호출하도록 한다.

⸻

LangGraph Workflow

START
  ↓
load_document
  ↓
classify_document
  ↓
analyze_structure
  ↓
generate_wiki
  ↓
generate_metadata
  ↓
save_wiki
  ↓
generate_embedding
  ↓
save_vector
  ↓
END

⸻

Service 계층

FastAPI가 LangGraph를 직접 호출하지 않는다.

중간 Service Layer를 둔다.

class DocumentAnalysisService:
    def analyze(self, document_id: int) -> AnalyzeDocumentResponse:
        document = document_service.get_document(document_id)
        document_text = document_service.read_document(document.file_path)
        result = wiki_builder_graph.invoke(
            knowledge_space_id=document.knowledge_space_id,
            document_id=document.id,
            document_text=document_text,
            document_type=document.document_type
        )
        return result

향후 다음 기능을 Service Layer에서 확장할 수 있도록 한다.

* Logging
* 분석 이력 저장
* Prompt Version 관리
* 재분석
* 비동기 Queue
* 실패 재처리

⸻

API 개발

Health Check

GET /health

응답

{
  "status": "UP"
}

⸻

Knowledge Space 생성

POST /api/v1/knowledge-spaces

Request

{
  "name": "AI 비전 검사 시스템",
  "description": "비전 검사 시스템 사용자 매뉴얼 기반 Wiki 생성 PoC"
}

Response

{
  "success": true,
  "knowledge_space_id": 1,
  "name": "AI 비전 검사 시스템",
  "status": "ACTIVE"
}

⸻

Knowledge Space 목록 조회

GET /api/v1/knowledge-spaces

⸻

문서 업로드

POST /api/v1/knowledge-spaces/{knowledge_space_id}/documents

Request

* multipart/form-data
* file
* document_type

document_type 예시

USER_MANUAL
ERD
DATA_CATALOG
GLOSSARY
UNKNOWN

처리 내용

* 파일을 Local Storage에 저장한다.
* 저장 경로: app/storage/uploads/{knowledge_space_id}/
* PostgreSQL에 문서 메타데이터를 저장한다.
* 문서 상태는 UPLOADED로 저장한다.

Response

{
  "success": true,
  "document_id": 10,
  "file_name": "vision_manual.txt",
  "document_type": "USER_MANUAL",
  "status": "UPLOADED"
}

⸻

AI 문서 분석 실행

POST /api/v1/documents/{document_id}/analyze

처리 내용

1. 문서 조회
2. 원본 파일 읽기
3. LangGraph Workflow 실행
4. 문서 유형 추론
5. 문서 구조 분석
6. Wiki 초안 생성
7. Wiki 메타데이터 생성
8. PostgreSQL 저장
9. Embedding 생성
10. Qdrant 저장
11. 분석 결과 반환

Response

{
  "success": true,
  "document_id": 10,
  "status": "ANALYZED",
  "wiki_count": 8,
  "embedding_count": 8,
  "elapsed_ms": 5200
}

⸻

Wiki 목록 조회

GET /api/v1/knowledge-spaces/{knowledge_space_id}/wikis

Response

{
  "success": true,
  "items": [
    {
      "wiki_id": 1,
      "title": "AI 모델 평가",
      "summary": "AI 모델이 이미지를 판정하는 절차를 설명한다.",
      "status": "DRAFT",
      "version": 1,
      "tags": ["AI평가", "비전검사", "판정"]
    }
  ]
}

⸻

Wiki 상세 조회

GET /api/v1/wikis/{wiki_id}

⸻

Wiki 수정

PUT /api/v1/wikis/{wiki_id}

Request

{
  "title": "AI 모델 평가",
  "summary": "AI 모델 판정 절차 설명",
  "markdown": "# AI 모델 평가\n\n..."
}

⸻

Wiki 승인

POST /api/v1/wikis/{wiki_id}/approve

처리 내용

* Wiki 상태를 APPROVED로 변경한다.
* Qdrant payload의 status를 APPROVED로 변경한다.
* AI Assistant는 APPROVED 상태의 Wiki만 검색 대상으로 사용한다.

⸻

Wiki 반려

POST /api/v1/wikis/{wiki_id}/reject

⸻

데이터 모델

knowledge_spaces

컬럼	설명
id	Knowledge Space ID
name	Knowledge Space 이름
description	설명
status	ACTIVE / INACTIVE
created_at	생성일
updated_at	수정일

documents

컬럼	설명
id	문서 ID
knowledge_space_id	Knowledge Space ID
file_name	원본 파일명
file_path	저장 경로
document_type	문서 유형
status	UPLOADED / ANALYZED / FAILED
created_at	생성일
updated_at	수정일

wikis

컬럼	설명
id	Wiki ID
knowledge_space_id	Knowledge Space ID
document_id	문서 ID
title	Wiki 제목
summary	요약
markdown	Wiki 본문
status	DRAFT / APPROVED / REJECTED
version	버전
tags	태그
created_at	생성일
updated_at	수정일

⸻

Qdrant Payload

{
  "knowledge_space_id": 1,
  "document_id": 10,
  "wiki_id": 100,
  "title": "AI 모델 평가",
  "status": "DRAFT",
  "document_type": "USER_MANUAL",
  "tags": ["AI평가", "비전검사", "판정"]
}

⸻

AI Wiki Builder System Prompt

당신은 AI Wiki Builder이다.
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
- 승인 여부는 판단하지 않는다.

⸻

Request Validation

Pydantic Model을 사용한다.

필수 검증

* Knowledge Space 이름은 비어 있을 수 없다.
* 문서 업로드 시 파일은 필수이다.
* PoC 단계에서는 .txt 파일만 허용한다.
* Wiki 제목과 본문은 비어 있을 수 없다.

⸻

Error Handling

다음을 처리한다.

* Azure OpenAI API 오류
* LangGraph 오류
* 파일 읽기 오류
* PostgreSQL 오류
* Qdrant 오류
* Timeout
* Validation 오류
* 예상하지 못한 Exception

오류 응답 형식

{
  "success": false,
  "message": "AI 문서 분석 중 오류가 발생했습니다."
}

⸻

Logging

다음 정보를 INFO 로그로 남긴다.

* Request Time
* Knowledge Space ID
* Document ID
* File Name
* Document Type
* Wiki Count
* Embedding Count
* Elapsed Time
* Error

민감한 원문 문서 전체와 Prompt 전체는 로그에 남기지 않는다.

⸻

환경변수

모든 설정은 환경변수로 관리한다.

AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_DEPLOYMENT_NAME=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=
DATABASE_URL=
QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=
STORAGE_PATH=app/storage/uploads
PORT=8000
LOG_LEVEL=INFO

⸻

CORS

POC이므로 모든 Origin을 허용한다.

*

운영 전환 시 환경변수 기반 허용 Origin으로 교체한다.

⸻

실행

uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload

⸻

Docker

Dockerfile을 작성한다.

조건

* Python 3.12
* requirements 설치
* uvicorn 실행
* storage 디렉터리 생성

⸻

requirements.txt

최소 포함

fastapi
uvicorn
pydantic
python-dotenv
langgraph
langchain
langchain-openai
openai
sqlalchemy
alembic
psycopg2-binary
qdrant-client
httpx
python-multipart

⸻

README 작성

다음을 포함한다.

* 프로젝트 개요
* 프로젝트 구조
* 실행 방법
* 환경변수 설정
* Docker 실행 방법
* API 예제
* curl 예제
* Swagger 주소
* PoC 제약사항

⸻

PoC 제약사항

* 문서 형식은 TXT만 지원한다.
* 인증/권한은 적용하지 않는다.
* 문서는 Local File System에 저장한다.
* PDF, DOCX, XLSX, CSV는 후속 확장 대상으로 둔다.
* 비동기 Queue는 적용하지 않는다.
* 장기 메모리는 구현하지 않는다.
* Wiki 승인 이후 Assistant 서비스에서 검색 대상으로 사용한다.

⸻

완료 기준

* Knowledge Space를 생성할 수 있다.
* TXT 문서를 업로드할 수 있다.
* 업로드된 문서를 Local Storage에 저장할 수 있다.
* AI 문서 분석 API를 호출하면 LangGraph가 실행된다.
* Wiki 초안이 Markdown으로 생성된다.
* Wiki가 PostgreSQL에 저장된다.
* Wiki 본문 기준 Embedding이 생성된다.
* Embedding이 Qdrant에 저장된다.
* Wiki 목록과 상세를 조회할 수 있다.
* Wiki를 수정할 수 있다.
* Wiki를 승인/반려할 수 있다.
* 승인된 Wiki만 Assistant에서 검색 대상으로 사용할 수 있도록 상태값이 관리된다.
* Docker에서 실행 가능하다.
* Swagger에서 API 테스트가 가능하다.