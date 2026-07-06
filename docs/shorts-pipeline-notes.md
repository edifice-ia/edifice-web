# Shorts pipeline notes

This note documents the current operational contract for the Shorts workshop.
It is intentionally compact: source code remains the authority for exact fields.

## Production modes

Pilotage IA exposes three production modes:

- **Assisted** is the default mode. It runs safe generation steps automatically
  and stops when human judgement adds value: visual choice, voice choice, final
  video validation, definitive scheduling and real publication.
- **Automatic** chains generation and internal validations without interruption,
  but still cannot save a final schedule or publish without explicit human
  authorization.
- **Manual** keeps the previous workshop behavior: each step is opened and
  launched individually from its dedicated screen.

The runner can execute visual generation, voice generation, subtitle generation,
video manifest preparation, Railway render job dispatch and schedule proposal
calculation. It must not execute real publication, definitive schedule saving,
deletion, critical configuration changes or secret changes.

The runner always re-reads Supabase after each execution pass before selecting
the next action. This keeps page reloads coherent and avoids assuming that a
remote generation succeeded without durable state.

## Pipeline

1. Text is approved on `content_drafts.status`.
2. Visuals are selected and validated from canonical library assets.
3. Voice is generated, then manually validated.
4. Subtitles are generated from the validated audio asset, then manually validated.
5. Video preparation writes a manifest asset under `content-assets/lignes-interieures/video-preparation/{draft_id}/`.
6. Vercel creates or reuses a `video_render_jobs` row and dispatches Railway.
7. Railway renders FFmpeg output, uploads the MP4, and updates `video_render_jobs`.
8. The video is manually validated.
9. Scheduling creates `short_video_schedules` rows per platform.
10. Publication uses platform-specific `short_video_publications` rows.

## Main Supabase tables

- `content_drafts`: broad workshop status and legacy status compatibility.
- `content_assets`: visual, audio, subtitle and manifest assets.
- `visual_prompt_generations`: selected/retained visual scenes.
- `video_render_jobs`: Railway render jobs and final MP4 validation metadata.
- `short_video_schedules`: planning intent per draft/platform/time.
- `short_video_publications`: platform preparation and execution state.
- `cost_events`: estimated or actual cost tracking.

## Important status signals

- Voice is considered reusable when `voice_status=validated` and an audio asset exists.
- Subtitles are considered validated from subtitle asset metadata, especially `subtitle_validation_status=validated`.
- Video preparation readiness is stored on the manifest asset with `video_preparation_status=ready`.
- Final video validation should be read first from `video_render_jobs.metadata.video_validation_status=validated`.
- `content_drafts.status=video_validated` is useful for the UI, but it can lag behind the render job metadata.
- A schedule is active unless its status is `cancelled`, `failed` or `published`.
- A publication is platform-specific and can be `ready`, `scheduled`, `publishing`, `processing_media`, `published`, `failed` or `cancelled`.

## Vercel and Railway

- Vercel must not run FFmpeg.
- Vercel creates/reuses the job and dispatches Railway with the shared secret.
- Railway owns downloads, FFmpeg, upload and final job status.
- If Railway dispatch fails before acceptance, the job must be marked `failed`.

## Scheduling and publication

- One selected draft can have separate schedules for TikTok, Instagram and YouTube Shorts.
- `Toutes les plateformes` must expand to three platform rows, never to a generic platform.
- Scheduling availability is based on a validated final MP4, not only `content_drafts.status`.
- Publication lists should separate status tabs from platform filters to avoid visual duplicates.
- YouTube future publication is uploaded immediately as private with `publishAt`.
- Instagram scheduled publication is handled by the protected cron route.
- TikTok v1 sends content to TikTok for manual finalization; direct public posting stays disabled.

## Watch list

- TODO: Reduce legacy mojibake status labels once old drafts have been migrated or archived.
- TODO: Keep `short_video_schedules.status` and `short_video_publications.status` reconciled after external platform callbacks or manual tests.
- NOTE: Any future status migration should update `lib/short-workflow.ts`, `lib/server/shorts-scheduling.ts` and `lib/server/shorts-publication.ts` together.
- NOTE: Cost history can be estimated via backfill, but estimated costs must stay visually distinct from reconciled costs.
