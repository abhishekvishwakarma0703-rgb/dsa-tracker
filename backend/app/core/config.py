"""
Configuration settings for DSA Problem Tracker Backend
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""

    # Use SettingsConfigDict (pydantic v2 style) — NOT inner class Config.
    # extra="ignore" silences FRONTEND_URL and any other unknown .env keys.
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # API Settings
    API_TITLE: str = "DSA Problem Tracker API"
    API_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database Settings
    DATABASE_URL: str = "sqlite+aiosqlite:///./dsa_tracker.db"
    DB_ECHO: bool = False

    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # LLM Settings (legacy)
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-3.5-turbo"
    LLM_ENABLED: bool = False
    LLM_MAX_TOKENS: int = 2000
    LLM_TEMPERATURE: float = 0.7

    # AI Tutor keys
    # FREE : https://aistudio.google.com/apikey  (1500 req/day, no card)
    # PAID : https://console.anthropic.com
    GEMINI_API_KEY: str =  os.getenv("GEMINI_API_KEY", "") 
    ANTHROPIC_API_KEY: str = ""
    TUTOR_DEFAULT_MODEL: str = "gemini-2.5-flash-lite"

    # Code Execution
    CODE_EXECUTION_TIMEOUT: int = 5
    MAX_CODE_LENGTH: int = 10000
    SANDBOX_ENABLED: bool = True

    # Cache
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600

    # File Upload
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5 MB

    # ── NOTE ────────────────────────────────────────────────────────────────
    # ALLOWED_EXTENSIONS and CORS_ORIGINS are intentionally NOT declared as
    # List[str] fields.  pydantic-settings v2 calls json.loads() on every
    # List field before validators run — crashing on "py,js,cpp,java".
    # We read them safely via @property using plain os.getenv().
    # ────────────────────────────────────────────────────────────────────────

    @property
    def CORS_ORIGINS(self) -> List[str]:
        """
        Reads CORS_ORIGINS and FRONTEND_URL from env.
        Supports comma-separated:  http://localhost:3000,http://localhost:5173
        or JSON array:             ["http://localhost:3000"]
        """
        raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:5173,"
            "http://127.0.0.1:3000,http://127.0.0.1:5173",
        ).strip()

        if raw.startswith("["):
            import json
            origins: List[str] = json.loads(raw)
        else:
            origins = [o.strip() for o in raw.split(",") if o.strip()]

        # Always include FRONTEND_URL if set
        frontend = os.getenv("FRONTEND_URL", "").strip()
        if frontend and frontend not in origins:
            origins.append(frontend)

        return origins

    @property
    def ALLOWED_EXTENSIONS(self) -> List[str]:
        """
        Reads ALLOWED_EXTENSIONS from env.
        Supports comma-separated:  py,js,cpp,java
        or JSON array:             ["py","js","cpp","java"]
        """
        raw = os.getenv("ALLOWED_EXTENSIONS", "py,js,cpp,java").strip()
        if raw.startswith("["):
            import json
            return json.loads(raw)
        return [e.strip() for e in raw.split(",") if e.strip()]


# Singleton — import this everywhclsere
settings = Settings()