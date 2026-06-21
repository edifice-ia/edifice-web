from __future__ import annotations

from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = Field(alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(alias="SUPABASE_SERVICE_ROLE_KEY")
    renderer_shared_secret: str = Field(alias="RENDERER_SHARED_SECRET")
    renderer_poll_interval_seconds: int = Field(default=15, alias="RENDERER_POLL_INTERVAL_SECONDS")
    video_output_bucket: str = Field(default="content-assets", alias="VIDEO_OUTPUT_BUCKET")
    ffmpeg_path: str = Field(default="ffmpeg", alias="FFMPEG_PATH")
    ffprobe_path: str = Field(default="ffprobe", alias="FFPROBE_PATH")
    stale_processing_minutes: int = Field(default=45, alias="RENDERER_STALE_PROCESSING_MINUTES")
    public_base_url: str | None = Field(default=None, alias="PUBLIC_SUPABASE_STORAGE_BASE_URL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
