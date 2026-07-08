from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.api import chat
from app.core.database import create_tables
from app.core.exception import validation_exception_handler, generic_exception_handler
from app.models import chat_query  # noqa: F401 registers ChatQuery with Base.metadata

app = FastAPI(
    title="AI Wiki Assistant",
    description="LangGraph 기반 AI Wiki 어시스턴트 서비스",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(chat.router, prefix="/api/v1", tags=["chat"])


@app.on_event("startup")
def startup_event():
    create_tables()


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "UP"}
