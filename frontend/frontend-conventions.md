# Frontend Development Conventions

> Version: 1.0
>
> 본 문서는 Frontend 개발 시 반드시 준수해야 하는 규약을 정의한다.
> AI(Claude, ChatGPT, Codex 등)가 코드를 생성할 때에도 본 규약을 따른다.

---

# 1. Tech Stack

- Framework : React
- Language : TypeScript
- Build Tool : Vite
- UI : Material UI (MUI)
- HTTP : Axios
- State Management
    - Local : useState
    - Server : React Query
- Routing : React Router
- Formatting : Prettier
- Lint : ESLint

---

# 2. Directory Structure

```
src/

    app/
        router/
        providers/

    pages/

    features/

    components/

    layouts/

    hooks/

    services/

    types/

    utils/

    constants/

    assets/
```

설명

| Directory | Description |
|------------|-------------|
| pages | 화면(Page) |
| features | 업무 기능 |
| components | 공통 컴포넌트 |
| layouts | Layout |
| hooks | Custom Hook |
| services | API 호출 |
| utils | Utility |
| constants | 상수 |
| types | 공통 Type |

---

# 3. Feature Structure

기능 단위로 구성한다.

예시

```
features/

    wiki/

        components/

        hooks/

        services/

        types/

        pages/

    document/

    assistant/
```

Feature 간 직접 참조를 최소화한다.

---

# 4. File Naming

컴포넌트

```
WikiCard.tsx

DocumentList.tsx
```

Hook

```
useWiki.ts

useSearch.ts
```

API

```
wiki.api.ts

document.api.ts
```

Type

```
wiki.types.ts

document.types.ts
```

Constant

```
wiki.constants.ts
```

Utility

```
date.util.ts

string.util.ts
```

---

# 5. Component Rules

## Named Export 사용

GOOD

```tsx
export function WikiCard() {

}
```

BAD

```tsx
export default function WikiCard() {

}
```

---

## Props Type 명시

GOOD

```tsx
type Props = {
    title: string;
}

export function WikiCard({ title }: Props) {

}
```

---

## 하나의 책임만 가진다.

Component는 하나의 역할만 수행한다.

GOOD

```
SearchBox

SearchResult

SearchFilter
```

BAD

```
SearchPage

↓

검색

조회

필터

팝업

API

전부 처리
```

---

# 6. Page Rules

Page는

- 화면 구성
- Event 처리

만 담당한다.

비즈니스 로직은 Hook으로 분리한다.

GOOD

```
Page

↓

Hook

↓

API
```

---

# 7. Custom Hook

복잡한 로직은 Hook으로 분리한다.

GOOD

```
useDocument()

useSearch()

useWiki()
```

Hook 내부에서

- API 호출
- 데이터 가공
- Event 처리

를 수행한다.

---

# 8. API Rules

API는 services에 작성한다.

GOOD

```ts
export async function getWikiList() {

}
```

BAD

```tsx
useEffect(() => {

    axios.get(...)

})
```

Component 내부에서 axios를 직접 호출하지 않는다.

---

# 9. React Query

조회 API는 React Query 사용

GOOD

```
useQuery()

useInfiniteQuery()
```

수정

```
useMutation()
```

조회 데이터를 useState에 저장하지 않는다.

---

# 10. State Management

우선순위

1. Local State

```
useState
```

↓

2. URL State

↓

3. React Query

↓

4. Global State

(Zustand)

불필요한 Global State를 만들지 않는다.

---

# 11. TypeScript

any 사용 금지

GOOD

```ts
type Wiki = {

}
```

BAD

```ts
const data: any
```

interface보다 type 사용을 권장한다.

---

# 12. Constants

하드코딩 금지

GOOD

```ts
export const PAGE_SIZE = 20;
```

BAD

```ts
limit=20
```

---

# 13. Utility

재사용 가능한 함수는 utils로 분리한다.

GOOD

```
formatDate()

truncate()

downloadFile()
```

---

# 14. Import Order

순서

```
React

↓

Library

↓

Components

↓

Hooks

↓

Services

↓

Types

↓

Utils

↓

Styles
```

예시

```tsx
import { useState } from "react";

import { Button } from "@mui/material";

import { SearchBox } from "@/components/SearchBox";

import { useSearch } from "../hooks/useSearch";

import { searchApi } from "../services/search.api";

import type { SearchItem } from "../types/search.types";
```

---

# 15. Error Handling

API 오류는 사용자에게 표시한다.

```
Snackbar

Alert

Dialog
```

console.log만 출력하지 않는다.

---

# 16. Loading

조회 중에는 Loading UI를 제공한다.

예시

```
Skeleton

CircularProgress
```

---

# 17. Empty State

조회 결과가 없을 경우 안내 메시지를 제공한다.

예시

```
검색 결과가 없습니다.
```

---

# 18. Code Style

한 함수는 50줄 이내를 권장한다.

한 Component는 300줄 이내를 권장한다.

중복 코드는 함수로 분리한다.

---

# 19. Comments

WHY를 설명한다.

WHAT은 코드로 표현한다.

GOOD

```ts
// API Rate Limit으로 인해 500ms Delay 적용
```

BAD

```ts
// 변수 선언
const data = ...
```

---

# 20. AI Code Generation Rules

AI는 아래 규칙을 반드시 따른다.

- Named Export 사용
- any 사용 금지
- TypeScript 사용
- Component 내부에서 axios 호출 금지
- API는 services에 작성
- Page는 UI만 담당
- Hook으로 비즈니스 로직 분리
- React Query 사용
- 하드코딩 금지
- 재사용 가능한 코드는 util로 분리
- Material UI 사용
- 기존 프로젝트 스타일을 유지
- 불필요한 라이브러리 추가 금지
- 기존 컴포넌트를 우선 재사용

---

# 21. Pull Request Checklist

- [ ] ESLint 통과
- [ ] Build 성공
- [ ] TypeScript 오류 없음
- [ ] 불필요한 Console 제거
- [ ] any 사용 없음
- [ ] API 분리 완료
- [ ] Loading 처리
- [ ] Error 처리
- [ ] Empty State 처리
- [ ] Component 재사용 확인