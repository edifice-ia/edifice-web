from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


JobStatus = Literal["queued", "processing", "completed", "failed"]


class RenderJob(BaseModel):
    id: str
    draft_id: str
    manifest_id: str | None = None
    manifest_path: str | None = None
    status: JobStatus
    metadata: dict[str, Any] = Field(default_factory=dict)


class DispatchResponse(BaseModel):
    job_id: str
    status: JobStatus
    output_path: str | None = None
    output_url: str | None = None
    error_message: str | None = None
