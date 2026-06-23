from __future__ import annotations

import asyncio
import logging

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Response, status

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
active_job_id: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/internal/render-jobs/{job_id}/dispatch",
    response_model=DispatchResponse,
    dependencies=[Depends(require_shared_secret)],
    status_code=status.HTTP_202_ACCEPTED,
)
async def dispatch_render_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    response: Response,
) -> DispatchResponse:
    global active_job_id

    if render_lock.locked() or active_job_id:
        raise HTTPException(status_code=409, detail="A render job is already running.")

    settings = get_settings()
    client = RendererSupabase(settings)

    try:
        recovered = client.recover_stale_processing_jobs()
        if recovered:
            logger.warning("Recovered %s stale processing job(s).", recovered)
        job = client.claim_queued_job(job_id)
    except Exception as exc:
        message = str(exc) or exc.__class__.__name__
        logger.exception("Could not accept render job: %s", job_id)
        try:
            client.mark_failed(job_id, message)
        except Exception:
            logger.exception("Could not mark failed job: %s", job_id)
        response.status_code = status.HTTP_400_BAD_REQUEST
        return DispatchResponse(job_id=job_id, status="failed", error_message=message)

    active_job_id = job.id
    background_tasks.add_task(run_render_job_background, settings, client, job)
    logger.info("Render job accepted: %s", job.id)

    response.status_code = status.HTTP_202_ACCEPTED
    return DispatchResponse(job_id=job.id, status="processing")


async def run_render_job_background(settings, client: RendererSupabase, job) -> None:
    global active_job_id

    async with render_lock:
        try:
            output_path, output_url = await asyncio.to_thread(render_job, settings, client, job)
            client.mark_completed(job.id, output_path, output_url)
            logger.info("Render job completed: %s", job.id)
        except Exception as exc:
            message = str(exc) or exc.__class__.__name__
            logger.exception("Render job failed: %s", job.id)
            try:
                client.mark_failed(job.id, message)
            except Exception:
                logger.exception("Could not mark failed job: %s", job.id)
        finally:
            active_job_id = None
