from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AccessMate AI"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # =========================================================
    # EMAIL / OTP
    # =========================================================

    EMAIL_OTP_EXPIRE_MINUTES: int = 5

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str = "AccessMate AI"
    SMTP_USE_TLS: bool = True

    # =========================================================
    # TELEGRAM
    # =========================================================

    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_BOT_USERNAME: str = "accessmate_care_alerts_bot"

    # =========================================================
    # AI TEXT / CHAT
    # =========================================================

    AI_PROVIDER: str = "groq"

    # Updated chat model
    AI_MODEL: str = "groq/openai/gpt-oss-120b"

    AI_TEMPERATURE: float = 0.2
    AI_MAX_TOKENS: int = 500

    # =========================================================
    # SPEECH TO TEXT
    # =========================================================

    STT_PROVIDER: str = "groq"
    STT_MODEL: str = "whisper-large-v3-turbo"

    MAX_AUDIO_SIZE_MB: int = 5
    MAX_AUDIO_DURATION_SECONDS: int = 15

    # =========================================================
    # VISION
    # =========================================================

    VISION_PROVIDER: str = "groq"
    VISION_MODEL: str = "groq/qwen/qwen3.6-27b"

    VISION_TEMPERATURE: float = 0.1
    VISION_MAX_TOKENS: int = 1200

    MAX_IMAGE_SIZE_MB: int = 10

    # =========================================================
    # EMBEDDINGS
    # =========================================================

    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # =========================================================
    # PROVIDER API KEYS
    # =========================================================

    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None

    OLLAMA_API_BASE: str | None = "http://localhost:11434"

    # =========================================================
    # PYDANTIC SETTINGS
    # =========================================================

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()