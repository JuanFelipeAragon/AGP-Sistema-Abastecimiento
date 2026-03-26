"""
Application configuration — environment variables and Supabase client.
Uses pydantic-settings for validation and type safety.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    APP_VERSION: str = "1.0.0"

    @property
    def cors_origins_list(self) -> list[str]:
        return [s.strip() for s in self.CORS_ORIGINS.split(",") if s.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def get_supabase_client():
    """
    Returns a Supabase client using the service key (full access).
    Used by backend services only — never exposed to frontend.
    """
    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None
    try:
        from supabase import create_client
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    except Exception:
        return None
