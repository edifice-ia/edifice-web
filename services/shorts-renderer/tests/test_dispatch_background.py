from __future__ import annotations

import asyncio
from pathlib import Path
import sys
import types

try:
    from fastapi import BackgroundTasks, Response
except ModuleNotFoundError:
    fastapi_stub = types.ModuleType("fastapi")

    class BackgroundTasks:
        def __init__(self) -> None:
            self.tasks = []

        def add_task(self, func, *args, **kwargs) -> None:
            self.tasks.append((func, args, kwargs))

    class Response:
        def __init__(self) -> None:
            self.status_code = 200

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str) -> None:
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class FastAPI:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def get(self, *args, **kwargs):
            return lambda func: func

        def post(self, *args, **kwargs):
            return lambda func: func

    class _Status:
        HTTP_202_ACCEPTED = 202
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401

    fastapi_stub.BackgroundTasks = BackgroundTasks
    fastapi_stub.Depends = lambda dependency=None, **kwargs: dependency
    fastapi_stub.FastAPI = FastAPI
    fastapi_stub.Header = lambda default=None, **kwargs: default
    fastapi_stub.HTTPException = HTTPException
    fastapi_stub.Response = Response
    fastapi_stub.status = _Status()
    sys.modules["fastapi"] = fastapi_stub


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

config_module = types.ModuleType("app.config")
config_module.Settings = object
config_module.get_settings = lambda: object()
sys.modules.setdefault("app.config", config_module)
renderer_module = types.ModuleType("app.renderer")
renderer_module.render_job = lambda settings, client, job: ("videos/out.mp4", "https://example.test/out.mp4")
sys.modules.setdefault("app.renderer", renderer_module)
supabase_client_module = types.ModuleType("app.supabase_client")
supabase_client_module.RendererSupabase = object
sys.modules.setdefault("app.supabase_client", supabase_client_module)

from app import main


class FakeJob:
    id = "job-1"


class FakeClient:
    def __init__(self, _settings: object) -> None:
        self.completed: list[tuple[str, str, str]] = []
        self.failed: list[tuple[str, str]] = []

    def recover_stale_processing_jobs(self) -> int:
        return 0

    def claim_queued_job(self, job_id: str) -> FakeJob:
        assert job_id == "job-1"
        return FakeJob()

    def mark_completed(self, job_id: str, output_path: str, output_url: str) -> None:
        self.completed.append((job_id, output_path, output_url))

    def mark_failed(self, job_id: str, message: str, metadata_patch=None, existing_metadata=None) -> None:
        self.failed.append((job_id, message))


async def test_dispatch_returns_processing_before_render(monkeypatch=None):
    fake_client = FakeClient(object())

    main.active_job_id = None
    if main.render_lock.locked():
        raise AssertionError("render lock should not be held before the test")

    original_get_settings = main.get_settings
    original_client = main.RendererSupabase
    try:
        main.get_settings = lambda: object()
        main.RendererSupabase = lambda settings: fake_client

        background_tasks = BackgroundTasks()
        response = Response()
        result = await main.dispatch_render_job("job-1", background_tasks, response)

        assert response.status_code == 202
        assert result.job_id == "job-1"
        assert result.status == "processing"
        assert fake_client.completed == []
        assert main.active_job_id == "job-1"
        assert len(background_tasks.tasks) == 1
    finally:
      main.get_settings = original_get_settings
      main.RendererSupabase = original_client
      main.active_job_id = None


async def test_background_render_marks_completed():
    fake_client = FakeClient(object())
    main.active_job_id = "job-1"
    original_render_job = main.render_job
    try:
        main.render_job = lambda settings, client, job: ("videos/out.mp4", "https://example.test/out.mp4")
        await main.run_render_job_background(object(), fake_client, FakeJob())

        assert fake_client.completed == [("job-1", "videos/out.mp4", "https://example.test/out.mp4")]
        assert fake_client.failed == []
        assert main.active_job_id is None
    finally:
        main.render_job = original_render_job
        main.active_job_id = None


if __name__ == "__main__":
    asyncio.run(test_dispatch_returns_processing_before_render())
    asyncio.run(test_background_render_marks_completed())
    print("dispatch background ok")
