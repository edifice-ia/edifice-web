alter table public.content_drafts
add column if not exists voice_validated_at timestamptz null,
add column if not exists voice_validated_by uuid null;

alter table public.content_drafts
drop constraint if exists content_drafts_voice_status_check;

alter table public.content_drafts
add constraint content_drafts_voice_status_check
check (voice_status in ('not_ready', 'pending', 'generating', 'ready', 'validated', 'error'));

create index if not exists content_drafts_voice_validated_at_idx
on public.content_drafts (voice_validated_at);
