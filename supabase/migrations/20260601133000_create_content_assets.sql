create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('image', 'audio', 'video', 'subtitle')),
  file_name text not null,
  bucket_name text not null default 'content-assets',
  storage_path text not null,
  public_url text not null,
  source text not null default 'manual_import',
  status text not null default 'available',
  metadata jsonb not null default '{}'::jsonb,
  usage_count integer not null default 0 check (usage_count >= 0),
  linked_draft_id uuid null references public.content_drafts(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.content_assets enable row level security;

revoke all on table public.content_assets from anon;
revoke all on table public.content_assets from authenticated;
grant select, insert, update, delete on table public.content_assets to authenticated;

create unique index if not exists content_assets_storage_path_key
on public.content_assets (storage_path);

create index if not exists content_assets_asset_type_idx
on public.content_assets (asset_type);

create index if not exists content_assets_status_idx
on public.content_assets (status);

create index if not exists content_assets_linked_draft_id_idx
on public.content_assets (linked_draft_id);

create index if not exists content_assets_created_at_idx
on public.content_assets (created_at desc);

create index if not exists content_assets_metadata_idx
on public.content_assets
using gin (metadata);

drop policy if exists content_assets_authenticated_select on public.content_assets;
drop policy if exists content_assets_authenticated_insert on public.content_assets;
drop policy if exists content_assets_authenticated_update on public.content_assets;
drop policy if exists content_assets_authenticated_delete on public.content_assets;

create policy content_assets_authenticated_select
on public.content_assets
for select
to authenticated
using (true);

create policy content_assets_authenticated_insert
on public.content_assets
for insert
to authenticated
with check (true);

create policy content_assets_authenticated_update
on public.content_assets
for update
to authenticated
using (true)
with check (true);

create policy content_assets_authenticated_delete
on public.content_assets
for delete
to authenticated
using (true);
