다음 standalone html 디자인을 기준으로 Next.js 프로젝트 코드를 생성해줘.

기술 스택

* Next.js 15 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query

구현 조건

* HTML 디자인을 최대한 유지
* shadcn/ui Card, Button, Input 사용
* 반응형 지원
* 다크모드 지원
* TypeScript 타입 정의 포함
* 페이지 컴포넌트와 재사용 컴포넌트 분리

프로젝트 구조

app/
├─ (llm-wiki)/
│  ├─ layout.tsx                   ← 공통 사이드바 레이아웃
│  ├─ register/
│  │  └─ page.tsx                  ← 문서 등록
│  ├─ review/
│  │  └─ page.tsx                  ← AI 변환 결과 검수
│  ├─ explorer/
│  │  ├─ page.tsx                  ← Wiki 탐색 (트리뷰)
│  │  └─ [nodeId]/
│  │     └─ page.tsx               ← Wiki 노드 상세
│  └─ assistant/
│     └─ page.tsx                  ← AI Assistant 채팅

components/
├─ llm-wiki/
│  ├─ Sidebar.tsx                  ← 좌측 사이드바 (접기/펼치기)
│  ├─ WikiTree.tsx                 ← Wiki 트리 탐색기 (Systems/Screens/API/Tables/Glossary/Release)
│  ├─ WikiNodeDetail.tsx           ← Wiki 노드 상세 (메타/기능/API/테이블/FAQ)
│  ├─ DocumentList.tsx             ← 등록 문서 목록 (뱃지 포함)
│  ├─ AnalysisProgress.tsx         ← AI 분석 진행 단계 표시
│  ├─ ChatInterface.tsx            ← AI Assistant 채팅 UI
│  └─ ChatMessage.tsx              ← 채팅 메시지 + 출처 태그
├─ common/
│  ├─ StatusBadge.tsx              ← 상태 뱃지 (Approved / 검수 대기 / 분석 중)
│  └─ SourceTag.tsx                ← 출처 참조 태그 (Screen / API / Glossary / Table)

types/
└─ llm-wiki.ts                     ← WikiNode, Document, ChatMessage 타입 정의

lib/
└─ mock-api.ts                     ← Mock API (문서 목록, Wiki 노드, 채팅 응답)

산출물

1. 폴더 구조
2. 설치 명령어
3. 컴포넌트 코드
4. 페이지 코드
5. Mock API 코드

아래 HTML 디자인을 기반으로 구현
/docs/frontend/*.html