from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any

from supabase import Client, create_client

from app.config import Settings
from app.models import RenderJob


class RendererSupabase:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    def recover_stale_processing_jobs(self) -> int:
        cutoff = (dt.datetime.now(dt.UTC) - dt.timedelta(minutes=self.settings.stale_processing_minutes)).isoformat()
        response = (
            self.client.table("video_render_jobs")
            .update(
                {
                    "status": "queued",
                    "started_at": None,
                    "error_message": "Recovered from stale processing state.",
                }
            )
            .eq("status", "processing")
            .lt("started_at", cutoff)
            .execute()
        )
        return len(response.data or [])

    def claim_queued_job(self, job_id: str) -> RenderJob:
        now = dt.datetime.now(dt.UTC).isoformat()
        response = (
            self.client.table("video_render_jobs")
            .update({"status": "processing", "started_at": now, "error_message": None})
            .select("id,draft_id,manifest_id,manifest_path,status,metadata")
            .eq("id", job_id)
            .eq("status", "queued")
            .maybe_single()
            .execute()
        )
        if not response.data:
            raise RuntimeError(f"Job {job_id} is not queued or does not exist.")
        return RenderJob.model_validate(response.data)

    def mark_completed(self, job_id: str, output_path: str, output_url: str) -> None:
        now = dt.datetime.now(dt.UTC).isoformat()
        (
            self.client.table("video_render_jobs")
            .update(
                {
                    "status": "completed",
                    "completed_at": now,
                    "output_path": output_path,
                    "output_url": output_url,
                    "error_message": None,
                }
            )
            .eq("id", job_id)
            .in_("status", ["queued", "processing"])
            .execute()
        )

    def mark_failed(self, job_id: str, message: str) -> None:
        now = dt.datetime.now(dt.UTC).isoformat()
        (
            self.client.table("video_render_jobs")
            .update(
                {
                    "status": "failed",
                    "completed_at": now,
                    "error_message": message[:4000],
                }
            )
            .eq("id", job_id)
            .execute()
        )

    def read_manifest_reference(self, job: RenderJob) -> tuple[str, str]:
        if job.manifest_path:
            return self.settings.video_output_bucket, job.manifest_path

        metadata_path = job.metadata.get("manifest_storage_path") or job.metadata.get("manifest_path")
        if isinstance(metadata_path, str) and metadata_path:
            metadata_bucket = job.metadata.get("manifest_bucket")
            return str(metadata_bucket or self.settings.video_output_bucket), metadata_path

        if job.manifest_id:
            response = (
                self.client.table("content_assets")
                .select("bucket_name,storage_path")
                .eq("id", job.manifest_id)
                .maybe_single()
                .execute()
            )
            if not response.data:
                raise RuntimeError(f"Manifest asset not found: {job.manifest_id}")
            return response.data["bucket_name"], response.data["storage_path"]

        response = (
            self.client.table("content_assets")
            .select("bucket_name,storage_path")
            .eq("linked_draft_id", job.draft_id)
            .eq("asset_type", "video")
            .eq("source", "video_preparation")
            .order("created_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )
        if not response.data:
            raise RuntimeError(f"No video preparation manifest found for draft {job.draft_id}.")
        return response.data["bucket_name"], response.data["storage_path"]

    def download_bytes(self, bucket: str, storage_path: str) -> bytes:
        data = self.client.storage.from_(bucket).download(storage_path)
        if isinstance(data, bytes):
            return data
        return bytes(data)

    def download_to_file(self, bucket: str, storage_path: str, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(self.download_bytes(bucket, storage_path))

    def upload_file(self, bucket: str, storage_path: str, source: Path, content_type: str, upsert: bool = False) -> str:
        with source.open("rb") as handle:
            self.client.storage.from_(bucket).upload(
                path=storage_path,
                file=handle,
                file_options={"content-type": content_type, "upsert": str(upsert).lower()},
            )
        public_url = self.client.storage.from_(bucket).get_public_url(storage_path)
        if isinstance(public_url, dict):
            return str(public_url.get("publicUrl") or public_url.get("public_url") or "")
        return str(public_url)

    def remove_file(self, bucket: str, storage_path: str) -> None:
        self.client.storage.from_(bucket).remove([storage_path])

    def upsert_rendered_asset(
        self,
        draft_id: str,
        file_name: str,
        output_path: str,
        output_url: str,
        metadata: dict[str, Any],
    ) -> None:
        (
            self.client.table("content_assets")
            .upsert(
                {
                    "asset_type": "video",
                    "bucket_name": self.settings.video_output_bucket,
                    "file_name": file_name,
                    "linked_draft_id": draft_id,
                    "metadata": metadata,
                    "public_url": output_url,
                    "source": "shorts_renderer",
                    "status": "available",
                    "storage_path": output_path,
                },
                on_conflict="storage_path",
            )
            .execute()
        )
