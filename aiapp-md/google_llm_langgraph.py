"""
google_llm_langgraph.py
AI Wiki Assistant - Google Gemini API 기반 LangGraph Workflow

흐름:
1. 사용자 질문 입력
2. Intent Classifier  (Gemini API / 규칙 기반 fallback)
3. Query Rewrite      (Gemini API / 원문 유지 fallback)
4. Markdown Retriever (로컬 wiki/*.md 키워드 검색)
5. Document Reranker  (관련도 + 최신성)
6. Context Builder    (LLM 입력용 Context 구성)
7. Answer Generator   (Gemini API / Mock fallback)
8. Confidence Checker (신뢰도 검증)
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from services.gemini_service import GeminiService

# =========================================================
# 1. Google Gemini 클라이언트
# =========================================================

_gemini = GeminiService()


def call_gemini(prompt: str, *, temperature: float = 0.3) -> Optional[str]:
    """GeminiService 래퍼. 노드에서 직접 호출."""
    return _gemini.generate(prompt, temperature=temperature)


# =========================================================
# 2. State 정의
# =========================================================


class WikiAssistantState(TypedDict, total=False):
    question: str

    intent: Literal["wiki_question", "general_question"]

    rewritten_query: str

    retrieved_docs: List[Dict[str, Any]]
    reranked_docs: List[Dict[str, Any]]

    context: str
    answer: str

    confidence_score: float
    confidence_result: Literal["PASS", "FAIL"]
    confidence_reason: str

    final_answer: str


# =========================================================
# 3. Node 구현
# =========================================================


def intent_classifier(state: WikiAssistantState) -> WikiAssistantState:
    """질문 의도를 Gemini로 분류. API 없으면 규칙 기반으로 fallback."""
    question = state["question"]

    prompt = f"""당신은 AI Wiki Assistant의 Intent Classifier입니다.

다음 두 가지 중 하나만 출력하세요.

- wiki_question
- general_question

판단 기준

wiki_question

- 업무 용어
- 시스템 기능
- 사용자 매뉴얼
- 릴리즈노트
- 화면 사용법
- 절차
- 오류
- 코드
- 정책
- Wiki 문서를 검색해야 답할 수 있는 질문

general_question

- 인사
- 자기소개
- 일반 대화
- Wiki 검색이 필요 없는 질문

질문:

{question}

반드시 아래 둘 중 하나만 출력하세요.

wiki_question
general_question"""

    gemini_result = call_gemini(prompt, temperature=0.0)

    if gemini_result:
        stripped = gemini_result.strip()
        if "wiki_question" in stripped:
            return {**state, "intent": "wiki_question"}
        if "general_question" in stripped:
            return {**state, "intent": "general_question"}

    # --- 규칙 기반 fallback ---
    intent = "general_question" if any(kw in question for kw in ["안녕", "고마워", "감사", "반가워", "누구"]) else "wiki_question"
    return {**state, "intent": intent}


def query_rewrite(state: WikiAssistantState) -> WikiAssistantState:
    """Gemini로 검색 친화적 쿼리 재작성. 실패 시 원문 유지."""
    question = state["question"]

    prompt = f"""다음 질문을 문서 검색에 최적화된 핵심 키워드 중심 쿼리로 재작성하세요.

원래 질문: {question}

요구사항:
- 핵심 기술 용어와 명사 중심으로 압축
- 불필요한 조사·어미 제거
- 한국어 유지
- 재작성된 쿼리 텍스트만 출력 (설명 없이)"""

    result = call_gemini(prompt, temperature=0.0)
    rewritten_query = result if result else question.strip()

    return {**state, "rewritten_query": rewritten_query}


# --- Markdown 검색 헬퍼 ---

def _load_wiki_sections(wiki_dir: Path) -> List[Dict[str, Any]]:
    """wiki_dir 내 모든 .md 파일을 헤딩 단위로 분할하여 반환."""
    docs: List[Dict[str, Any]] = []
    for md_file in sorted(wiki_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        updated_at = datetime.fromtimestamp(md_file.stat().st_mtime).strftime("%Y-%m-%d")
        sections = re.split(r"\n(?=#{1,3} )", text)

        for i, section in enumerate(sections):
            section = section.strip()
            if not section:
                continue
            lines = section.split("\n")
            title = lines[0].lstrip("#").strip() or md_file.stem
            content = "\n".join(lines[1:]).strip()
            docs.append(
                {
                    "doc_id": f"{md_file.stem}_{i:03d}",
                    "title": title,
                    "content": content or section,
                    "updated_at": updated_at,
                    "source": md_file.name,
                    "_search_text": section.lower(),
                }
            )
    return docs


def _keyword_score(query: str, search_text: str) -> float:
    """쿼리 토큰이 search_text에 몇 개나 포함되는지 비율로 반환."""
    tokens = set(re.findall(r"\w+", query.lower()))
    if not tokens:
        return 0.0
    hits = sum(1 for t in tokens if t in search_text)
    return round(hits / len(tokens), 2)


def markdown_retriever(state: WikiAssistantState) -> WikiAssistantState:
    """로컬 wiki/ 폴더의 Markdown 문서를 키워드 기반으로 검색."""
    query = state["rewritten_query"]
    wiki_dir = Path(__file__).parent / "wiki"
    all_sections = _load_wiki_sections(wiki_dir)

    scored: List[Dict[str, Any]] = []
    for doc in all_sections:
        score = _keyword_score(query, doc["_search_text"])
        if score > 0:
            entry = {k: v for k, v in doc.items() if k != "_search_text"}
            entry["similarity_score"] = score
            scored.append(entry)

    scored.sort(key=lambda d: d["similarity_score"], reverse=True)
    return {**state, "retrieved_docs": scored[:5]}


def document_reranker(state: WikiAssistantState) -> WikiAssistantState:
    """관련도(similarity_score) + 최신성(updated_at)으로 문서 재정렬."""
    docs = state.get("retrieved_docs", [])

    def rerank_score(doc: Dict[str, Any]) -> float:
        similarity = doc.get("similarity_score", 0.0)
        recency = 0.1 if doc.get("updated_at", "") >= "2026-01-01" else 0.0
        return similarity + recency

    reranked_docs = sorted(docs, key=rerank_score, reverse=True)
    return {**state, "reranked_docs": reranked_docs}


def context_builder(state: WikiAssistantState) -> WikiAssistantState:
    """재정렬된 문서로 LLM 입력용 Context 텍스트를 구성."""
    docs = state.get("reranked_docs", [])

    blocks: List[str] = []
    for doc in docs:
        block = (
            f"## {doc.get('title')}\n\n"
            f"{doc.get('content')}\n\n"
            f"- source: {doc.get('source')}\n"
            f"- updated_at: {doc.get('updated_at')}"
        )
        blocks.append(block)

    context = "\n\n---\n\n".join(blocks)
    return {**state, "context": context}


def answer_generator(state: WikiAssistantState) -> WikiAssistantState:
    """Gemini API로 답변 생성. API 키 없으면 Mock 답변 반환."""
    question = state["question"]
    context = state.get("context", "")

    if context:
        prompt = f"""당신은 AI 비전 검사 시스템의 Wiki 전문 어시스턴트입니다.
아래 Wiki 문서를 참고하여 사용자 질문에 정확하고 친절하게 답변하세요.

[Wiki 문서]
{context}

[사용자 질문]
{question}

[답변 규칙]
- Wiki 문서에 근거한 내용만 답변
- 문서에 없는 내용은 추측하지 않음
- 한국어로 명확하게 작성
- 필요 시 목록이나 표 형식 활용"""
    else:
        prompt = f"""당신은 AI 비전 검사 시스템의 Wiki 전문 어시스턴트입니다.
관련 문서를 찾지 못했지만, 일반 지식으로 다음 질문에 한국어로 답변하세요.

[사용자 질문]
{question}"""

    result = call_gemini(prompt, temperature=0.3)

    if result:
        answer = result
    else:
        answer = (
            f"[Mock 답변 - GOOGLE_API_KEY 미설정]\n\n"
            f"질문: {question}\n\n"
            f"GOOGLE_API_KEY 환경변수를 설정하면 Google Gemini API를 통해 "
            f"정확한 답변을 받을 수 있습니다.\n\n"
            f"참고 문서: {[d.get('source') for d in state.get('reranked_docs', [])]}"
        )

    return {**state, "answer": answer.strip()}


def confidence_checker(state: WikiAssistantState) -> WikiAssistantState:
    """검색 결과와 답변을 기반으로 신뢰도 점수를 계산하고 최종 답변을 구성."""
    docs = state.get("reranked_docs", [])
    answer = state.get("answer", "")

    if not docs:
        return {
            **state,
            "confidence_score": 0.0,
            "confidence_result": "FAIL",
            "confidence_reason": "검색된 문서가 없습니다.",
            "final_answer": "관련 문서를 찾지 못해 정확한 답변을 드리기 어렵습니다.",
        }

    top_score = docs[0].get("similarity_score", 0.0)
    doc_count = len(docs)

    score = 0.0
    if top_score >= 0.8:
        score += 0.5
    elif top_score >= 0.5:
        score += 0.3
    elif top_score >= 0.3:
        score += 0.1

    if doc_count >= 2:
        score += 0.2
    if answer and "[Mock 답변" not in answer:
        score += 0.2
    if any(d.get("updated_at", "") >= "2026-01-01" for d in docs):
        score += 0.1

    score = round(min(score, 1.0), 2)

    sources_text = "\n".join(
        f"- {d.get('source')} ({d.get('title')})" for d in docs
    )

    if score >= 0.5:
        result = "PASS"
        reason = "관련 문서를 기반으로 충분한 근거의 답변이 생성되었습니다."
        final_answer = (
            f"{answer}\n\n"
            f"---\n\n"
            f"신뢰도: {int(score * 100)}%\n"
            f"검증 결과: {result}\n"
            f"근거 문서:\n{sources_text}"
        ).strip()
    else:
        result = "FAIL"
        reason = "검색 문서의 관련도 또는 근거가 충분하지 않습니다."
        final_answer = (
            f"제공된 Wiki 문서만으로는 정확한 답변을 드리기 어렵습니다.\n\n"
            f"검증 결과: {result}\n"
            f"신뢰도: {int(score * 100)}%\n"
            f"사유: {reason}"
        ).strip()

    return {
        **state,
        "confidence_score": score,
        "confidence_result": result,
        "confidence_reason": reason,
        "final_answer": final_answer,
    }


def ask_clarification(state: WikiAssistantState) -> WikiAssistantState:
    """질문이 불명확할 때 어시스턴트 소개와 함께 재입력을 요청."""
    return {
        **state,
        "final_answer": "저는 wiki 기반으로 대답하는 AI Assistant 입니다. 무엇이 궁금한가요?",
    }


# =========================================================
# 4. Routing 함수
# =========================================================


def route_by_intent(state: WikiAssistantState) -> str:
    if state.get("intent") == "wiki_question":
        return "query_rewrite"
    return "ask_clarification"  # general_question → ask_clarification


# =========================================================
# 5. Graph 구성
# =========================================================


def build_graph():
    """
    AI Wiki Assistant LangGraph 빌드.

    FastAPI에서 호출 예시:
        app = build_graph()
        result = app.invoke({"question": "GOOD과 DEFECT의 차이는?"})
    """
    graph = StateGraph(WikiAssistantState)

    graph.add_node("intent_classifier", intent_classifier)
    graph.add_node("query_rewrite", query_rewrite)
    graph.add_node("markdown_retriever", markdown_retriever)
    graph.add_node("document_reranker", document_reranker)
    graph.add_node("context_builder", context_builder)
    graph.add_node("answer_generator", answer_generator)
    graph.add_node("confidence_checker", confidence_checker)
    graph.add_node("ask_clarification", ask_clarification)

    graph.add_edge(START, "intent_classifier")

    graph.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "query_rewrite": "query_rewrite",
            "ask_clarification": "ask_clarification",
        },
    )

    graph.add_edge("query_rewrite", "markdown_retriever")
    graph.add_edge("markdown_retriever", "document_reranker")
    graph.add_edge("document_reranker", "context_builder")
    graph.add_edge("context_builder", "answer_generator")
    graph.add_edge("answer_generator", "confidence_checker")
    graph.add_edge("confidence_checker", END)
    graph.add_edge("ask_clarification", END)

    return graph.compile()


# =========================================================
# 6. FastAPI 헬퍼
# =========================================================


async def run_wiki_assistant(question: str) -> Dict[str, Any]:
    """
    FastAPI 엔드포인트에서 호출하는 비동기 헬퍼.

    사용 예시 (FastAPI):
        from fastapi import FastAPI
        from google_llm_langgraph import run_wiki_assistant

        api = FastAPI()

        @api.post("/ask")
        async def ask(question: str):
            return await run_wiki_assistant(question)
    """
    graph = build_graph()
    result = graph.invoke({"question": question})
    return {
        "question": result.get("question"),
        "intent": result.get("intent"),
        "rewritten_query": result.get("rewritten_query"),
        "answer": result.get("final_answer"),
        "confidence_score": result.get("confidence_score"),
        "confidence_result": result.get("confidence_result"),
        "sources": [d.get("source") for d in result.get("reranked_docs", [])],
    }


# =========================================================
# 7. 실행 예시
# =========================================================

if __name__ == "__main__":
    api_status = "Google Gemini API 연결됨" if _gemini.api_key else "Mock 모드 (GOOGLE_API_KEY 미설정)"
    print(f"\n[상태] {api_status}\n")

    test_questions = [
        "GOOD과 DEFECT의 차이는 무엇인가?",
        "신뢰도가 낮으면 어떻게 처리하는가?",
        "리뷰는 언제 수행하는가?",
        "AI 모델은 여러 버전을 사용할 수 있는가?",
        "안녕하세요",
        "넌 누구야?",
    ]

    graph = build_graph()

    for question in test_questions:
        print("=" * 60)
        print(f"질문: {question}")
        print("-" * 60)
        result = graph.invoke({"question": question})
        print(f"의도         : {result.get('intent')}")
        print(f"재작성 쿼리  : {result.get('rewritten_query', '-')}")
        print(f"신뢰도       : {result.get('confidence_score', '-')}")
        print(f"검증 결과    : {result.get('confidence_result', '-')}")
        print()
        print(result.get("final_answer", ""))
        print()
