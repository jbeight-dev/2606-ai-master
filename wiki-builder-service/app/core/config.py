from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    LLM_PROVIDER: str = "gemini"  # "gemini" | "openai"

    GOOGLE_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""  # empty = default OpenAI API; set for Azure OpenAI / compatible gateways
    OPENAI_API_VERSION: str = ""  # required when OPENAI_BASE_URL is an Azure OpenAI endpoint
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:/wiki_builder"

    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_NAME: str = "wiki_embeddings"

    STORAGE_PATH: str = "app/storage/uploads"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
