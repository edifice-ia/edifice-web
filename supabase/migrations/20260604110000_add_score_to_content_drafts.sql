alter table public.content_drafts
add column if not exists score jsonb not null default '{}'::jsonb;

create index if not exists content_drafts_score_idx
on public.content_drafts
using gin (score);
