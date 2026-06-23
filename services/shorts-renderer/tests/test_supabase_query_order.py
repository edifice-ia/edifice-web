from __future__ import annotations

from pathlib import Path
import sys
import types


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class Settings:
    def __init__(self, **values):
        self.supabase_url = values["SUPABASE_URL"]
        self.supabase_service_role_key = values["SUPABASE_SERVICE_ROLE_KEY"]
        self.renderer_shared_secret = values["RENDERER_SHARED_SECRET"]
        self.video_output_bucket = values.get("VIDEO_OUTPUT_BUCKET", "content-assets")
        self.stale_processing_minutes = values.get("RENDERER_STALE_PROCESSING_MINUTES", 45)


class RenderJob:
    def __init__(
        self,
        id: str,
        draft_id: str,
        status: str,
        manifest_id: str | None = None,
        manifest_path: str | None = None,
        metadata: dict | None = None,
    ):
        self.id = id
        self.draft_id = draft_id
        self.status = status
        self.manifest_id = manifest_id
        self.manifest_path = manifest_path
        self.metadata = metadata or {}

    @classmethod
    def model_validate(cls, data: dict):
        return cls(**data)


config_module = types.ModuleType("app.config")
config_module.Settings = Settings
models_module = types.ModuleType("app.models")
models_module.RenderJob = RenderJob
supabase_module = types.ModuleType("supabase")
supabase_module.Client = object
supabase_module.create_client = lambda *_args, **_kwargs: FakeSupabaseClient()
sys.modules.setdefault("app.config", config_module)
sys.modules.setdefault("app.models", models_module)
sys.modules.setdefault("supabase", supabase_module)

from app.supabase_client import RendererSupabase


class Response:
    def __init__(self, data=None):
        self.data = data


class FakeStorageBucket:
    def download(self, storage_path: str):
        return b"{}"

    def get_public_url(self, storage_path: str):
        return f"https://storage.example/{storage_path}"

    def remove(self, paths: list[str]):
        return None

    def upload(self, path: str, file, file_options=None):
        return None


class FakeStorage:
    def from_(self, bucket: str):
        return FakeStorageBucket()


class Query:
    def __init__(self, table_name: str, operation: str, data=None):
        self.table_name = table_name
        self.operation = operation
        self.data = data
        self.filters: list[tuple[str, str, object]] = []
        self.selected = False

    def _assert_select_before_filters(self):
        if self.filters:
            raise AssertionError(f"select after filter on {self.table_name}")

    def select(self, columns: str):
        self._assert_select_before_filters()
        self.selected = True
        return self

    def eq(self, column: str, value):
        self.filters.append(("eq", column, value))
        return self

    def in_(self, column: str, values):
        self.filters.append(("in", column, values))
        return self

    def lt(self, column: str, value):
        self.filters.append(("lt", column, value))
        return self

    def order(self, column: str, desc: bool = False):
        return self

    def limit(self, count: int):
        return self

    def maybe_single(self):
        return self

    def execute(self):
        if self.operation == "update":
            return Response([{"id": "job-1"}])
        if self.table_name == "video_render_jobs":
            return Response(
                {
                    "id": "job-1",
                    "draft_id": "draft-1",
                    "manifest_id": "asset-1",
                    "manifest_path": None,
                    "status": "processing",
                    "metadata": {},
                }
            )
        return Response(
            {
                "bucket_name": "content-assets",
                "storage_path": "lignes-interieures/video-preparation/draft-1/manifest.json",
            }
        )


class Table:
    def __init__(self, name: str):
        self.name = name

    def select(self, columns: str):
        return Query(self.name, "select").select(columns)

    def update(self, data):
        return Query(self.name, "update", data)

    def upsert(self, data, on_conflict=None):
        return Query(self.name, "upsert", data)


class FakeSupabaseClient:
    storage = FakeStorage()

    def table(self, name: str):
        return Table(name)


def client() -> RendererSupabase:
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="service-role",
        RENDERER_SHARED_SECRET="secret",
    )
    renderer_client = RendererSupabase(settings)
    renderer_client.client = FakeSupabaseClient()
    return renderer_client


def test_claim_job_uses_select_before_filters():
    job = client().claim_queued_job("job-1")

    assert job.id == "job-1"
    assert job.status == "processing"


def test_read_manifest_reference_uses_select_before_filters():
    job = RenderJob(
        id="job-1",
        draft_id="draft-1",
        manifest_id="asset-1",
        status="processing",
    )

    bucket, storage_path = client().read_manifest_reference(job)

    assert bucket == "content-assets"
    assert storage_path.endswith("manifest.json")


def test_status_updates_do_not_require_select_after_filters():
    renderer_client = client()

    renderer_client.mark_failed("job-1", "boom")
    renderer_client.mark_completed("job-1", "videos/out.mp4", "https://example.test/out.mp4")


if __name__ == "__main__":
    test_claim_job_uses_select_before_filters()
    test_read_manifest_reference_uses_select_before_filters()
    test_status_updates_do_not_require_select_after_filters()
    print("supabase query order ok")
