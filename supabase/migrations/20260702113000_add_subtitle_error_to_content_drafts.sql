alter table public.content_drafts
add column if not exists subtitle_error text null,
add column if not exists subtitle_mode text null;
