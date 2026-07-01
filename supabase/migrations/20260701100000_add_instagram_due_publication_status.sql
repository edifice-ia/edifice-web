alter table public.short_video_publications
drop constraint if exists short_video_publications_status_check;

alter table public.short_video_publications
add constraint short_video_publications_status_check
check (status in ('draft', 'ready', 'scheduled', 'due', 'publishing', 'processing_media', 'published', 'failed', 'cancelled'));

drop index if exists public.short_video_publications_one_active_per_draft_platform_idx;

create unique index if not exists short_video_publications_one_active_per_draft_platform_idx
on public.short_video_publications (draft_id, platform)
where status in ('draft', 'ready', 'scheduled', 'due', 'publishing', 'processing_media');
