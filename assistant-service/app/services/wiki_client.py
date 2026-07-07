from typing import Any, Dict, Optional

import httpx

from app.core import config
from app.core.logger import get_logger

logger = get_logger(__name__)


def get_wiki(wiki_id: int) -> Optional[Dict[str, Any]]:
    try:
        response = httpx.get(
            f"{config.WIKI_BUILDER_SERVICE_URL}/api/v1/wikis/{wiki_id}",
            timeout=5.0,
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.warning("[wiki_client] failed to fetch wiki_id=%s: %s", wiki_id, e)
        return None
