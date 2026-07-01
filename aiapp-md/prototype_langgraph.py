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

import re
from pathlib import Path
from datetime import datetime
from typing import TypedDict, List, Dict, Any, Literal, Optional
from langgraph.graph import StateGraph, START, END


# =========================================================
# 1. State 정의
# =========================================================

class WikiAssistantState(TypedDict, total=False):
    question: str

    intent: Literal[
        "wiki_question",
        "general_question",
        "unclear"
    ]

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
# 2. Node 구현
# =========================================================

def intent_classifier(state: WikiAssistantState) -> WikiAssistantState:
    question = state["question"]

    # TODO: LLM으로 의도 분류
    # 예시 규칙 기반
    if len(question.strip()) < 3:
        intent = "unclear"
    else:
        intent = "wiki_question"

    return {
        **state,
        "intent": intent
    }


def query_rewrite(state: WikiAssistantState) -> WikiAssistantState:
    question = state["question"]

    # TODO: LLM으로 검색 친화적인 질의로 변환
    rewritten_query = question.strip()

    return {
        **state,
        "rewritten_query": rewritten_query
    }


def _load_wiki_sections(wiki_dir: Path) -> List[Dict[str, Any]]:
    docs = []
    for md_file in sorted(wiki_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        updated_at = datetime.fromtimestamp(md_file.stat().st_mtime).strftime("%Y-%m-%d")

        # # / ## / ### 헤딩 기준으로 섹션 분할
        sections = re.split(r'\n(?=#{1,3} )', text)

        for i, section in enumerate(sections):
            section = section.strip()
            if not section:
                continue

            lines = section.split('\n')
            title = lines[0].lstrip('#').strip() or md_file.stem
            content = '\n'.join(lines[1:]).strip()

            docs.append({
                "doc_id": f"{md_file.stem}_{i:03d}",
                "title": title,
                "content": content or section,
                "updated_at": updated_at,
                "source": md_file.name,
                "_search_text": section.lower(),
            })
    return docs


def _keyword_score(query: str, search_text: str) -> float:
    query_tokens = set(re.findall(r'\w+', query.lower()))
    if not query_tokens:
        return 0.0
    hits = sum(1 for t in query_tokens if t in search_text)
    return round(hits / len(query_tokens), 2)


def markdown_retriever(state: WikiAssistantState) -> WikiAssistantState:
    query = state["rewritten_query"]

    wiki_dir = Path(__file__).parent / "wiki"
    all_sections = _load_wiki_sections(wiki_dir)

    scored = []
    for doc in all_sections:
        score = _keyword_score(query, doc["_search_text"])
        if score > 0:
            scored.append({k: v for k, v in doc.items() if k != "_search_text"} | {"similarity_score": score})

    scored.sort(key=lambda d: d["similarity_score"], reverse=True)
    retrieved_docs = scored[:5]

    return {
        **state,
        "retrieved_docs": retrieved_docs
    }


def document_reranker(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("retrieved_docs", [])

    def rerank_score(doc: Dict[str, Any]) -> float:
        similarity = doc.get("similarity_score", 0)

        # 최신성 점수 예시
        updated_at = doc.get("updated_at", "")
        recency_score = 0.1 if updated_at >= "2026-06-01" else 0

        return similarity + recency_score

    reranked_docs = sorted(
        docs,
        key=rerank_score,
        reverse=True
    )

    return {
        **state,
        "reranked_docs": reranked_docs
    }


def context_builder(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("reranked_docs", [])

    context_blocks = []

    for doc in docs:
        block = f"""
## {doc.get("title")}

{doc.get("content")}

- source: {doc.get("source")}
- updated_at: {doc.get("updated_at")}
"""
        context_blocks.append(block.strip())

    context = "\n\n---\n\n".join(context_blocks)

    return {
        **state,
        "context": context
    }


def answer_generator(state: WikiAssistantState) -> WikiAssistantState:
    question = state["question"]
    context = state.get("context", "")

    # TODO: 실제 LLM 호출로 대체
    answer = f"""
질문에 대한 답변입니다.

제공된 Wiki 문서 기준으로 보면, 설비 등록 권한은 문서 버전에 따라 다르게 설명되어 있습니다.
사용자 매뉴얼에서는 관리자 권한이 필요하다고 되어 있으나, 최신 릴리즈노트에서는 일반 사용자도 일부 설비 정보를 등록할 수 있다고 설명합니다.

따라서 최신 기준으로는 일반 사용자도 일부 등록이 가능하지만, 전체 등록 권한은 관리자 권한이 필요할 수 있습니다.
"""

    return {
        **state,
        "answer": answer.strip()
    }


def confidence_checker(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("reranked_docs", [])
    answer = state.get("answer", "")

    if not docs:
        return {
            **state,
            "confidence_score": 0.0,
            "confidence_result": "FAIL",
            "confidence_reason": "검색된 문서가 없습니다.",
            "final_answer": "관련 문서를 찾지 못해 정확한 답변을 드리기 어렵습니다."
        }

    top_score = docs[0].get("similarity_score", 0)
    doc_count = len(docs)

    score = 0.0

    if top_score >= 0.8:
        score += 0.5
    elif top_score >= 0.6:
        score += 0.3

    if doc_count >= 2:
        score += 0.2

    if answer:
        score += 0.2

    if any(doc.get("updated_at", "") >= "2026-06-01" for doc in docs):
        score += 0.1

    score = round(score, 2)

    if score >= 0.7:
        result = "PASS"
        reason = "관련 문서와 최신 문서를 기반으로 답변이 생성되었습니다."
        final_answer = f"""
{answer}

---

신뢰도: {int(score * 100)}%
검증 결과: {result}
근거 문서:
{chr(10).join([f"- {doc.get('source')}" for doc in docs])}
""".strip()
    else:
        result = "FAIL"
        reason = "검색 문서의 관련도 또는 근거가 충분하지 않습니다."
        final_answer = f"""
제공된 Wiki 문서만으로는 정확한 답변을 드리기 어렵습니다.

검증 결과: {result}
신뢰도: {int(score * 100)}%
사유: {reason}
""".strip()

    return {
        **state,
        "confidence_score": score,
        "confidence_result": result,
        "confidence_reason": reason,
        "final_answer": final_answer
    }


def ask_clarification(state: WikiAssistantState) -> WikiAssistantState:
    return {
        **state,
        "final_answer": "질문이 명확하지 않습니다. 어떤 기능이나 문서 기준으로 확인할지 조금 더 구체적으로 입력해 주세요."
    }


def general_answer(state: WikiAssistantState) -> WikiAssistantState:
    return {
        **state,
        "final_answer": "이 질문은 Wiki 문서 검색이 필요하지 않은 일반 질문으로 판단되었습니다."
    }


# =========================================================
# 3. Routing 함수
# =========================================================

def route_by_intent(state: WikiAssistantState) -> str:
    intent = state.get("intent")

    if intent == "wiki_question":
        return "query_rewrite"

    if intent == "general_question":
        return "general_answer"

    return "ask_clarification"


# =========================================================
# 4. Graph 구성
# =========================================================

def build_graph():
    graph = StateGraph(WikiAssistantState)

    graph.add_node("intent_classifier", intent_classifier)
    graph.add_node("query_rewrite", query_rewrite)
    graph.add_node("markdown_retriever", markdown_retriever)
    graph.add_node("document_reranker", document_reranker)
    graph.add_node("context_builder", context_builder)
    graph.add_node("answer_generator", answer_generator)
    graph.add_node("confidence_checker", confidence_checker)
    graph.add_node("ask_clarification", ask_clarification)
    graph.add_node("general_answer", general_answer)

    graph.add_edge(START, "intent_classifier")

    graph.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "query_rewrite": "query_rewrite",
            "general_answer": "general_answer",
            "ask_clarification": "ask_clarification"
        }
    )

    graph.add_edge("query_rewrite", "markdown_retriever")
    graph.add_edge("markdown_retriever", "document_reranker")
    graph.add_edge("document_reranker", "context_builder")
    graph.add_edge("context_builder", "answer_generator")
    graph.add_edge("answer_generator", "confidence_checker")
    graph.add_edge("confidence_checker", END)

    graph.add_edge("ask_clarification", END)
    graph.add_edge("general_answer", END)

    return graph.compile()


# =========================================================
# 5. 실행 예시
# =========================================================

if __name__ == "__main__":
    app = build_graph()

    result = app.invoke({
       # "question": "설비 등록은 누가 할 수 있나요?"
       "question": "GOOD과 DEFECT의 차이는 무엇인가?"
    })

    print(result["final_answer"])