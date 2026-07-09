from typing import List, Optional

from app.core.config import settings
from app.core.logger import logger
from app.core.exception import RateLimitException, APIUnavailableException

_gemini_client = None
_openai_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        if not settings.GOOGLE_API_KEY:
            return None
        _gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _gemini_client


def _get_openai_client():
    global _openai_client
    if _openai_client is None:
        if not settings.OPENAI_API_KEY:
            return None
        if settings.OPENAI_API_VERSION:
            from openai import AzureOpenAI
            _openai_client = AzureOpenAI(
                api_key=settings.OPENAI_API_KEY,
                azure_endpoint=settings.OPENAI_BASE_URL,
                api_version=settings.OPENAI_API_VERSION,
            )
        else:
            from openai import OpenAI
            _openai_client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL or None,
            )
    return _openai_client


def _call_gemini(system_prompt: str, user_prompt: str, temperature: float) -> Optional[str]:
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


def _call_openai(system_prompt: str, user_prompt: str, temperature: float) -> Optional[str]:
    import openai as openai_sdk
    client = _get_openai_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        return response.choices[0].message.content
    except openai_sdk.RateLimitError as e:
        logger.error(f"OpenAI API error: {e}")
        raise RateLimitException()
    except (openai_sdk.APIStatusError, openai_sdk.APIConnectionError) as e:
        logger.error(f"OpenAI API error: {e}")
        raise APIUnavailableException()
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return None


def call_llm(system_prompt: str, user_prompt: str, *, temperature: float = 0.0) -> Optional[str]:
    if settings.LLM_PROVIDER == "openai":
        return _call_openai(system_prompt, user_prompt, temperature)
    return _call_gemini(system_prompt, user_prompt, temperature)


def _embed_gemini(texts: List[str]) -> List[List[float]]:
    client = _get_gemini_client()
    vectors = []
    for text in texts:
        response = client.models.embed_content(
            model=settings.EMBEDDING_MODEL,
            contents=text,
        )
        vectors.append(response.embeddings[0].values)
    return vectors


def _embed_openai(texts: List[str]) -> List[List[float]]:
    client = _get_openai_client()
    response = client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=texts,
    )
    return [d.embedding for d in response.data]


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    if settings.LLM_PROVIDER == "openai":
        return _embed_openai(texts)
    return _embed_gemini(texts)
