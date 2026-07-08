# LLM Wiki — PRD

> 이 문서는 `frontend/llm-wiki`에 **현재 구현된** 내용을 기준으로 작성되었습니다. 미구현/향후 과제는 별도 섹션에 명시합니다.

## 1. 개요

LLM Wiki는 사내 문서(사용자 매뉴얼, ERD, 데이터 카탈로그, 용어집 등)를 업로드하면 AI가 자동으로 구조화된 Wiki 문서로 변환하고, 사람이 검수·승인한 뒤, AI Assistant가 승인된 Wiki를 근거로 질문에 답변하는 사내 지식 관리 시스템이다.

핵심 파이프라인: **문서 등록 → AI 분석/Wiki 생성 → 검수/승인 → 탐색 → AI Assistant 질의응답**

## 2. 배경 및 목적

- 설비/시스템 운영 지식(매뉴얼, DB 스키마, 용어 등)이 문서마다 흩어져 있어 검색·활용이 어려움.
- AI가 원본 문서를 분석해 구조화된 Wiki 초안을 자동 생성함으로써 지식 정리 비용을 낮춘다.
- 자동 생성된 초안은 사람의 검수(승인/반려/수정)를 거쳐야 신뢰 가능한 지식으로 인정되며, 승인된 Wiki만 AI Assistant의 답변 근거로 사용된다.

## 3. 대상 사용자

- 설비 운영자 / 사내 시스템 담당자 (사이드바 하단에 정적 표기: "설비 운영자", 인증 기능 없음)
- 별도의 로그인 없이 브라우저 `localStorage`에 생성된 익명 `user_id`로 식별됨 (`lib/user-id.ts`)

## 4. 정보 구조 및 핵심 개념

| 개념 | 설명 |
|---|---|
| **Knowledge Space** | 지식을 담는 최상위 컨테이너. 이름 + 한 줄 설명으로 생성. 모든 문서·Wiki는 특정 Space에 귀속됨 |
| **Document** | Space에 업로드된 원본 파일(`.txt`만 지원). 유형: `USER_MANUAL`, `ERD`, `DATA_CATALOG`, `GLOSSARY`, `UNKNOWN` |
| **Wiki** | 문서를 AI가 분석해 생성한 구조화 결과물(Markdown). 상태: `DRAFT` → `APPROVED` / `REJECTED`, 버전 관리(`version`) |
| **Chat** | 승인된 Wiki를 근거로 AI Assistant와 나누는 질의응답 세션(서버에 세션 저장 없이 클라이언트 메모리에서만 유지) |

## 5. 아키텍처 개요

- **프레임워크**: Next.js 16 (App Router), React 19, TypeScript
- **스타일링**: Tailwind CSS v4, shadcn/ui 기반 컴포넌트(`components/ui/*`)
- **데이터 페칭**: TanStack React Query (`lib/api.ts`)에서 모든 API 호출과 캐시 무효화를 관리
- **백엔드 연동**: 두 개의 독립 서비스 호출
  - `wiki-builder-service` — `NEXT_PUBLIC_WIKI_API_BASE_URL` (기본 `http://localhost:8000`): Knowledge Space, Document, Wiki CRUD/분석
  - `assistant-service` — `NEXT_PUBLIC_ASSISTANT_API_BASE_URL` (기본 `http://localhost:8001`): 채팅 질의응답
- **클라이언트 상태**:
  - `activeSpaceId`는 `localStorage`(`llm-wiki:active-space-id`)에 저장, `useSyncExternalStore`로 탭 간 동기화 (`lib/active-space.tsx`)
  - 익명 `user_id`도 `localStorage`(`llm-wiki:user-id`)에 저장 (`lib/user-id.ts`)
- **인증**: 없음. 사이드바 프로필 영역은 정적 표시.

## 6. 화면별 기능 명세

### 6.1 온보딩 — Knowledge Space 선택/생성 (`components/llm-wiki/OnboardingSpaces.tsx`)
- `activeSpaceId`가 없을 때 모든 라우트 대신 표시되는 최상위 게이트 화면 (`app/(llm-wiki)/layout.tsx`)
- 기존 Space 카드 목록 + "새 Knowledge Space" 카드
- Space 선택 시 `/register`로 이동하며 해당 Space가 활성화됨
- 새 Space 생성: 이름(필수) + 한 줄 설명(선택) 입력 모달(`CreateSpaceModal.tsx`), 생성 성공 시 자동으로 활성 Space로 설정

### 6.2 Space 전환 (`components/llm-wiki/SpaceSwitcher.tsx`)
- 활성 Space가 있을 때 상단에 고정 표시되는 드롭다운
- Space 목록에서 전환/생성/삭제 가능
- 삭제 시 확인 모달(`DeleteSpaceConfirmModal.tsx`) — "비활성화되며 문서·위키는 유지됨"을 안내 (소프트 삭제로 추정)
- 삭제 대상이 현재 활성 Space면 활성 Space를 해제

### 6.3 문서 등록 (`/register`, `app/(llm-wiki)/register/page.tsx`)
- 드래그앤드롭 또는 파일 선택으로 `.txt` 파일 업로드 (다중 업로드 지원, 순차 처리)
- 업로드된 문서 목록에 파일명, 문서 유형, 업로드 일시, 상태(`업로드됨`/`분석 완료`/`분석 실패`) 표시
- `업로드됨` 또는 `분석 실패` 상태의 문서에 대해 "분석 시작"/"다시 시도" 버튼 제공
- 분석 시작 시:
  - 5단계 시뮬레이션 진행 표시(문서 분류 → 구조 분석 → Wiki 초안 생성 → 임베딩 및 Vector 저장 → 검수 대기), 620ms 간격으로 자동 진행 — **실제 서버 진행률이 아닌 UI 연출용 타이머** (`types/llm-wiki.ts`의 `SimulatedAnalysisStep` 주석 참고)
  - 분석 API는 단일 블로킹 호출(`POST /api/v1/documents/{id}/analyze`)이며 응답 시 `document_id`, `status`, `wiki_count`, `embedding_count`, `elapsed_ms` 반환
  - 성공 시 문서/Wiki 목록 캐시 무효화, 완료 배지 표시 후 900ms 뒤 패널 자동 닫힘
  - 실패 시 에러 메시지 표시 (429 응답은 "AI 요청 한도를 초과했습니다" 별도 안내)
- 우측 안내 카드: 업로드 가이드(.txt만 지원, 분석 절차 안내)

### 6.4 AI 변환 결과 검수 (`/review`, `app/(llm-wiki)/review/page.tsx`)
- 상단 통계 카드: 전체 / 검수 대기 / 승인 / 반려 건수
- Wiki 목록을 카드로 표시, 각 카드 확장 시 AI 생성 Markdown 원문 표시
- `DRAFT` 상태에서 승인(✅)/반려(❌) 버튼 제공
- 확장 후 "수정" 버튼으로 Markdown 인라인 편집 → 저장(`PUT /api/v1/wikis/{id}`, title/summary/markdown 갱신)
- 승인된 항목은 "이제 AI Assistant가 이 내용을 참조합니다" 안내 + Assistant 바로가기 링크
- 사이드바 네비게이션에 검수 대기 건수 배지 표시(`Sidebar.tsx`)

### 6.5 Wiki 탐색 (`/explorer`, `app/(llm-wiki)/explorer/page.tsx`, `explorer/[wikiId]/page.tsx`)
- 활성 Space의 전체 Wiki를 문서 유형별(사용자 매뉴얼/ERD/데이터 카탈로그/용어집/기타)로 그룹화한 트리 표시(`WikiTree.tsx`)
- 제목/태그 기준 검색 필터
- Wiki 상세 페이지: 좌측 고정 트리 + 우측 상세 뷰
  - 상세 뷰: breadcrumb(Space/유형/제목), 상태 배지, 요약, 태그, 메타 정보(상태/버전/태그 수/최종 수정일), Markdown 렌더링 본문(`react-markdown` + `remark-gfm`)
- Wiki 상태(`DRAFT`/`APPROVED`/`REJECTED`)와 무관하게 탐색 가능 (승인 여부와 노출 여부의 관계는 백엔드 정책에 따름 — 프론트는 필터링하지 않음)

### 6.6 AI Assistant (`/assistant`, `app/(llm-wiki)/assistant/page.tsx`, `ChatInterface.tsx`)
- 승인된 Wiki를 근거로 자유 질의응답하는 채팅 UI
- 빈 상태에서 추천 질문 3종 제시 (예: "LOT이 무엇인가요?")
- 사용자 메시지/AI 응답을 말풍선으로 표시, AI 응답은 Markdown 렌더링
- 전송 시 `{ user_id, question, knowledge_space_id }`를 assistant-service에 전달, 응답의 `answer` 필드를 표시
- 에러 발생 시 대체 안내 메시지를 어시스턴트 말풍선 형태로 표시(`error` 플래그)
- 채팅 이력은 컴포넌트 상태에서만 유지되며 새로고침 시 소실됨 (서버 세션/영속화 없음)
- 응답에 `intent`, `rewritten_query`, `sources`(위키 출처 + 유사도), `elapsed_ms` 필드가 타입 정의되어 있으나 **현재 UI는 `answer`만 렌더링하고 나머지는 미사용**

## 7. 데이터 모델 (타입 기준, `types/llm-wiki.ts`)

```
KnowledgeSpace  { knowledge_space_id, name, description?, status(ACTIVE|INACTIVE), created_at? }
Document        { document_id, file_name, document_type, status(UPLOADED|ANALYZED|FAILED), created_at? }
AnalyzeResult   { document_id, status, wiki_count, embedding_count, elapsed_ms }
WikiSummary     { wiki_id, title, summary?, status(DRAFT|APPROVED|REJECTED), version, tags[] }
Wiki            extends WikiSummary + { knowledge_space_id, document_id, markdown, created_at?, updated_at? }
ChatRequest     { user_id, question, knowledge_space_id? }
ChatResponse    { success, intent?, rewritten_query?, answer?, sources?[{wiki_id,title,similarity_score}], elapsed_ms? }
```

## 8. API 연동 명세 (`lib/api.ts`)

**wiki-builder-service**
| 기능 | 메서드/경로 |
|---|---|
| Knowledge Space 생성 | `POST /api/v1/knowledge-spaces` |
| Knowledge Space 목록 | `GET /api/v1/knowledge-spaces` |
| Knowledge Space 삭제 | `DELETE /api/v1/knowledge-spaces/{id}` |
| 문서 업로드 | `POST /api/v1/knowledge-spaces/{id}/documents` (multipart: file, document_type) |
| 문서 목록 | `GET /api/v1/knowledge-spaces/{id}/documents` |
| 문서 분석(Wiki 생성) | `POST /api/v1/documents/{id}/analyze` |
| Wiki 목록 | `GET /api/v1/knowledge-spaces/{id}/wikis` |
| Wiki 상세 | `GET /api/v1/wikis/{id}` |
| Wiki 수정 | `PUT /api/v1/wikis/{id}` |
| Wiki 승인 | `POST /api/v1/wikis/{id}/approve` |
| Wiki 반려 | `POST /api/v1/wikis/{id}/reject` |

**assistant-service**
| 기능 | 메서드/경로 |
|---|---|
| 채팅 질의 | `POST /api/v1/chat` |

공통 에러 응답 형식: `{ success: false, message, detail? }` → `ApiRequestError(message, status)`로 변환되어 throw됨.

## 9. 비기능 요구사항 / 현재 제약

- **파일 형식**: 업로드는 `.txt`만 허용 (UI accept 필터 기준)
- **국제화**: UI 텍스트는 한국어로 고정(별도 i18n 레이어 없음)
- **인증/권한**: 없음. 익명 `user_id` 기반이며 Space/문서/Wiki에 대한 접근 제어 없음
- **다크모드**: Tailwind `dark:` 클래스 사용, 전역 테마 토글 UI는 미확인
- **분석 진행률**: 실제 서버 스트리밍이 아닌 클라이언트 사이드 시뮬레이션(타이머 기반)
- **채팅 세션 영속성**: 없음 — 새로고침 시 대화 이력 소실

## 10. 미구현 / 후속 과제로 보이는 부분

- `ChatResponse`의 `intent`, `rewritten_query`, `sources`, `elapsed_ms`를 UI에 노출(예: 출처 Wiki 링크, 유사도 표시)
- Wiki 반려(`REJECTED`) 이후 재작업/재제출 플로우
- 실제 서버 기반 분석 진행률(폴링/스트리밍)
- 인증/권한 관리, 사용자별 접근 제어
- `.txt` 외 포맷(PDF, DOCX 등) 지원
- Explorer에서 Wiki 승인 상태에 따른 노출 필터링 정책 명시

## 11. 참고: 주요 파일 경로

- 라우트: [app/(llm-wiki)/](app/(llm-wiki)/) — `register`, `review`, `explorer`, `explorer/[wikiId]`, `assistant`
- 레이아웃/게이트: [app/(llm-wiki)/layout.tsx](app/(llm-wiki)/layout.tsx)
- API 클라이언트/훅: [lib/api.ts](lib/api.ts)
- 전역 상태: [lib/active-space.tsx](lib/active-space.tsx), [lib/user-id.ts](lib/user-id.ts)
- 타입 정의: [types/llm-wiki.ts](types/llm-wiki.ts)
- 주요 컴포넌트: [components/llm-wiki/](components/llm-wiki/)
