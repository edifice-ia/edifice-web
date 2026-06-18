alter table public.content_drafts
add column if not exists voice_status text not null default 'not_ready',
add column if not exists selected_voice_id text null,
add column if not exists voice_asset_id uuid null references public.content_assets(id) on delete set null,
add column if not exists voice_generated_at timestamptz null,
add column if not exists voice_error text null;

alter table public.content_drafts
drop constraint if exists content_drafts_voice_status_check;

alter table public.content_drafts
add constraint content_drafts_voice_status_check
check (voice_status in ('not_ready', 'pending', 'generating', 'ready', 'error'));

create index if not exists content_drafts_voice_status_idx
on public.content_drafts (voice_status);

create index if not exists content_drafts_voice_asset_id_idx
on public.content_drafts (voice_asset_id);
