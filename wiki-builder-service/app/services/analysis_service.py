import time
from sqlalchemy.orm import Session

from app.graphs.builder_graph import wiki_builder_graph, _parse_json_response
from app.services.document_service import document_service
from app.services.wiki_service import wiki_service
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.models.wiki import WikiStatus
from app.models.wiki_regeneration_history import WikiRegenerationHistory
from app.core.llm_client import call_llm
from app.prompts.builder_prompt import (
    WIKI_BUILDER_SYSTEM_PROMPT,
    REGENERATE_WIKI_PROMPT,
    build_regeneration_instruction,
)
from app.schemas.response import AnalyzeDocumentResponse, WikiRegenerateResponse
from app.core.logger import logger
from app.core.exception import DocumentAnalysisException, RateLimitException, APIUnavailableException


class DocumentAnalysisService:
    def analyze(self, db: Session, document_id: int) -> AnalyzeDocumentResponse:
        start_time = time.time()

        document = document_service.get_by_id(db, document_id)
        logger.info(
            f"[analysis_service] Start analysis "
            f"document_id={document_id} "
            f"file_name={document.file_name} "
            f"knowledge_space_id={document.knowledge_space_id} "
            f"document_type={document.document_type.value}"
        )

        try:
            document_text = document_service.read_file(document.file_path)

            result = wiki_builder_graph.invoke(
                knowledge_space_id=document.knowledge_space_id,
                document_id=document.id,
                document_name=document.file_name,
                document_text=document_text,
                document_type=document.document_type.value,
            )

            classified_type = result.get("classified_type")
            if classified_type and classified_type != document.document_type.value:
                document = document_service.update_document_type(db, document, classified_type)

            wiki_data_list = result.get("wikis", [])
            if not wiki_data_list:
                raise DocumentAnalysisException("Wiki 초안이 생성되지 않았습니다.")

            saved_wikis = wiki_service.create_batch(
                db=db,
                knowledge_space_id=document.knowledge_space_id,
                document_id=document.id,
                wiki_data_list=wiki_data_list,
            )

            wiki_texts = [w.markdown for w in saved_wikis]
            vectors = embedding_service.generate(wiki_texts)

            payloads = [
                {
                    "knowledge_space_id": document.knowledge_space_id,
                    "document_id": document.id,
                    "title": w.title,
                    "status": w.status.value,
                    "document_type": document.document_type.value,
                    "tags": w.tags or [],
                }
                for w in saved_wikis
            ]

            embedding_count = qdrant_service.upsert_wikis(
                wiki_ids=[w.id for w in saved_wikis],
                vectors=vectors,
                payloads=payloads,
            )

            elapsed_ms = int((time.time() - start_time) * 1000)
            document_service.mark_analyzed(db, document, elapsed_ms)

            logger.info(
                f"[analysis_service] Completed "
                f"document_id={document_id} "
                f"wiki_count={len(saved_wikis)} "
                f"embedding_count={embedding_count} "
                f"elapsed_ms={elapsed_ms}"
            )

            return AnalyzeDocumentResponse(
                success=True,
                document_id=document_id,
                status="ANALYZED",
                wiki_count=len(saved_wikis),
                embedding_count=embedding_count,
                elapsed_ms=elapsed_ms,
            )

        except RateLimitException:
            document_service.mark_failed(db, document)
            raise
        except APIUnavailableException:
            document_service.mark_failed(db, document)
            raise
        except DocumentAnalysisException:
            document_service.mark_failed(db, document)
            raise
        except Exception as e:
            document_service.mark_failed(db, document)
            logger.error(f"[analysis_service] Error document_id={document_id}: {e}", exc_info=True)
            raise DocumentAnalysisException(f"AI 문서 분석 중 오류가 발생했습니다.")

    def regenerate(self, db: Session, wiki_id: int) -> WikiRegenerateResponse:
        wiki = wiki_service.get_by_id(db, wiki_id)
        if wiki.status != WikiStatus.REJECTED:
            raise DocumentAnalysisException("반려된 Wiki만 재생성할 수 있습니다.")
        if not wiki.rejection_reasons:
            raise DocumentAnalysisException("반려 사유가 없어 재생성할 수 없습니다.")

        logger.info(f"[analysis_service] Start regeneration wiki_id={wiki_id}")

        document = document_service.get_by_id(db, wiki.document_id)
        document_text = document_service.read_file(document.file_path)

        instruction = build_regeneration_instruction(wiki.rejection_reasons, wiki.rejection_comment or "")
        prompt = REGENERATE_WIKI_PROMPT.format(
            regeneration_instruction=instruction,
            document_type=document.document_type.value,
            document_text=document_text[:6000],
            previous_title=wiki.title,
            previous_summary=wiki.summary or "",
            previous_markdown=wiki.markdown,
        )

        result_text = call_llm(WIKI_BUILDER_SYSTEM_PROMPT, prompt)
        if result_text is None:
            raise DocumentAnalysisException("Wiki 재생성에 실패했습니다.")
        data = _parse_json_response(result_text)

        history = WikiRegenerationHistory(
            wiki_id=wiki.id,
            previous_version=wiki.version,
            previous_title=wiki.title,
            previous_summary=wiki.summary,
            previous_markdown=wiki.markdown,
            rejection_reasons=wiki.rejection_reasons,
            rejection_comment=wiki.rejection_comment,
            prompt=prompt,
        )
        db.add(history)

        updated = wiki_service.regenerate_content(db, wiki, data)

        vectors = embedding_service.generate([updated.markdown])
        qdrant_service.delete_by_wiki_id(updated.id)
        qdrant_service.upsert_wikis(
            wiki_ids=[updated.id],
            vectors=vectors,
            payloads=[
                {
                    "knowledge_space_id": updated.knowledge_space_id,
                    "document_id": updated.document_id,
                    "title": updated.title,
                    "status": updated.status.value,
                    "document_type": document.document_type.value,
                    "tags": updated.tags or [],
                }
            ],
        )

        logger.info(f"[analysis_service] Completed regeneration wiki_id={wiki_id} version={updated.version}")

        return WikiRegenerateResponse(
            success=True,
            wiki_id=updated.id,
            status=updated.status.value,
            version=updated.version,
            title=updated.title,
            summary=updated.summary,
        )


document_analysis_service = DocumentAnalysisService()
