import json
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.logger import logger
from app.core.exception import RateLimitException, APIUnavailableException
from app.prompts.builder_prompt import (
    WIKI_BUILDER_SYSTEM_PROMPT,
    CLASSIFY_DOCUMENT_PROMPT,
    ANALYZE_STRUCTURE_PROMPT,
    GENERATE_WIKI_PROMPT,
)


class WikiBuilderState(TypedDict, total=False):
    knowledge_space_id: int
    document_id: int
    document_name: str
    document_text: str
    document_type: Optional[str]

    classified_type: str
    sections: List[Dict[str, Any]]

    wikis: List[Dict[str, Any]]
    error: Optional[str]


def _get_gemini_client():
    from google import genai
    if not settings.GOOGLE_API_KEY:
        return None
    return genai.Client(api_key=settings.GOOGLE_API_KEY)


def call_gemini(system_prompt: str, user_prompt: str, *, temperature: float = 0.0) -> Optional[str]:
    from google.genai import errors, types
    client = _get_gemini_client()
    if client is None:
        return None
    try:
        response = client.models.generate_content(
            model=settings.LLM_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
            ),
        )
        return response.text
    except errors.APIError as e:
        logger.error(f"Gemini API error: {e}")
        if e.code == 429:
            raise RateLimitException()
        elif e.code == 503:
            raise APIUnavailableException()
        return None
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None


def _parse_json_response(content: str) -> Dict[str, Any]:
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
    return json.loads(content)


def load_document(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[load_document] document_id={state.get('document_id')}")
    return state


def classify_document(state: WikiBuilderState) -> WikiBuilderState:
    document_type = state.get("document_type")
    if document_type and document_type != "UNKNOWN":
        logger.info(f"[classify_document] Using provided type: {document_type}")
        return {**state, "classified_type": document_type}

    logger.info(f"[classify_document] Classifying document_id={state.get('document_id')}")

    document_name = state.get("document_name") or "알 수 없음"
    user_prompt = CLASSIFY_DOCUMENT_PROMPT.format(
        document_name=document_name,
        document_text=state["document_text"][:3000],
    )
    result_text = call_gemini(WIKI_BUILDER_SYSTEM_PROMPT, user_prompt)

    if result_text is None:
        return {**state, "classified_type": "UNKNOWN"}

    result = _parse_json_response(result_text)
    classified_type = result.get("document_type", "UNKNOWN")

    logger.info(f"[classify_document] classified_type={classified_type}")
    return {**state, "classified_type": classified_type}


def analyze_structure(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[analyze_structure] document_id={state.get('document_id')}")

    user_prompt = ANALYZE_STRUCTURE_PROMPT.format(
        document_type=state.get("classified_type", "UNKNOWN"),
        document_text=state["document_text"][:4000],
    )
    result_text = call_gemini(WIKI_BUILDER_SYSTEM_PROMPT, user_prompt)

    if result_text is None:
        return {**state, "sections": []}

    result = _parse_json_response(result_text)
    sections = result.get("sections", [])

    logger.info(f"[analyze_structure] sections_count={len(sections)}")
    return {**state, "sections": sections}


def generate_wiki(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[generate_wiki] document_id={state.get('document_id')}")

    sections_str = json.dumps(state.get("sections", []), ensure_ascii=False)
    user_prompt = GENERATE_WIKI_PROMPT.format(
        document_type=state.get("classified_type", "UNKNOWN"),
        sections=sections_str,
        document_text=state["document_text"][:6000],
    )
    result_text = call_gemini(WIKI_BUILDER_SYSTEM_PROMPT, user_prompt)

    if result_text is None:
        return {**state, "wikis": []}

    result = _parse_json_response(result_text)
    wikis = result.get("wikis", [])

    logger.info(f"[generate_wiki] wiki_count={len(wikis)}")
    return {**state, "wikis": wikis}


def generate_metadata(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[generate_metadata] wiki_count={len(state.get('wikis', []))}")
    wikis = state.get("wikis", [])
    for wiki in wikis:
        if not wiki.get("tags"):
            wiki["tags"] = []
        if not wiki.get("summary"):
            wiki["summary"] = wiki.get("title", "")
    return {**state, "wikis": wikis}


def save_wiki(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[save_wiki] Placeholder - actual save done in wiki_service")
    return state


def generate_embedding(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[generate_embedding] Placeholder - actual embedding done in embedding_service")
    return state


def save_vector(state: WikiBuilderState) -> WikiBuilderState:
    logger.info(f"[save_vector] Placeholder - actual vector save done in qdrant_service")
    return state


def build_graph():
    graph = StateGraph(WikiBuilderState)

    graph.add_node("load_document", load_document)
    graph.add_node("classify_document", classify_document)
    graph.add_node("analyze_structure", analyze_structure)
    graph.add_node("generate_wiki", generate_wiki)
    graph.add_node("generate_metadata", generate_metadata)
    graph.add_node("save_wiki", save_wiki)
    graph.add_node("generate_embedding", generate_embedding)
    graph.add_node("save_vector", save_vector)

    graph.add_edge(START, "load_document")
    graph.add_edge("load_document", "classify_document")
    graph.add_edge("classify_document", "analyze_structure")
    graph.add_edge("analyze_structure", "generate_wiki")
    graph.add_edge("generate_wiki", "generate_metadata")
    graph.add_edge("generate_metadata", "save_wiki")
    graph.add_edge("save_wiki", "generate_embedding")
    graph.add_edge("generate_embedding", "save_vector")
    graph.add_edge("save_vector", END)

    return graph.compile()


class WikiBuilderGraph:
    def __init__(self):
        self.graph = build_graph()

    def invoke(
        self,
        knowledge_space_id: int,
        document_id: int,
        document_text: str,
        document_type: Optional[str] = None,
        document_name: Optional[str] = None,
    ) -> dict:
        state = {
            "knowledge_space_id": knowledge_space_id,
            "document_id": document_id,
            "document_name": document_name,
            "document_text": document_text,
            "document_type": document_type,
        }
        return self.graph.invoke(state)


wiki_builder_graph = WikiBuilderGraph()
