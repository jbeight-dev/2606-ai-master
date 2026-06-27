AI Wiki Builder Backend PRD 수정안

2. 기술 스택

영역	기술
Language	Python 3.12
API Framework	FastAPI
AI Workflow	LangGraph
LLM	Azure OpenAI / OpenAI API
DB	PostgreSQL
Vector DB	Qdrant
ORM	SQLAlchemy
Migration	Alembic
File Storage	MinIO / S3
Queue	Redis + Celery
Auth	Keycloak JWT
API Spec	OpenAPI 3.0
Deploy	Docker / Kubernetes

⸻

3. Backend 구성 추가

src/app
 ├─ api
 │   ├─ documents
 │   ├─ reviews
 │   ├─ wiki
 │   ├─ assistant
 │   └─ health
 │
 ├─ core
 │   ├─ config.py
 │   ├─ security.py
 │   ├─ database.py
 │   ├─ qdrant.py
 │   └─ logging.py
 │
 ├─ services
 │   ├─ document_service.py
 │   ├─ review_service.py
 │   ├─ wiki_service.py
 │   ├─ assistant_service.py
 │   ├─ embedding_service.py
 │   └─ vector_search_service.py
 │
 ├─ workers
 │   ├─ celery_app.py
 │   ├─ document_worker.py
 │   └─ embedding_worker.py
 │
 └─ main.py

⸻

4. 저장소 역할

PostgreSQL

PostgreSQL은 시스템의 Source of Truth이다.

관리 대상:

* 문서 메타데이터
* 문서 처리 상태
* Wiki 원본
* Wiki 버전
* Wiki 관계
* 검수 이력
* Workflow 실행 이력
* Assistant 질문/답변 로그

⸻

Qdrant

Qdrant는 승인된 Wiki의 의미 기반 검색을 담당한다.

관리 대상:

* 승인된 Wiki Chunk
* Chunk Embedding
* Wiki Item Metadata
* 문서 유형 Metadata
* Wiki 유형 Metadata
* Version Metadata

Qdrant에는 원본 데이터를 저장하지 않고, Assistant 검색에 필요한 Chunk와 Metadata만 저장한다.

⸻

5. Qdrant Collection 설계

Collection Name:

wiki_chunks

Point ID:

wiki_item_id + version + chunk_index

Vector:

embedding

Payload:

{
  "wiki_item_id": 101,
  "document_id": 1,
  "title": "설비 데이터 조회 화면",
  "item_type": "SCREEN",
  "document_type": "USER_MANUAL",
  "version": 3,
  "chunk_index": 0,
  "chunk_text": "설비 데이터 조회 화면은 설비 데이터를 조회하고 상태를 확인하는 화면입니다.",
  "status": "APPROVED"
}

⸻

6. ERD 수정 방향

기존 wiki_embeddings 테이블은 PostgreSQL에서 Vector를 직접 저장하는 구조였으므로 Qdrant 사용 시 역할을 변경한다.

기존

wiki_embeddings
- embedding vector
- chunk_text

변경

wiki_chunks
- id
- wiki_item_id
- document_id
- chunk_index
- chunk_text
- qdrant_point_id
- embedding_model
- token_count
- created_at

PostgreSQL에는 Qdrant Point를 추적하기 위한 메타데이터만 저장한다.
실제 Vector는 Qdrant에 저장한다.

⸻

7. 검수 승인 흐름 수정

기존:

1. 사용자가 검수 화면에서 Wiki Item 조회
2. 제목/설명/Markdown 수정
3. 승인 버튼 클릭
4. wiki_items.status = APPROVED
5. wiki_item_versions 생성
6. documents.status = APPROVED
7. Embedding Worker 실행
8. wiki_embeddings 저장
9. documents.status = INDEXED

변경:

1. 사용자가 검수 화면에서 Wiki Item 조회
2. 제목/설명/Markdown 수정
3. 승인 버튼 클릭
4. wiki_items.status = APPROVED
5. wiki_item_versions 생성
6. documents.status = APPROVED
7. Embedding Worker 실행
8. Wiki Markdown을 Chunk로 분리
9. Embedding 생성
10. Qdrant wiki_chunks Collection에 Vector 저장
11. PostgreSQL wiki_chunks 테이블에 qdrant_point_id 저장
12. documents.status = INDEXED

⸻

8. Assistant 답변 흐름 수정

기존:

1. 사용자 질문 입력
2. Assistant Graph 실행
3. 질문 의도 분석
4. 승인된 Wiki 검색
5. 관련 Wiki Context 구성
6. LLM 답변 생성
7. 출처 Wiki 반환
8. 질문/답변 로그 저장

변경:

1. 사용자 질문 입력
2. Assistant Graph 실행
3. 질문 의도 분석
4. 질문 Embedding 생성
5. Qdrant에서 승인된 Wiki Chunk 검색
6. Qdrant Payload의 wiki_item_id 기준으로 PostgreSQL Wiki 조회
7. 관련 Wiki Context 구성
8. LLM 답변 생성
9. 출처 Wiki 반환
10. 질문/답변 로그 저장

⸻

9. Assistant Graph Node 수정

retrieve_wiki

항목	내용
목적	승인된 Wiki Chunk를 Qdrant에서 의미 기반 검색
입력	question, keywords
처리	question embedding 생성 후 Qdrant search
출력	retrieved_items
조건	payload.status = APPROVED

⸻

build_context

항목	내용
목적	Qdrant 검색 결과와 PostgreSQL Wiki 원본을 조합하여 Context 생성
입력	retrieved_items
처리	wiki_item_id 기준 PostgreSQL 상세 조회
출력	context
포함 정보	title, markdown, chunk_text, relation, source

⸻

10. Phase 2 수정

기존:

OpenSearch 연동

변경:

Qdrant 검색 고도화

세부 항목:

* Hybrid Search 검토
* Metadata Filtering 강화
* Reranking 적용
* Chunk 전략 개선
* Wiki 관계 기반 Context 확장
* 유사 질문 추천

---
## 11. 개발 원칙 추가
- PostgreSQL은 원본 데이터와 상태 관리의 기준 저장소로 사용한다.
- Qdrant는 Assistant 검색을 위한 Vector 저장소로 사용한다.
- Qdrant에는 승인된 Wiki만 저장한다.
- Qdrant Payload에는 검색 필터에 필요한 최소 Metadata만 저장한다.
- Qdrant 검색 결과는 반드시 PostgreSQL의 Wiki 원본과 재검증한다.
- PostgreSQL과 Qdrant 간 정합성을 위해 qdrant_point_id를 관리한다.
:::
