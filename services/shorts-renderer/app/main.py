from __future__ import annotations

import asyncio
import logging

from fastapi import Depends, FastAPI, HTTPException

from app.config import get_settings
from app.models import DispatchResponse
from app.renderer import render_job
from app.security import require_shared_secret
from app.supabase_client import RendererSupabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Edifice Shorts Renderer", version="0.1.0")
render_lock = asyncio.Lock()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/internal/render-jobs/{job_id}/dispatch",
    response_model=DispatchResponse,
    dependencies=[Depends(require_shared_secret)],
)
async def dispatch_render_job(job_id: str) -> DispatchResponse:
    if render_lock.locked():
        raise HTTPException(status_code=409, detail="A render job is already running.")

    settings = get_settings()
    client = RendererSupabase(settings)

    async with render_lock:
        try:
            recovered = client.recover_stale_processing_jobs()
            if recovered:
                logger.warning("Recovered %s stale processing job(s).", recovered)
            job = client.claim_queued_job(job_id)
            output_path, output_url = await asyncio.to_thread(render_job, settings, client, job)
            client.mark_completed(job_id, output_path, output_url)
            return DispatchResponse(job_id=job_id, status="completed", output_path=output_path, output_url=output_url)
        except Exception as exc:
            message = str(exc) or exc.__class__.__name__
            logger.exception("Render job failed: %s", job_id)
            try:
                client.mark_failed(job_id, message)
            except Exception:
                logger.exception("Could not mark failed job: %s", job_id)
            return DispatchResponse(job_id=job_id, status="failed", error_message=message)
