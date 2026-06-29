alter table public.short_video_publications
drop constraint if exists short_video_publications_status_check;

alter table public.short_video_publications
add constraint short_video_publications_status_check
check (status in ('draft', 'ready', 'publishing', 'processing_media', 'scheduled', 'published', 'failed', 'cancelled'));

alter table public.short_video_publications
add column if not exists instagram_media_id text null,
add column if not exists instagram_permalink text null;

drop index if exists public.short_video_publications_one_active_per_draft_platform_idx;

create unique index if not exists short_video_publications_one_active_per_draft_platform_idx
on public.short_video_publications (draft_id, platform)
where status in ('draft', 'ready', 'publishing', 'processing_media', 'scheduled');
