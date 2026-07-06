import time
from sqlalchemy.orm import Session

from app.graphs.builder_graph import wiki_builder_graph
from app.services.document_service import document_service
from app.services.wiki_service import wiki_service
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.schemas.response import AnalyzeDocumentResponse
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

            document_service.mark_analyzed(db, document)

            elapsed_ms = int((time.time() - start_time) * 1000)
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


document_analysis_service = DocumentAnalysisService()
