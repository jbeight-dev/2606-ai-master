# FastAPI 서비스 개발 지시서

목표

현재 테스트 완료된 assistant_graph.py를 FastAPI 기반 AI Assistant 서비스로 개발한다.

POC 수준의 프로젝트로, Frontend가 AI Assistant를 직접 호출한다.

LangGraph Workflow는 그대로 유지하고, FastAPI는 API Layer 역할만 수행한다.

⸻

시스템 구조

Frontend
     │
HTTP REST
     ▼
AI Assistant (FastAPI)
     │
     ▼
assistant_graph.py (LangGraph)
     │
     ▼
Google Gemini

POC 단계이므로 별도 Backend 없이 Frontend가 FastAPI를 직접 호출한다.

인증/권한은 적용하지 않는다.

⸻

프로젝트 구조

다음 구조로 리팩토링한다.

assistant-service/
app/
│
├── main.py
├── api/
│     └── chat.py
│
├── services/
│     └── assistant_service.py
│
├── schemas/
│     ├── request.py
│     └── response.py
│
├── core/
│     ├── config.py
│     ├── logger.py
│     └── exception.py
│
├── graphs/
│     └── assistant_graph.py
│
├── prompts/
│
├── utils/
│
└── requirements.txt

⸻

LangGraph 리팩토링

현재 assistant_graph.py는 CLI 형태로 실행되고 있다.

이를 서비스에서 호출 가능한 형태로 변경한다.

예시

class AssistantGraph:
    def __init__(self):
        self.graph = build_graph()
    def invoke(
        self,
        question: str,
        user_id: str | None = None
    ) -> dict:
        state = {
            "question": question,
            "user_id": user_id
        }
        return self.graph.invoke(state)

CLI 코드는 제거하고 API에서만 호출하도록 수정한다.

⸻

Service 계층

FastAPI가 LangGraph를 직접 호출하지 않는다.

중간 Service Layer를 둔다.

class AssistantService:
    def chat(
        self,
        request: ChatRequest
    ) -> ChatResponse:
        return assistant_graph.invoke(
            question=request.question,
            user_id=request.user_id
        )

향후

* Logging
* Cache
* Prompt Version
* DB 저장

등을 Service Layer에서 수행할 수 있도록 한다.

⸻

API 개발

POST /api/v1/chat

Request

{
  "user_id":"user001",
  "question":"GOOD과 DEFECT의 차이는?"
}

⸻

Response

{
  "success": true,
  "intent": "wiki_question",
  "rewritten_query": "GOOD과 DEFECT의 차이는?",
  "answer": "...",
  "elapsed_ms": 1204
}

⸻

Health Check

GET /health

응답

{
    "status":"UP"
}

⸻

OpenAPI

Swagger를 자동 제공한다.

/docs
/redoc

⸻

Request Validation

Pydantic Model 사용

class ChatRequest(BaseModel):
    user_id: str
    question: str

질문이 비어 있으면

HTTP 400 반환

⸻

Error Handling

다음을 처리한다.

* Gemini API 오류
* LangGraph 오류
* Timeout
* Validation 오류
* 예상하지 못한 Exception

응답 형식

{
    "success": false,
    "message":"AI 처리 중 오류가 발생했습니다."
}

⸻

Logging

다음 정보를 INFO 로그로 남긴다.

* Request Time
* User ID
* Question
* Intent
* Elapsed Time
* Error

민감한 Prompt 전체는 로그에 남기지 않는다.

⸻

환경변수

모든 설정은 환경변수 사용

GOOGLE_API_KEY=
LLM_MODEL=
PORT=8000
LOG_LEVEL=INFO

config.py에서 관리한다.

⸻

CORS

POC이므로 모든 Origin 허용

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

Dockerfile 작성

* Python 3.12
* requirements 설치
* uvicorn 실행

⸻

requirements.txt 작성

최소 포함

* fastapi
* uvicorn
* pydantic
* python-dotenv
* langgraph
* langchain
* google-genai
* google-generativeai (기존 코드 호환 시에만)
* httpx

가능하면 deprecated된 google.generativeai 대신 google.genai SDK를 사용하도록 코드를 함께 마이그레이션한다.

⸻

README 작성

다음을 포함한다.

* 프로젝트 구조
* 실행 방법
* 환경변수
* Docker 실행
* API 예제
* curl 예제
* Swagger 주소

⸻

완료 기준

* assistant_graph.py는 함수 기반으로 동작한다.
* FastAPI에서 POST /api/v1/chat 호출 시 LangGraph가 실행된다.
* Gemini 응답이 JSON으로 반환된다.
* 예외 처리 및 Validation이 적용된다.
* Docker에서 실행 가능하다.
* Swagger에서 API 테스트가 가능하다.
* 기존 테스트 시나리오가 모두 API에서도 동일하게 동작한다.