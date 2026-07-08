# PRD - AI Wiki Assistant Service

> 작성 대상: AI Wiki Assistant (assistant-service)

---

# 1. 에이전트 워크플로우 (Agent Workflow)

## 1.1 Intent 분류 Agent

- **구현 기능:** 사용자 질문이 Wiki 검색이 필요한 질문인지, 검색 없이 답할 수 있는 일반 대화인지 판별해 이후 그래프 흐름을 분기한다.

- **동작 원리:**
    1. 사용자 질문(`question`)과 `user_id`, `knowledge_space_id`를 초기 상태로 그래프를 시작한다.
    2. `intent_classifier` 노드가 업무 용어/시스템 기능/매뉴얼/오류/정책 등 판단 기준을 명시한 프롬프트로 Gemini를 호출해 `wiki_question` 또는 `general_question` 중 하나를 얻는다.
    3. Gemini 응답이 없거나(키 미설정) 형식이 맞지 않으면 "안녕/고마워/감사/반가워/누구" 등 키워드 매칭으로 폴백 분류한다.
    4. `route_by_intent`가 `intent` 값에 따라 `query_rewrite`(wiki_question) 또는 `ask_clarification`(general_question)으로 분기한다.
    5. `general_question`인 경우 `ask_clarification` 노드가 "저는 wiki 기반으로 대답하는 AI Assistant 입니다" 고정 안내 문구를 `final_answer`로 반환하고 그래프를 종료한다.
    6. `wiki_question`인 경우 1.2의 RAG 파이프라인으로 이어진다.

- **입력(Input):**
    - `question`, `user_id`, `knowledge_space_id`

- **출력(Output):**
    - `intent`(`wiki_question` | `general_question`), 분기별 조기 종료 시 `final_answer`

- **주요 기술:**
    - LangGraph (`StateGraph`, `add_conditional_edges`) — `intent_classifier → (route_by_intent) → query_rewrite | ask_clarification`
    - Google Gemini (`gemini-2.5-flash`, `google-genai` SDK, temperature=0)
    - 키워드 매칭 기반 규칙 폴백 (Gemini 미응답 대비)

---

## 1.2 RAG 질의응답 Agent

- **구현 기능:** Wiki 관련 질문에 대해 벡터 검색으로 근거 문서를 확보하고, 이를 바탕으로 답변을 생성한 뒤 신뢰도를 검증해 최종 답변을 확정한다.

- **동작 원리:**
    1. `query_rewrite` 노드가 원 질문을 검색에 유리한 핵심 키워드 중심 쿼리로 재작성한다(Gemini, temperature=0; 실패 시 원 질문 그대로 사용).
    2. `markdown_retriever` 노드가 재작성된 쿼리를 임베딩한 뒤 Qdrant에서 유사 문서를 검색하고, 각 결과의 `wiki_id`로 wiki-builder-service에 원문을 조회해 `status=APPROVED` 및 `knowledge_space_id` 일치 여부를 재검증한다.
    3. `document_reranker` 노드가 유사도 점수에 최신성 가중치(2026-01-01 이후 갱신 시 +0.1)를 더해 문서 순서를 재정렬한다.
    4. `context_builder` 노드가 재정렬된 문서를 제목/본문/출처/갱신일 블록으로 조합해 하나의 컨텍스트 문자열로 합친다.
    5. `answer_generator` 노드가 컨텍스트 유무에 따라 다른 프롬프트로 Gemini를 호출해 답변을 생성한다(컨텍스트 없으면 일반 지식 기반 답변, Gemini 미응답 시 Mock 답변).
    6. `confidence_checker` 노드가 규칙 기반 점수를 계산해 PASS/FAIL을 판정하고 `final_answer`를 확정한 뒤, 서비스 계층(`AssistantService.chat`)이 질의 로그를 저장하고 `ChatResponse`를 반환한다.

- **입력(Input):**
    - `question`(재작성 전), `knowledge_space_id`

- **출력(Output):**
    - `rewritten_query`, `reranked_docs`(sources), `answer`, `confidence_score`/`confidence_result`, `final_answer`

- **주요 기술:**
    - LangGraph (`query_rewrite → markdown_retriever → document_reranker → context_builder → answer_generator → confidence_checker → END`)
    - Google Gemini 생성/임베딩 (`gemini-2.5-flash`, `models/gemini-embedding-001`)
    - Qdrant 벡터 검색, 규칙 기반 재정렬·신뢰도 스코어링(순수 Python)

---

# 2. 도구(Tool) 및 함수 연동

## 2.1 Qdrant 벡터 검색 Tool

- **구현 기능:** 질문 임베딩 벡터로 Qdrant 컬렉션에서 유사한 Wiki 벡터를 검색한다.

- **동작 원리:**

`qdrant_service.search()`는 `status=APPROVED` 조건을 기본으로 걸고, `knowledge_space_id`가 지정되면 해당 필터를 추가해 `Filter(must=[...])` 조건으로 `query_points`를 호출한다. 반환된 포인트의 `payload.wiki_id`와 유사도 점수(`score`, 소수 4자리 반올림)만 추출해 리스트로 돌려준다. 클라이언트는 최초 호출 시 지연 생성(lazy init)되며, 검색 중 예외가 발생하면 빈 리스트를 반환해 그래프가 중단되지 않도록 한다.

- **입력(Input):**
    - 질문 임베딩 벡터, `knowledge_space_id`(선택), `limit`(기본 5)

- **출력(Output):**
    - `{wiki_id, similarity_score}` 리스트

- **주요 기술:**
    - `qdrant-client` (`QdrantClient.query_points`, `Filter`/`FieldCondition`/`MatchValue`)

---

## 2.2 Wiki 원문 조회 Tool

- **구현 기능:** Qdrant가 반환한 `wiki_id`를 기준으로 wiki-builder-service에서 Wiki 원문(Markdown)과 최신 상태를 조회한다.

- **동작 원리:**

`wiki_client.get_wiki()`가 `WIKI_BUILDER_SERVICE_URL`로 설정된 wiki-builder-service의 `GET /api/v1/wikis/{wiki_id}`를 호출해 제목/본문/상태/`knowledge_space_id`/갱신일을 가져온다. Qdrant의 payload는 승인 시점 기준이라 최신 상태와 다를 수 있으므로, `markdown_retriever` 노드는 이 응답의 `status`가 `APPROVED`인지, `knowledge_space_id`가 요청과 일치하는지를 다시 한 번 검증해 불일치 시 해당 문서를 제외한다. 조회 실패(타임아웃·404 등) 시 `None`을 반환해 해당 문서를 건너뛴다.

- **입력(Input):**
    - `wiki_id`

- **출력(Output):**
    - Wiki 상세(`title`, `markdown`, `status`, `knowledge_space_id`, `updated_at`) 또는 `None`

- **주요 기술:**
    - `httpx` 동기 클라이언트 (timeout 5초), 서비스 간 REST 연동(wiki-builder-service)

---

## 2.3 Gemini 호출 Tool

- **구현 기능:** 그래프 전 구간(의도 분류/쿼리 재작성/답변 생성/임베딩)에서 공통으로 사용하는 Gemini 생성·임베딩 헬퍼를 제공한다.

- **동작 원리:**

`call_gemini()`와 `_embed_query()`는 `GOOGLE_API_KEY`가 설정된 경우에만 `genai.Client`를 생성해 각각 `generate_content`(`LLM_MODEL`, 기본 `gemini-2.5-flash`)와 `embed_content`(`EMBEDDING_MODEL`, 기본 `models/gemini-embedding-001`)를 호출한다. API 키가 없거나 호출 중 예외가 발생하면 `None`을 반환하며, 각 노드는 이 `None`을 감지해 규칙 기반 폴백(의도 분류 키워드 매칭, 재작성 시 원문 사용, 답변 생성 시 Mock 답변)으로 대체해 그래프가 항상 끝까지 실행되도록 한다.

- **입력(Input):**
    - 프롬프트 문자열(생성), 쿼리 텍스트(임베딩)

- **출력(Output):**
    - 생성 텍스트 또는 임베딩 벡터(`List[float]`), 실패 시 `None`

- **주요 기술:**
    - `google-genai` SDK (`genai.Client`, `models.generate_content`, `models.embed_content`)

---

# 3. 데이터 및 메모리 (RAG & Context)

## 3.1 Knowledge Base

- **구현 기능:** 검색 대상 벡터(Qdrant)는 wiki-builder-service가 적재한 것을 그대로 소비하고, assistant-service는 질의 로그만 자체 PostgreSQL에 별도 저장한다.

- **동작 원리:**

assistant-service는 Wiki 원문이나 임베딩을 직접 생성·저장하지 않는다. Wiki 승인/임베딩/Qdrant 적재는 모두 wiki-builder-service 책임이며, 본 서비스는 `QDRANT_COLLECTION_NAME`(기본 `wiki_embeddings`) 컬렉션을 조회 전용으로 사용한다. 대신 자체 PostgreSQL에 `chat_queries` 테이블(SQLAlchemy `ChatQuery` 모델)을 두어 매 요청의 `knowledge_space_id`, `user_id`, `question`, `intent`, `created_at`을 기록한다. 앱 기동 시(`main.py` startup 이벤트) `Base.metadata.create_all`로 테이블이 없으면 자동 생성된다.

- **입력(Input):**
    - (조회) Qdrant `wiki_embeddings` 컬렉션 / (기록) 매 채팅 요청

- **출력(Output):**
    - 검색된 벡터 포인트 / `chat_queries` 로그 레코드

- **주요 기술:**
    - Qdrant(조회 전용, 소유권은 wiki-builder-service), SQLAlchemy + PostgreSQL(`psycopg2-binary`, 자체 소유)

---

## 3.2 검색(Retrieval) 또는 RAG

- **구현 기능:** 재작성된 질문을 임베딩해 Qdrant에서 후보 문서를 찾고, 승인 상태와 Knowledge Space 범위를 재검증해 신뢰 가능한 문서만 남긴다.

- **동작 원리:**

`markdown_retriever` 노드가 [2.1 Qdrant 벡터 검색 Tool](#21-qdrant-벡터-검색-tool)로 상위 5개 후보를 얻은 뒤, 각 `wiki_id`에 대해 [2.2 Wiki 원문 조회 Tool](#22-wiki-원문-조회-tool)로 원문을 가져와 `status=APPROVED` 여부와 `knowledge_space_id` 일치 여부를 다시 확인한다(Qdrant payload와 원본 DB 상태 간 불일치를 대비한 이중 검증). 임베딩 생성이 실패하면 빈 문서 리스트로 즉시 폴백한다.

- **입력(Input):**
    - `rewritten_query`, `knowledge_space_id`

- **출력(Output):**
    - `retrieved_docs`(`doc_id`, `title`, `content`, `updated_at`, `source`, `similarity_score` 리스트)

- **주요 기술:**
    - Gemini Embedding + Qdrant 유사도 검색, wiki-builder-service REST 조회를 통한 재검증

---

## 3.3 Context 구성

- **구현 기능:** 검색된 문서를 신뢰도 순으로 재정렬하고 LLM에 전달할 하나의 컨텍스트 문자열로 조합한다.

- **동작 원리:**

`document_reranker` 노드는 `similarity_score`에 최신성 가점(문서 `updated_at`이 2026-01-01 이후면 +0.1)을 더한 값을 기준으로 내림차순 정렬한다. 이어서 `context_builder` 노드가 각 문서를 `## 제목 / 본문 / source / updated_at` 블록으로 만들고 `---` 구분자로 이어 붙여 `context` 문자열 하나로 합친다. 문서가 없으면 빈 문자열이 되고, 이 경우 답변 생성 단계에서 일반 지식 기반 프롬프트로 전환된다.

- **입력(Input):**
    - `retrieved_docs`

- **출력(Output):**
    - `reranked_docs`, `context`(LLM 프롬프트에 삽입될 Markdown 블록 조합)

- **주요 기술:**
    - 순수 Python 정렬/문자열 포맷팅 (LangGraph 상태 누적)

---

## 3.4 Memory

- **구현 기능:** 대화 맥락을 프롬프트에 되먹임하는 대화형 메모리는 없으며, 질의 이력만 감사/분석 목적으로 PostgreSQL에 기록한다.

- **동작 원리:**

각 `/api/v1/chat` 요청은 이전 턴과 무관하게 매번 새 `WikiAssistantState`로 그래프를 실행하는 단발성(stateless) 요청이다. `AssistantService.chat()`이 그래프 실행 후 `_save_chat_query()`를 호출해 `knowledge_space_id`/`user_id`/`question`/`intent`를 `chat_queries` 테이블에 저장하지만, 이 기록은 이후 요청의 프롬프트나 검색에 다시 사용되지 않는다(순수 로그). 저장 실패 시에도 예외를 삼키고 경고만 남겨 채팅 응답 자체에는 영향을 주지 않는다.

- **입력(Input):**
    - 없음(이전 대화를 조회하지 않음)

- **출력(Output):**
    - `chat_queries` 로그 레코드(다음 요청에 재사용되지 않음)

- **주요 기술:**
    - SQLAlchemy `Session`(요청마다 `SessionLocal()` 생성/커밋/종료)

---

## 3.5 최종 답변 생성

- **구현 기능:** 컨텍스트 기반으로 답변을 생성하고, 근거 문서의 양과 질을 규칙 기반으로 채점해 신뢰도와 함께 최종 답변을 확정한다.

- **동작 원리:**

`answer_generator`는 `context`가 있으면 "Wiki 문서에 근거한 내용만 답변, 추측 금지" 규칙을 명시한 프롬프트로, 없으면 일반 지식 기반 프롬프트로 Gemini를 호출한다(temperature=0.3). Gemini 미설정 시 근거 문서 출처만 나열하는 Mock 답변으로 대체한다. `confidence_checker`는 최상위 문서 유사도(0.8/0.5/0.3 구간별 0.5/0.3/0.1점), 문서 2건 이상(+0.2), Mock 답변이 아님(+0.2), 최신 문서 포함(+0.1)을 합산해 0~1 점수를 만들고, 0.5 이상이면 `PASS`로 답변에 신뢰도를 덧붙이고, 미만이면 `FAIL`로 "정확한 답변이 어렵다"는 안내로 대체한다. 서비스 계층은 여기에 `sources`(문서별 `wiki_id`/`title`/`similarity_score`)와 `elapsed_ms`를 더해 `ChatResponse`로 반환한다.

- **입력(Input):**
    - `context`, `question`, `reranked_docs`

- **출력(Output):**
    - `answer`, `confidence_score`/`confidence_result`, `final_answer` → `ChatResponse`(`answer`, `sources`, `elapsed_ms`)

- **주요 기술:**
    - Google Gemini (`gemini-2.5-flash`, temperature=0.3), 규칙 기반 신뢰도 스코어링(순수 Python)
    - FastAPI 응답 모델(`ChatResponse`, `WikiSource`)
