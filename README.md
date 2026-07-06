# 2605-ai-master

LLM Wiki 기반 문서 관리 및 AI Assistant PoC 프로젝트입니다.

## 프로젝트 소개

본 프로젝트는 문서를 Markdown 기반 Wiki 형태로 관리하고, AI Assistant를 통해 자연어로 문서를 탐색하고 질의응답할 수 있는 시스템입니다.

주요 기능

- Markdown Wiki 생성
- Wiki 문서 관리
- PostgreSQL 저장
- Vector DB 임베딩 저장
- LangGraph 기반 AI Assistant
- Google Gemini 연동
- RAG 기반 문서 검색 및 질의응답

---

# 프로젝트 구조

```text
2605-ai-master
│
├── frontend/
│   └── llm-wiki/               # Next.js Frontend
│
├── wiki-builder-service/       # Wiki 생성 서비스
│
├── assistant-service/          # AI Assistant
│
├── docs/                       # 설계 문서
│
└── README.md
```

---

# 시스템 구성

```text
                 +----------------------+
                 |      Frontend        |
                 |      Next.js         |
                 +----------+-----------+
                            |
                        REST API
                            |
          +-----------------+-----------------+
          |                                   |
          |                                   |
 +--------v---------+               +---------v----------+
 | Wiki Builder API |               | Assistant Service  |
 | FastAPI          |               | FastAPI            |
 +--------+---------+               +---------+----------+
          |                                   |
          |                             LangGraph
          |                                   |
          |                            Google Gemini
          |
          |
 PostgreSQL + Vector DB
```

---

# 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 15 |
| Language | TypeScript, Python |
| Backend | FastAPI |
| AI | Google Gemini |
| Workflow | LangGraph |
| Database | PostgreSQL |
| Vector DB | Qdrant |
| ORM | SQLAlchemy |
| UI | TailwindCSS, shadcn/ui |

---

# 실행 방법

## 0. Python 가상환경 생성

```bash
python3.12 -m venv myvenv
source myvenv/bin/activate
```

---

## 1. Frontend 실행

```bash
cd frontend/llm-wiki

npm install
npm run dev
```

---

## 2. Wiki Builder 실행

```bash
cd wiki-builder-service

pip install -r app/requirements.txt

uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload
```

---

## 3. Assistant Service 실행

```bash
cd assistant-service

pip install -r requirements.txt

uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --reload
```

---

# 서비스 접속

| 서비스 | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Wiki Builder Swagger | http://localhost:8000/docs |
| Assistant Swagger | http://localhost:8001/docs |

---

# 환경 변수

각 서비스의 `.env` 파일을 생성하여 필요한 환경 변수를 설정합니다.

예시

```env
GOOGLE_API_KEY=YOUR_API_KEY

DATABASE_URL=postgresql://username:password@localhost:5432/wiki

QDRANT_URL=http://localhost:6333

QDRANT_API_KEY=
```

---

# 프로젝트 기능

## Wiki Builder

- 문서 업로드
- Markdown Wiki 생성
- Wiki 저장
- Vector Embedding 생성
- PostgreSQL 저장

---

## AI Assistant

- LangGraph Workflow
- Intent 분석
- RAG 검색
- Wiki 기반 질의응답
- 일반 대화 지원

---

## Frontend

- Wiki 탐색
- AI Chat
- Markdown Viewer
- 문서 검색

---

# 개발 예정

- [x] Wiki Builder
- [x] AI Assistant
- [x] LangGraph Workflow
- [x] RAG 검색
- [ ] 문서 버전 관리
- [ ] 화면 Context 기반 Assistant
- [ ] Text-to-SQL
- [ ] Multi-Agent Workflow
- [ ] RAGAS 평가
- [ ] 사용자 인증

---

# 디렉터리 설명

| 디렉터리 | 설명 |
|-----------|------|
| frontend | Next.js UI |
| wiki-builder-service | Wiki 생성 API |
| assistant-service | AI Assistant API |
| docs | 설계 문서 |

---

# 개발 환경

- Python 3.12
- Node.js 22+
- npm 10+
- PostgreSQL
- Qdrant
- Google Gemini API

---

# 라이선스

본 프로젝트는 PoC(Proof of Concept) 목적으로 개발되었습니다.