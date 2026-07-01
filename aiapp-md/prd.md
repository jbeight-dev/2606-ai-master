@a2_langgraph.py 파일의 LangGraph 구조를 참고해서,
Google Gemini API 기반으로 사용자 질문에 답변하는 LangGraph 워크플로우를 개발해줘.

목표:
- 사용자가 자연어로 질문을 입력하면
- 질문 의도를 분류하고
- 필요한 경우 Markdown 문서를 검색한 뒤
- 검색 결과를 Context로 구성하고
- Google Gemini API를 호출하여 최종 답변을 생성한다.

사용 API:
- Google Gemini API
- google-generativeai 또는 google-genai 라이브러리 사용

필수 노드:
1. intent_classifier
   - 질문 의도 분류
   - wiki_question  / unclear

2. query_rewrite
   - 검색에 적합한 질문으로 재작성

3. markdown_retriever
   - Markdown 문서 검색
   - 우선 Mock 또는 로컬 markdown 폴더 기반 검색

4. document_reranker
   - 관련도와 최신성 기준으로 문서 재정렬

5. context_builder
   - 검색 결과를 LLM 입력 Context로 구성

6. answer_generator
   - Google Gemini API로 답변 생성

7. confidence_checker
   - 검색 결과와 답변 신뢰도 검증

요구사항:
- Python 3.9 기준
- LangGraph StateGraph 사용
- build_graph() 함수 제공
- FastAPI에서 호출 가능하도록 구성
- API Key는 환경변수 GOOGLE_API_KEY에서 읽기
- 실제 Gemini 호출 코드는 별도 함수로 분리
- API Key가 없으면 Mock 답변으로 동작
- 실행 예시 포함

산출물:
- google_llm_langgraph.py 전체 코드
- requirements.txt
- .env 예시
- 실행 방법