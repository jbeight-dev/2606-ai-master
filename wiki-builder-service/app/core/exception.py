from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.logger import logger


class WikiBuilderException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(WikiBuilderException):
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class DocumentAnalysisException(WikiBuilderException):
    def __init__(self, message: str):
        super().__init__(message, status_code=500)


class RateLimitException(WikiBuilderException):
    def __init__(self, message: str = "AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."):
        super().__init__(message, status_code=429)


async def wiki_builder_exception_handler(request: Request, exc: WikiBuilderException) -> JSONResponse:
    logger.error(f"WikiBuilderException: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message}
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "입력값이 올바르지 않습니다.", "detail": exc.errors()}
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "서버 내부 오류가 발생했습니다."}
    )
