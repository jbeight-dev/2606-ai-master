# AI Wiki Builder Service

FastAPI 기반 AI Wiki 자동 생성 서비스입니다.

## 프로젝트 개요

문서를 업로드하면 LangGraph 워크플로우가 LLM를 활용해 Wiki 초안을 자동 생성합니다.  
생성된 Wiki는 검수 후 승인/반려할 수 있으며, 승인된 Wiki는 Qdrant에 벡터(wiki_embeddings)로 저장되어 AI Assistant의 Knowledge Base로 활용됩니다.

## 프로젝트 구조

```
wiki-builder-service/
├── app/
│   ├── main.py                    # FastAPI 앱 진입점
│   ├── api/
│   │   ├── knowledge_spaces.py    # Knowledge Space API
│   │   ├── documents.py           # 문서 업로드/분석 API
│   │   └── wikis.py               # Wiki CRUD API
│   ├── services/
│   │   ├── knowledge_space_service.py
│   │   ├── document_service.py
│   │   ├── wiki_service.py
│   │   ├── embedding_service.py
│   │   ├── qdrant_service.py
│   │   └── analysis_service.py    # LangGraph 분석 오케스트레이터
│   ├── schemas/
│   │   ├── request.py
│   │   └── response.py
│   ├── models/
│   │   ├── knowledge_space.py
│   │   ├── document.py
│   │   └── wiki.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── logger.py
│   │   └── exception.py
│   ├── graphs/
│   │   └── builder_graph.py       # LangGraph 워크플로우
│   ├── prompts/
│   │   └── builder_prompt.py
│   └── requirements.txt
├── Dockerfile
└── README.md
```

## 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다.


## 실행 방법

```bash
cd wiki-builder-service
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker 실행 방법

```bash
docker build -t wiki-builder .
docker run -p 8000:8000 --env-file .env wiki-builder
```

## Swagger UI

서버 실행 후 브라우저에서 접속:

```
http://localhost:8000/docs
```

## API 예제

### Knowledge Space 생성

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-spaces \
  -H "Content-Type: application/json" \
  -d '{"name": "AI 비전 검사 시스템", "description": "비전 검사 시스템 사용자 매뉴얼"}'
```

### 문서 업로드

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-spaces/1/documents \
  -F "file=@vision_manual.txt" \
  -F "document_type=USER_MANUAL"
```

### AI 문서 분석 실행

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/analyze
```

### Wiki 목록 조회

```bash
curl http://localhost:8000/api/v1/knowledge-spaces/1/wikis
```

### Wiki 상세 조회

```bash
curl http://localhost:8000/api/v1/wikis/1
```

### Wiki 수정

```bash
curl -X PUT http://localhost:8000/api/v1/wikis/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "수정된 제목", "summary": "수정된 요약", "markdown": "# 수정된 내용"}'
```

### Wiki 승인

```bash
curl -X POST http://localhost:8000/api/v1/wikis/1/approve
```

### Wiki 반려

```bash
curl -X POST http://localhost:8000/api/v1/wikis/1/reject
```

### Health Check

```bash
curl http://localhost:8000/health
```

## PoC 제약사항

- 문서 형식은 `.txt`만 지원합니다.
- 인증/권한은 적용되지 않습니다.
- 문서는 Local File System에 저장됩니다.
- 비동기 Queue는 적용되지 않습니다.
- PDF, DOCX, XLSX, CSV는 후속 확장 대상입니다.



"""
langgraph.py
AI Wiki Assistant - LangGraph Workflow

흐름:
1. 사용자 질문 입력
2. Intent Classifier
3. Query Rewrite
4. Markdown Retriever
5. Document Reranker
6. Context Builder
7. Answer Generator
8. Confidence Checker
"""
