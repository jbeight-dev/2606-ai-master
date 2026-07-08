# PRD - AI Wiki Builder Service

> 작성 대상: AI Wiki Builder (wiki-builder-service)

---

# 1. 에이전트 워크플로우 (Agent Workflow)

## 1.1 문서 분류 · 구조 분석 Agent

- **구현 기능:** 업로드된 문서의 유형을 분류하고, 문서 내부의 주요 섹션 구조를 추출한다.

- **동작 원리:**
    1. 문서 업로드 시 지정된 `document_type`이 `UNKNOWN`이거나 비어있는지 확인한다.
    2. 지정된 타입이 없으면 문서 앞부분(최대 3000자)과 파일명을 Gemini에 전달해 `USER_MANUAL`/`ERD`/`DATA_CATALOG`/`GLOSSARY`/`UNKNOWN` 중 하나로 분류한다.
    3. 분류된(또는 지정된) 문서 유형을 기준으로 문서 앞부분(최대 4000자)을 Gemini에 전달해 섹션 제목·설명 목록을 JSON으로 추출한다.
    4. 분류 결과가 업로드 시점의 타입과 다르면 이후 서비스 계층에서 문서의 `document_type`을 갱신한다.
    5. 추출된 섹션 목록을 다음 단계(Wiki 생성)의 입력으로 전달한다.
    6. LLM 미응답(API Key 없음) 시 각각 `classified_type=UNKNOWN`, `sections=[]`로 폴백한다.

- **입력(Input):**
    - `document_name`, `document_text`, `document_type`(업로드 시 지정값)

- **출력(Output):**
    - `classified_type`(문서 유형), `sections`(섹션 제목/설명 리스트)

- **주요 기술:**
    - LangGraph (`StateGraph`) — `load_document → classify_document → analyze_structure` 노드
    - Google Gemini (`gemini-2.5-flash`, `google-genai` SDK)
    - Pydantic 기반 Settings, 커스텀 JSON 파서(`_parse_json_response`, 코드블록 마크다운 제거 후 `json.JSONDecoder.raw_decode`)

---

## 1.2 Wiki 생성 Agent

- **구현 기능:** 분석된 섹션 구조를 바탕으로 문서 1건을 의미 단위로 분리된 여러 개의 Wiki 초안(Markdown)으로 변환한다.

- **동작 원리:**
    1. 앞 단계에서 추출한 `sections`와 원본 문서(최대 6000자), 문서 유형을 프롬프트에 채워 Gemini에 전달한다.
    2. 의미적으로 독립된 주제마다 하나의 Wiki(제목/요약/Markdown 본문/태그)를 생성하도록 지시한다.
    3. 응답 JSON을 파싱하여 `wikis` 리스트를 얻는다.
    4. `generate_metadata` 노드에서 `tags`가 비어있으면 빈 배열로, `summary`가 비어있으면 제목으로 보정한다.
    5. `save_wiki → generate_embedding → save_vector`는 그래프 내에서는 로깅만 수행하는 Placeholder 노드이며, 실제 저장/임베딩/벡터화는 그래프 외부의 `DocumentAnalysisService`가 `wiki_service`/`embedding_service`/`qdrant_service`를 순서대로 호출해 수행한다.
    6. 최종적으로 문서 상태를 `ANALYZED`로 변경하고 생성된 Wiki 개수·임베딩 개수·소요 시간을 응답으로 반환한다.

- **입력(Input):**
    - `classified_type`, `sections`, `document_text`

- **출력(Output):**
    - `wikis`(title/summary/markdown/tags 배열) → PostgreSQL `wikis` 테이블에 `DRAFT` 상태로 저장

- **주요 기술:**
    - LangGraph (`generate_wiki → generate_metadata → save_wiki → generate_embedding → save_vector` 노드)
    - Google Gemini (system prompt: `WIKI_BUILDER_SYSTEM_PROMPT` — 원문에 없는 내용 생성 금지, 중복 통합, 표/리스트 유지 등 행동 원칙 명시)
    - SQLAlchemy (`Wiki` 모델), `DocumentAnalysisService` 오케스트레이션

---

# 2. 도구(Tool) 및 함수 연동

## 2.1 문서 업로드/파일 저장 Tool

- **구현 기능:** 사용자가 업로드한 `.txt` 문서를 검증하고 Local File System에 저장한다.

- **동작 원리:**

`document_service.validate_file()`이 파일명 존재 여부와 확장자(`.txt`만 허용)를 검사한다. 통과하면 `save_file()`이 `app/storage/uploads/{knowledge_space_id}/{file_name}` 경로에 파일을 저장하고, `Document` 레코드를 `document_type`(유효하지 않으면 `UNKNOWN`), `status=UPLOADED`로 생성한다. 분석 시점에는 `read_file()`이 저장된 경로에서 UTF-8 텍스트를 읽어 그래프의 입력으로 전달한다.

- **입력(Input):**
    - 업로드 파일(`UploadFile`), `knowledge_space_id`, `document_type`

- **출력(Output):**
    - 저장된 파일 경로(`file_path`), `Document` 레코드

- **주요 기술:**
    - FastAPI `UploadFile` / `python-multipart`
    - `shutil.copyfileobj`를 이용한 스트림 저장
    - SQLAlchemy `Document` 모델 (`DocumentType`, `DocumentStatus` Enum)

---

## 2.2 Embedding 생성 Tool

- **구현 기능:** 승인 전 Wiki 본문(Markdown)을 벡터로 변환한다.

- **동작 원리:**

`embedding_service.generate()`가 Wiki별 `markdown` 텍스트를 순회하며 Gemini Embedding API(`models/gemini-embedding-001`)를 호출하고, 각 응답의 `embeddings[0].values`를 모아 벡터 리스트로 반환한다. 입력 텍스트가 없으면 빈 리스트를 즉시 반환하며, 호출 실패 시 `WikiBuilderException`(500)을 발생시켜 상위(`DocumentAnalysisService`)에서 문서를 `FAILED`로 처리하게 한다.

- **입력(Input):**
    - Wiki `markdown` 텍스트 리스트

- **출력(Output):**
    - 임베딩 벡터 리스트(`List[List[float]]`)

- **주요 기술:**
    - Google Gemini Embedding (`google-genai` SDK, `embed_content`)

---

## 2.3 Qdrant 벡터 저장 Tool

- **구현 기능:** 생성된 Wiki 임베딩과 메타데이터(payload)를 Qdrant 컬렉션에 저장하고, 승인/반려 시 상태를 동기화한다.

- **동작 원리:**

`qdrant_service.upsert_wikis()`는 최초 호출 시 컬렉션이 없으면 벡터 차원(`vector_size`)에 맞춰 컬렉션을 생성하고 `status`/`knowledge_space_id`/`wiki_id`에 payload 인덱스를 건다. 이후 Wiki마다 UUID를 포인트 ID로 부여해 벡터와 `{knowledge_space_id, document_id, wiki_id, title, status, document_type, tags}` payload를 upsert한다. Wiki 승인/반려 시에는 `update_wiki_status()`가 `wiki_id` 필터로 payload의 `status` 필드만 갱신하며(벡터 재계산 없음), 실패해도 예외를 삼키고 경고 로그만 남긴다(승인/반려 자체는 실패하지 않도록).

- **입력(Input):**
    - `wiki_ids`, `vectors`, `payloads`(Wiki 저장 시) / `wiki_id`, `status`(승인·반려 시)

- **출력(Output):**
    - Qdrant에 upsert된 포인트 개수 / 상태 갱신 결과(로그)

- **주요 기술:**
    - `qdrant-client` (`PointStruct`, `Filter`+`FieldCondition`+`MatchValue`, `PayloadSchemaType`)
    - Cosine 거리 기반 `VectorParams`

---

# 3. 데이터 및 메모리 (RAG & Context)

## 3.1 Knowledge Base (PostgreSQL + Qdrant)

- **구현 기능:** 구조화된 메타데이터(Knowledge Space/Document/Wiki)는 PostgreSQL에, 검색용 벡터는 Qdrant에 이원화하여 저장한다.

- **동작 원리:**

PostgreSQL에는 `knowledge_spaces`(이름/설명/상태), `documents`(파일 경로/유형/상태), `wikis`(제목/요약/Markdown 본문/상태/버전/태그) 3개 테이블이 SQLAlchemy 모델로 정의되어 있다. Wiki가 생성되면 동일한 `wiki_id`를 키로 Qdrant에 벡터+payload가 함께 저장되어, 두 저장소가 `wiki_id` 기준으로 매핑된다. Knowledge Space 삭제는 물리 삭제가 아닌 `status=INACTIVE` soft delete이며, 연결된 Document/Wiki/Qdrant 벡터는 함께 정리되지 않는다(POC 제약).

- **입력(Input):**
    - Knowledge Space 생성 요청, 업로드 문서, 생성된 Wiki

- **출력(Output):**
    - PostgreSQL 레코드(Knowledge Space/Document/Wiki), Qdrant 포인트

- **주요 기술:**
    - SQLAlchemy + Alembic, PostgreSQL(`psycopg2-binary`)
    - Qdrant (`qdrant-client`)

---

## 3.2 검색(Retrieval) 또는 RAG

- **구현 기능:** wiki-builder-service 자체는 질의응답을 수행하지 않으며, 승인된(`APPROVED`) Wiki가 검색 가능한 벡터로 준비되도록 하는 역할까지만 담당한다.

- **동작 원리:**

Wiki가 승인되면 Qdrant payload의 `status`가 `APPROVED`로 갱신되고, 별도 서비스인 `assistant-service`가 이 `status=APPROVED` 필터를 사용해 Knowledge Base로 검색·활용한다. 즉 실제 Retrieval(유사도 검색) 로직은 이 서비스 범위 밖에 있으며, 본 서비스는 "검색 가능한 상태로 벡터를 만들어 두는" 데이터 준비 단계에 해당한다.

- **입력(Input):**
    - (assistant-service 관점) 사용자 질의 → 본 서비스 관점에서는 Wiki 승인 이벤트

- **출력(Output):**
    - `status=APPROVED` payload를 가진 검색 대상 벡터

- **주요 기술:**
    - Qdrant payload 필터링(`status` 필드), 서비스 간 데이터 계약(`wiki_id`, `document_type`, `tags`)

---

## 3.3 Context 구성

- **구현 기능:** LLM에 전달할 프롬프트를 단계별로 이전 단계 산출물을 누적하며 구성한다.

- **동작 원리:**

LangGraph의 `WikiBuilderState`(TypedDict)가 각 노드를 거치며 `document_text` → `classified_type` → `sections` → `wikis` 순으로 상태를 누적한다. 각 노드는 직전 단계 결과를 문자열/JSON으로 프롬프트 템플릿(`CLASSIFY_DOCUMENT_PROMPT`, `ANALYZE_STRUCTURE_PROMPT`, `GENERATE_WIKI_PROMPT`)에 채워 넣고, 원문 텍스트는 단계별로 길이를 제한(3000/4000/6000자)해 토큰 사용량을 통제한다. 모든 호출에는 동일한 `WIKI_BUILDER_SYSTEM_PROMPT`(행동 원칙: 원문 외 내용 생성 금지, 표/리스트 유지, 중복 통합 등)가 system instruction으로 공통 적용된다.

- **입력(Input):**
    - 이전 노드의 출력(`classified_type`, `sections`)과 원본 문서 텍스트

- **출력(Output):**
    - Gemini 호출용 완성된 system/user 프롬프트

- **주요 기술:**
    - LangGraph `StateGraph` / `TypedDict` 상태 관리
    - Python `str.format()` 기반 프롬프트 템플릿

---

## 3.4 Memory

- **구현 기능:** 미구현 — 세션 간 대화 이력이나 장기 메모리를 저장하지 않는다.

- **동작 원리:**

wiki-builder-service는 요청 단위로 문서 1건을 분석해 그래프를 실행하고 종료하는 단발성(stateless) 파이프라인이다. 이전 분석 이력(재분석 시 과거 결과 참조, 실패 재처리 등)은 POC 범위에서 제외된 향후 확장 항목으로 명시되어 있다.

- **입력(Input):**
    - 없음

- **출력(Output):**
    - 없음

- **주요 기술:**
    - (미적용)

---

## 3.5 최종 답변 생성

- **구현 기능:** 분석된 문서 구조를 사람이 검수 가능한 Wiki(Markdown)로 최종 생성한다.

- **동작 원리:**

`generate_wiki` 노드가 Gemini로부터 `{"wikis": [{"title", "summary", "markdown", "tags"}, ...]}` 형태의 JSON을 받아 파싱하고, `generate_metadata` 노드가 누락된 `tags`/`summary`를 기본값으로 보정한다. 이후 `wiki_service.create_batch()`가 각 Wiki를 `status=DRAFT`, `version=1`로 PostgreSQL에 저장한다. 사용자는 `PUT /wikis/{id}`로 제목/요약/본문을 수정(버전 자동 증가)할 수 있고, `POST /wikis/{id}/approve|reject`로 최종 승인·반려를 결정한다 — LLM은 승인 여부를 판단하지 않으며 최종 결정은 항상 사람이 내린다.

- **입력(Input):**
    - 섹션 구조, 원본 문서, 분류된 문서 유형

- **출력(Output):**
    - Wiki 레코드(title/summary/markdown/tags, `status=DRAFT`) → 사람 검수 후 `APPROVED`/`REJECTED`

- **주요 기술:**
    - Google Gemini (`gemini-2.5-flash`, temperature=0)
    - FastAPI 라우트(`PUT/POST /wikis/{id}`), SQLAlchemy 트랜잭션
