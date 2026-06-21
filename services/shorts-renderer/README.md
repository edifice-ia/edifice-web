# Shorts Renderer Railway Service

FastAPI service for rendering Lignes Interieures Shorts from the existing video preparation manifest. It mirrors the local `shorts_montage.py` FFmpeg flow without Windows paths or local fixed folders.

## Endpoints

- `GET /health`
- `POST /internal/render-jobs/{job_id}/dispatch`

The dispatch endpoint requires either:

- `X-Renderer-Secret: <RENDERER_SHARED_SECRET>`
- `Authorization: Bearer <RENDERER_SHARED_SECRET>`

No render endpoint is public without the shared secret.

## Manifest Consumed

The service consumes the JSON manifest already produced by `lib/server/video-preparation.ts`, stored in Supabase Storage under:

`content-assets/lignes-interieures/video-preparation/{draft_id}/video-manifest-*.json`

Expected shape:

```json
{
  "draft_id": "uuid",
  "subtitle_mode": "karaoke",
  "local_subtitle_mode": "karaoke",
  "duration": {
    "audio_seconds": 42.1,
    "target_seconds": 42.1
  },
  "visuals": [
    {
      "bucketName": "content-assets",
      "bucket_name": "content-assets",
      "storagePath": "lignes-interieures/visuels/image.png",
      "storage_path": "lignes-interieures/visuels/image.png",
      "local_file": "visuals/001.png",
      "sceneIndex": 1
    }
  ],
  "audio": {
    "bucket_name": "content-assets",
    "storage_path": "drafts/{draft_id}/audio/voice.mp3",
    "local_file": "voice.mp3"
  },
  "subtitles": {
    "local_mode": "karaoke",
    "mode": "karaoke",
    "srt": {
      "bucketName": "content-assets",
      "storagePath": "drafts/{draft_id}/subtitles/subtitles.srt"
    },
    "json": {
      "bucketName": "content-assets",
      "storagePath": "drafts/{draft_id}/subtitles/subtitles.json"
    },
    "word_timestamps_source": "subtitles.json"
  }
}
```

The renderer accepts both camelCase and snake_case bucket/path keys.

## Railway Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RENDERER_SHARED_SECRET`
- `RENDERER_POLL_INTERVAL_SECONDS`
- `VIDEO_OUTPUT_BUCKET=content-assets`
- `RENDERER_STALE_PROCESSING_MINUTES=45`
- `FFMPEG_PATH=ffmpeg`
- `FFPROBE_PATH=ffprobe`

Do not commit real secrets.

## Local Run Without Docker

From `services/shorts-renderer`:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

FFmpeg and ffprobe must be available on `PATH`, or set `FFMPEG_PATH` and `FFPROBE_PATH`.

## Test Command

```bash
curl -X POST "http://127.0.0.1:8000/internal/render-jobs/JOB_UUID/dispatch" \
  -H "X-Renderer-Secret: $RENDERER_SHARED_SECRET"
```

The job must already exist in `video_render_jobs` with `status = 'queued'`.

## Output

Final MP4 files are uploaded to:

`content-assets/lignes-interieures/videos/{draft_id}/{draft_id}-{job_id}.mp4`

The job is updated with:

- `status = completed`
- `completed_at`
- `output_path`
- `output_url`

On failure, the job is updated with:

- `status = failed`
- `completed_at`
- `error_message`

## Current Limits

- One active render per service process.
- No background polling loop is enabled yet; Vercel or an internal worker can dispatch queued jobs by calling the internal endpoint with the shared secret.
- Subtitle style defaults mirror `shorts_montage.py`; per-manifest `subtitle_style` overrides are supported but the current web manifest does not emit them.
- The local post-folder move step from `shorts_montage.py` is intentionally omitted.
