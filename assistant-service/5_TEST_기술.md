# 테스트 및 기술 리서치 기록

> 테스트 과정에서 발견한 문제, 리서치 내용, 적용한 해결 방안 및 결과를 기록한다.
>
> **작성 대상**
> - LLM 품질 개선
> - 성능 최적화
> - 비용 절감
> - 예외 처리
> - 보안(Guardrail)
> - 운영 안정화
> - 기타 기술 검증

> **참고:** assistant-service는 아직 정식 품질 평가·부하 테스트를 수행하지 않은 PoC 단계입니다. 아래 내용은 코드에 이미 구현된 설계/대응 로직을 근거로 작성했으며, 수치가 필요한 항목(품질 평가 점수, 응답시간, 비용 절감액 등)은 실측 전이라 `TBD`로 표기했습니다.

---

# 1. 주요 문제 해결 및 기술 리서치

| 구분 | 문제 상황 | 원인 분석 | 리서치 내용 | 적용한 해결 방법 | 적용 기술 | 결과 | 비고 |
|------|----------|----------|-------------|----------------|----------|------|------|
| 품질(Hallucination) | Wiki 문서 범위를 벗어난 내용을 LLM이 추측해 답변할 위험 | 검색된 문서가 없거나 관련도가 낮아도 LLM이 그럴듯한 답변을 생성할 수 있음 | 근거 문서 유무·품질에 따라 프롬프트를 분기하고, 근거 부족 시 답변 자체를 거절하는 규칙 기반 게이트 필요성 확인 | `answer_generator`에 "문서에 근거한 내용만 답변, 추측 금지" 규칙을 명시한 프롬프트 적용 + `confidence_checker`가 최상위 유사도/문서 수/최신성으로 0~1점 산출, 0.5 미만이면 답변을 "정확한 답변이 어렵다"는 안내로 대체(FAIL) | Prompt Engineering, 규칙 기반 Confidence Scoring(`app/graphs/assistant_graph.py` `confidence_checker`) | PASS/FAIL 및 신뢰도(%)가 응답에 노출됨 | Faithfulness/Relevance 등 정량 평가(RAGAS 등)는 TBD |
| 성능 | 그래프가 8개 노드를 순차 실행하며 Gemini 호출 최대 3회(intent/rewrite/answer) + 임베딩 1회 + Qdrant 1회 + wiki-builder-service 조회(검색 문서 수만큼)가 누적되어 응답 지연 우려 | 모든 노드/외부 호출이 동기(sync)로 구현되어 있고 노드 간 병렬화 없이 순차 실행됨 | FastAPI 이벤트 루프 블로킹 방지를 위한 방법 검토 | `api/chat.py`에서 동기 서비스 호출을 `asyncio.to_thread`로 감싸 이벤트 루프 블로킹만 방지. 응답에 `elapsed_ms`를 포함해 추후 모니터링 가능하도록 설계 | `asyncio.to_thread`, 응답 스키마에 `elapsed_ms` 포함 | 이벤트 루프 블로킹은 방지되나 노드 자체의 병렬화·캐싱은 미적용 | 실측 응답시간/부하 테스트는 TBD |
| 비용 | 요청 1건당 Gemini 호출이 최대 4회(분류/재작성/임베딩/생성) 발생해 트래픽 증가 시 비용이 선형으로 누적됨 | 각 노드가 독립적으로 Gemini를 호출하며 캐싱·배치 처리가 없음 | 비용 측정 도구/캐싱 전략 미도입 상태 확인 | 아직 별도 최적화 미적용(향후 과제로 식별) | - | - | 비용 측정·절감 방안은 TBD |
| 보안 | 특정 Knowledge Space에 속한 질문에 다른 Space의 문서가 노출될 위험(멀티테넌시 데이터 격리) | Qdrant 벡터 payload는 승인 시점 스냅샷이라 이후 상태 변경(반려·Space 이동 등)과 어긋날 수 있음 | Qdrant 필터만으로는 실시간 정합성을 보장하기 어렵다는 점 확인 | `markdown_retriever`에서 1차로 Qdrant `Filter(status=APPROVED, knowledge_space_id=...)`로 검색하고, 2차로 wiki-builder-service에서 원문을 재조회해 `status`/`knowledge_space_id`를 다시 검증(불일치 시 제외)하는 이중 검증 적용 | Qdrant `Filter`/`FieldCondition`, 애플리케이션 레벨 재검증(`wiki_client.get_wiki`) | 코드 구현 완료 | 실제 Space 경계 침투 테스트는 TBD |
| 운영 | GOOGLE_API_KEY 미설정이나 Gemini/Qdrant/wiki-builder-service 중 하나라도 장애 시 전체 응답이 실패할 위험 | 외부 의존성이 3곳(Gemini, Qdrant, wiki-builder-service)이며 예외 처리가 없으면 하나의 장애가 전체 요청 실패로 전파됨 | 노드별 개별 폴백 전략의 필요성 확인 | `call_gemini`/`_embed_query`는 예외 시 `None` 반환 → 상위 노드가 키워드 분류/원문 재작성 생략/Mock 답변으로 대체, `qdrant_service.search`는 예외 시 빈 리스트 반환, `wiki_client.get_wiki`는 예외 시 `None` 반환(해당 문서만 제외), `ChatQuery` 저장 실패는 로그만 남기고 응답에는 영향 없음, 전역 예외는 `RequestValidationError`(400)/`Exception`(500) 핸들러로 공통 처리 | try/except 폴백 체인(`app/graphs/assistant_graph.py`, `app/services/*`), FastAPI 전역 예외 핸들러(`app/core/exception.py`) | 개별 컴포넌트 장애 시에도 요청 자체는 (품질 저하된 형태로) 응답됨 | 실제 장애 주입 테스트(Gemini/Qdrant/wiki-builder-service 다운)는 TBD |

---

# 2. LLM 답변 품질 평가

## 평가 개요

| 항목 | 내용 |
|------|------|
| 평가 대상 | `answer_generator` + `confidence_checker`가 산출하는 `final_answer` |
| 평가 목적 | Wiki 근거 기반 답변의 정확도·근거 충실도 검증 |
| 평가 데이터 | 미구축 (정식 평가 데이터셋 없음) |
| 평가 건수 | - |
| 평가 방식 | 현재는 규칙 기반 `confidence_checker`(유사도/문서수/최신성 점수화)만 존재하며, LLM-as-judge 등 자동 품질 평가는 미도입 |
| 평가 도구 | 미도입 (RAGAS 등 검토 필요) |

### 평가 결과

| 평가 지표 | 개선 전 | 개선 후 | 비고 |
|-----------|---------|---------|------|
| Faithfulness | TBD | TBD | 정량 평가 미실시 |
| Relevance | TBD | TBD | 정량 평가 미실시 |
| Correctness | TBD | TBD | 정량 평가 미실시 |
| Context Precision | TBD | TBD | 정량 평가 미실시 |
| Context Recall | TBD | TBD | 정량 평가 미실시 |
| Answer Similarity | TBD | TBD | 정량 평가 미실시 |

### 개선 내용

| 문제 | 개선 방법 | 적용 기술 | 효과 |
|------|-----------|----------|------|
| 근거 없는 답변 생성 위험 | `confidence_checker`로 근거 부족 시 답변을 안내 메시지로 대체 | 규칙 기반 Confidence Scoring | PASS/FAIL 구분으로 저신뢰 답변 노출 억제(정량 효과는 TBD) |

---

# 3. 성능 및 비용 최적화

## 성능 개선

| 항목 | 내용 |
|------|------|
| 기존 문제 | 그래프 8개 노드 + 외부 API(Gemini 최대 4회, Qdrant 1회, wiki-builder-service N회) 순차 호출로 인한 응답 지연 우려 |
| 원인 | 모든 노드/외부 호출이 동기(sync)이며 노드 간 병렬화·캐싱이 없음 |
| 개선 전략 | (현재 미적용) 후보: 임베딩/문서 조회 병렬화, 자주 묻는 질문 캐싱, wiki-builder-service 응답 캐싱 |
| 적용 기술 | `asyncio.to_thread`로 FastAPI 이벤트 루프 블로킹만 방지 |
| 테스트 환경 | 없음 |
| 개선 결과 | 없음 (실측 전) |

### 성능 측정

| 지표 | 개선 전 | 개선 후 | 개선율 |
|------|---------|---------|--------|
| 평균 응답시간 | TBD | TBD | TBD |
| P95 응답시간 | TBD | TBD | TBD |
| Throughput | TBD | TBD | TBD |
| Token 사용량 | TBD | TBD | TBD |

---

## 비용 최적화

| 항목 | 내용 |
|------|------|
| 기존 비용 구조 | 요청 1건당 Gemini 호출 최대 4회(intent 분류/쿼리 재작성/임베딩/답변 생성), 캐싱 없이 매 요청마다 재호출 |
| 최적화 전략 | 미적용 (향후 과제) |
| 적용 기술 | - |
| 절감 효과 | TBD |

---

# 4. 예외 처리 및 Guardrail

| 항목 | 내용 |
|------|------|
| 테스트 대상 | `POST /api/v1/chat` 전체 파이프라인 |
| 예외 상황 | (1) 빈 질문 요청 (2) `GOOGLE_API_KEY` 미설정 (3) Qdrant 장애/미응답 (4) wiki-builder-service 장애/미응답 (5) `ChatQuery` DB 저장 실패 |
| 탐지 방식 | Pydantic `field_validator`(빈 질문), 각 서비스 호출의 `try/except` |
| 대응 로직 | (1) 400 응답(`question cannot be empty`) (2) 키워드 기반 의도 분류 + Mock 답변으로 폴백 (3) 빈 검색 결과 반환 → "관련 문서를 찾지 못함" 응답 (4) 해당 문서만 제외하고 나머지로 진행 (5) 로그만 남기고 응답은 정상 반환 |
| 적용 기술 | Pydantic `field_validator`, FastAPI 전역 예외 핸들러(`RequestValidationError`→400, `Exception`→500), 노드별 `try/except` 폴백 |
| 테스트 결과 | 코드 상 로직 확인 완료. 실제 시나리오별 통합 테스트는 미실시 |

### 테스트 시나리오

| 시나리오 | 기대 결과 | 실제 결과 | 성공 여부 |
|----------|----------|----------|----------|
| 빈 문자열 질문 요청 | HTTP 400, `question cannot be empty` | 미검증(TBD) | 미검증 |
| `GOOGLE_API_KEY` 미설정 상태로 질문 | 키워드 기반 의도 분류 + `[Mock 답변]` 반환, 200 응답 유지 | 미검증(TBD) | 미검증 |
| Qdrant 연결 불가 | `retrieved_docs=[]` → "관련 문서를 찾지 못함" 응답, 200 응답 유지 | 미검증(TBD) | 미검증 |
| wiki-builder-service 응답 없음/404 | 해당 `wiki_id` 문서만 제외, 나머지 검색 결과로 계속 진행 | 미검증(TBD) | 미검증 |
| DB(`DATABASE_URL`) 연결 불가 | `ChatQuery` 저장 실패 로그만 남고 채팅 응답은 정상 반환 | 미검증(TBD) | 미검증 |

---

# 5. 운영 안정성

> PoC/개발 단계로 실제 운영 장애 이력은 없습니다. 아래는 코드 상 대비된 잠재 장애 유형과 설계된 대응입니다.

| 항목 | 내용 |
|------|------|
| 장애 유형 | (실제 이력 없음) 잠재 유형: Gemini/Qdrant/wiki-builder-service 순단, DB 연결 실패 |
| 원인 | 외부 서비스 네트워크 장애, API 쿼터 초과, 서비스 재시작 등(가정) |
| 대응 방법 | 각 계층의 `try/except` 폴백(4장 참고)으로 부분 장애 시에도 200 응답을 유지하도록 설계 |
| 재발 방지 | 재시도(retry)·서킷브레이커·헬스체크 기반 자동 복구는 미도입 |
| 운영 결과 | 실제 운영 이력 없음 (TBD) |

---

# 6. 기술 검증(PoC)

| 검증 항목 | 검토 내용 | 결론 | 비고 |
|-----------|----------|------|------|
| LangGraph 기반 멀티노드 RAG 파이프라인 구성 | Intent 분류→쿼리 재작성→검색→재정렬→Context 구성→답변 생성→신뢰도 검증까지 8개 노드를 `StateGraph`로 연결 | 가능 (구현 완료) | `app/graphs/assistant_graph.py` |
| Qdrant payload 필터를 통한 Knowledge Space 격리 | `status`/`knowledge_space_id` 필터 + wiki-builder-service 재조회로 이중 검증 | 가능 (구현 완료) | 3.2절, [poc_구현.md](poc_구현.md) 참고 |
| Gemini API 키 미설정 시 서비스 무중단 동작 | 각 LLM 호출 지점에 규칙 기반 폴백(키워드 분류/원문 유지/Mock 답변) 적용 | 가능 (구현 완료) | 실제 폴백 시나리오 통합 테스트는 TBD |
| LangGraph `checkpointer`를 통한 멀티턴 메모리 | 현재 `graph.compile()`에 `checkpointer` 미설정, 대화 이력은 로그(`chat_queries`)로만 저장되고 그래프에 재사용되지 않음 | 미적용 (단발성 stateless 파이프라인) | 후속 과제로 식별 |

---

# 7. 테스트 결과 요약

| 구분 | 개선 전 | 개선 후 |
|------|---------|---------|
| 답변 품질 | 해당 없음(최초 구현) | 규칙 기반 Confidence 게이트(PASS/FAIL) 도입, 정량 평가는 TBD |
| 응답 속도 | 해당 없음(최초 구현) | `elapsed_ms` 응답 포함, 실측 데이터는 TBD |
| 비용 | 해당 없음(최초 구현) | 별도 최적화 없음, 측정 데이터는 TBD |
| 안정성 | 해당 없음(최초 구현) | 노드별 폴백 체인 및 전역 예외 핸들러 적용, 장애 주입 테스트는 TBD |

---

# 8. Lessons Learned

### 잘된 점

- 각 LLM/외부 API 호출 지점(`call_gemini`, `_embed_query`, `qdrant_service.search`, `wiki_client.get_wiki`)에 개별 폴백을 두어, 하나의 외부 서비스가 실패해도 그래프 전체가 중단되지 않도록 설계했다.
- Knowledge Space 데이터 격리를 Qdrant 필터(1차) + wiki-builder-service 원문 재조회(2차)로 이중화해, 벡터 payload와 실제 문서 상태 간 불일치 위험을 줄였다.

### 아쉬운 점

- Faithfulness/Relevance 등 정량적 LLM 품질 평가 체계가 없어 답변 품질을 객관적으로 추적하지 못하고 있다.
- 응답시간·비용에 대한 실측 데이터가 없어 성능/비용 최적화 우선순위를 데이터 기반으로 판단하기 어렵다.
- 재시도·서킷브레이커 등 운영 안정화 장치가 없고, 장애 주입 테스트도 수행되지 않았다.

### 다음 단계

- 평가 데이터셋을 구축하고 RAGAS 등으로 Faithfulness/Context Precision·Recall을 측정한다.
- 부하 테스트로 평균/P95 응답시간과 Gemini 토큰 사용량(비용)을 실측한다.
- Gemini/Qdrant/wiki-builder-service 장애를 인위적으로 주입해 4장의 폴백 시나리오가 실제로 동작하는지 검증한다.
