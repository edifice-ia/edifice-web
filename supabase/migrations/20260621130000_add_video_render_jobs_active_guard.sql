create unique index if not exists video_render_jobs_one_active_per_draft_idx
on public.video_render_jobs (draft_id)
where status in ('queued', 'processing');
