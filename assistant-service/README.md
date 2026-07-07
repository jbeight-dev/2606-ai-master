# AI Wiki Assistant — FastAPI Service

LangGraph 기반 AI Wiki 어시스턴트를 FastAPI로 제공하는 서비스입니다.

---

## 프로젝트 구조

```
assistant-service/
├── app/
│   ├── main.py               # FastAPI 앱 진입점
│   ├── api/
│   │   └── chat.py           # POST /api/v1/chat 엔드포인트
│   ├── services/
│   │   └── assistant_service.py  # 서비스 레이어
│   ├── schemas/
│   │   ├── request.py        # ChatRequest
│   │   └── response.py       # ChatResponse
│   ├── core/
│   │   ├── config.py         # 환경변수 설정
│   │   ├── logger.py         # 로거
│   │   └── exception.py      # 전역 예외 핸들러
│   ├── graphs/
│   │   └── assistant_graph.py  # LangGraph Workflow
│   ├── prompts/
│   └── utils/
├── wiki/                     # Markdown 문서 (검색 대상)
│   └── user_manual.md
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## 환경변수

`.env.example`을 복사하여 `.env`를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

| 변수명 | 설명 | 기본값 |
|---|---|---|
| `GOOGLE_API_KEY` | Google Gemini API 키 | (필수) |
| `LLM_MODEL` | 사용할 Gemini 모델 | `gemini-2.5-flash` |
| `PORT` | 서버 포트 | `8000` |
| `LOG_LEVEL` | 로그 레벨 | `INFO` |
| `WIKI_DIR` | Wiki 디렉토리 경로 | `wiki/` (프로젝트 루트) |

---

## 실행 방법

### 로컬 실행

```bash
cd assistant-service

# 의존성 설치
pip install -r requirements.txt

# 서버 시작
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```



---

## API

### Health Check

```
GET /health
```

응답:
```json
{"status": "UP"}
```

### 채팅

```
POST /api/v1/chat
Content-Type: application/json
```

Request:
```json
{
  "user_id": "user001",
  "question": "GOOD과 DEFECT의 차이는?",
  "knowledge_space_id": 1
}
```

- **knowledge_space_id** (선택): 어느 Knowledge Space를 기준으로 답변할지 지정하는 정수 ID. 생략하면(`null`) 특정 스페이스에 국한되지 않고 답변합니다.

Response:
```json
{
  "success": true,
  "intent": "wiki_question",
  "rewritten_query": "GOOD DEFECT 차이",
  "answer": "...",
  "elapsed_ms": 1204
}
```

오류 응답:
```json
{
  "success": false,
  "message": "AI 처리 중 오류가 발생했습니다."
}
```

### curl 예제

```bash
# Health Check
curl http://localhost:8000/health

# 채팅
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user001","question":"GOOD과 DEFECT의 차이는?","knowledge_space_id":1}'
```

---

## Swagger

서버 실행 후 브라우저에서 접속:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
