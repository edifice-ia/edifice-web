create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  user_id uuid null,
  asset_type text not null check (asset_type in ('image', 'audio', 'video')),
  bucket text not null default 'content-assets',
  storage_path text not null,
  public_url text not null,
  original_filename text null,
  content_type text null,
  size_bytes bigint null,
  status text not null default 'stored',
  source text not null default 'content_workshop_upload'
);

alter table public.content_assets enable row level security;

revoke all on table public.content_assets from anon;
revoke all on table public.content_assets from authenticated;

create index if not exists content_assets_draft_id_idx
on public.content_assets (draft_id);

create index if not exists content_assets_user_id_idx
on public.content_assets (user_id);

create index if not exists content_assets_asset_type_idx
on public.content_assets (asset_type);
