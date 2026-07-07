"""
AI Wiki Assistant - LangGraph Workflow
"""

from typing import Any, Dict, List, Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from app.core import config
from app.core.logger import get_logger
from app.services import wiki_client
from app.services.qdrant_service import qdrant_service

logger = get_logger(__name__)


# =========================================================
# 1. Gemini 호출 헬퍼
# =========================================================

def _get_gemini_client():
    from google import genai
    if not config.GOOGLE_API_KEY:
        return None
    return genai.Client(api_key=config.GOOGLE_API_KEY)


def call_gemini(prompt: str, *, temperature: float = 0.3) -> Optional[str]:
    client = _get_gemini_client()
    if client is None:
        return None
    try:
        response = client.models.generate_content(
            model=config.LLM_MODEL,
            contents=prompt,
        )
        return response.text
    except Exception as e:
        logger.error("Gemini API error: %s", e)
        return None


def _embed_query(text: str) -> Optional[List[float]]:
    client = _get_gemini_client()
    if client is None:
        return None
    try:
        response = client.models.embed_content(
            model=config.EMBEDDING_MODEL,
            contents=text,
        )
        return response.embeddings[0].values
    except Exception as e:
        logger.error("Gemini embedding error: %s", e)
        return None


# =========================================================
# 2. State 정의
# =========================================================


class WikiAssistantState(TypedDict, total=False):
    question: str
    user_id: Optional[str]
    knowledge_space_id: Optional[int]

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

    intent = (
        "general_question"
        if any(kw in question for kw in ["안녕", "고마워", "감사", "반가워", "누구"])
        else "wiki_question"
    )
    return {**state, "intent": intent}


def query_rewrite(state: WikiAssistantState) -> WikiAssistantState:
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


def markdown_retriever(state: WikiAssistantState) -> WikiAssistantState:
    query = state["rewritten_query"]
    knowledge_space_id = state.get("knowledge_space_id")

    vector = _embed_query(query)
    if vector is None:
        return {**state, "retrieved_docs": []}

    hits = qdrant_service.search(vector, knowledge_space_id=knowledge_space_id, limit=5)

    docs: List[Dict[str, Any]] = []
    for hit in hits:
        wiki_id = hit.get("wiki_id")
        wiki = wiki_client.get_wiki(wiki_id)
        if wiki is None or wiki.get("status") != "APPROVED":
            continue
        if knowledge_space_id is not None and wiki.get("knowledge_space_id") != knowledge_space_id:
            continue

        docs.append(
            {
                "doc_id": f"wiki_{wiki_id}",
                "wiki_id": wiki_id,
                "title": wiki.get("title", ""),
                "content": wiki.get("markdown", ""),
                "updated_at": (wiki.get("updated_at") or "")[:10],
                "source": f"wiki:{wiki_id}",
                "similarity_score": hit["similarity_score"],
            }
        )

    return {**state, "retrieved_docs": docs}


def document_reranker(state: WikiAssistantState) -> WikiAssistantState:
    docs = state.get("retrieved_docs", [])

    def rerank_score(doc: Dict[str, Any]) -> float:
        similarity = doc.get("similarity_score", 0.0)
        recency = 0.1 if doc.get("updated_at", "") >= "2026-01-01" else 0.0
        return similarity + recency

    reranked_docs = sorted(docs, key=rerank_score, reverse=True)
    return {**state, "reranked_docs": reranked_docs}


def context_builder(state: WikiAssistantState) -> WikiAssistantState:
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

    if score >= 0.5:
        result = "PASS"
        reason = "관련 문서를 기반으로 충분한 근거의 답변이 생성되었습니다."
        final_answer = (
            f"{answer}\n\n"
            f"---\n\n"
            f"신뢰도: {int(score * 100)}%\n"
            f"검증 결과: {result}"
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
    return {
        **state,
        "final_answer": "저는 wiki 기반으로 대답하는 AI Assistant 입니다. 무엇이 궁금한가요?",
    }


# =========================================================
# 4. Routing
# =========================================================


def route_by_intent(state: WikiAssistantState) -> str:
    if state.get("intent") == "wiki_question":
        return "query_rewrite"
    return "ask_clarification"


# =========================================================
# 5. Graph 빌드
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

    graph.add_edge(START, "intent_classifier")
    graph.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {"query_rewrite": "query_rewrite", "ask_clarification": "ask_clarification"},
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
# 6. AssistantGraph 클래스
# =========================================================


class AssistantGraph:
    def __init__(self):
        self.graph = build_graph()

    def invoke(
        self,
        question: str,
        user_id: Optional[str] = None,
        knowledge_space_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        state: WikiAssistantState = {
            "question": question,
            "user_id": user_id,
            "knowledge_space_id": knowledge_space_id,
        }
        return self.graph.invoke(state)
