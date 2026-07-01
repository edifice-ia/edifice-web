alter table public.short_video_publications
drop constraint if exists short_video_publications_status_check;

alter table public.short_video_publications
add constraint short_video_publications_status_check
check (status in (
  'draft',
  'ready',
  'scheduled',
  'due',
  'publishing',
  'processing_media',
  'sending_to_tiktok',
  'uploaded_to_tiktok',
  'awaiting_tiktok_confirmation',
  'published',
  'failed',
  'cancelled'
));

alter table public.short_video_publications
add column if not exists tiktok_publish_id text null,
add column if not exists tiktok_upload_id text null,
add column if not exists tiktok_url text null;

drop index if exists public.short_video_publications_one_active_per_draft_platform_idx;

create unique index if not exists short_video_publications_one_active_per_draft_platform_idx
on public.short_video_publications (draft_id, platform)
where status in (
  'draft',
  'ready',
  'scheduled',
  'due',
  'publishing',
  'processing_media',
  'sending_to_tiktok',
  'uploaded_to_tiktok',
  'awaiting_tiktok_confirmation'
);
