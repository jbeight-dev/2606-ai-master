from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.database import create_tables
from app.core.exception import (
    WikiBuilderException,
    wiki_builder_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.api import knowledge_spaces, documents, wikis

app = FastAPI(
    title="AI Wiki Builder",
    description="문서를 업로드하고 AI가 Wiki를 자동 생성하는 서비스",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(WikiBuilderException, wiki_builder_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(knowledge_spaces.router)
app.include_router(documents.router)
app.include_router(wikis.router)


@app.on_event("startup")
def startup_event():
    create_tables()


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "UP"}
