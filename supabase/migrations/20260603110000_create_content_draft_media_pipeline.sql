create table if not exists public.content_draft_asset_links (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  asset_id uuid not null references public.content_assets(id) on delete cascade,
  asset_source text not null default 'library' check (asset_source in ('library', 'generated')),
  score numeric,
  position integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (draft_id, asset_id)
);

create table if not exists public.content_draft_media_plans (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.content_drafts(id) on delete cascade unique,
  action text not null default 'prepare_media',
  media_pipeline_status text not null default 'media_ready',
  visual_decision_mode text,
  visual_decision jsonb default '{}'::jsonb,
  missing_visual_needs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.content_draft_asset_links enable row level security;
alter table public.content_draft_media_plans enable row level security;

revoke all on table public.content_draft_asset_links from anon;
revoke all on table public.content_draft_media_plans from anon;
grant select, insert, update, delete on table public.content_draft_asset_links to authenticated;
grant select, insert, update, delete on table public.content_draft_media_plans to authenticated;

create index if not exists content_draft_asset_links_draft_id_idx
on public.content_draft_asset_links (draft_id);

create index if not exists content_draft_asset_links_asset_id_idx
on public.content_draft_asset_links (asset_id);

create index if not exists content_draft_asset_links_position_idx
on public.content_draft_asset_links (draft_id, position);

create index if not exists content_draft_asset_links_asset_source_idx
on public.content_draft_asset_links (asset_source);

create index if not exists content_draft_media_plans_draft_id_idx
on public.content_draft_media_plans (draft_id);

create or replace function public.set_content_draft_media_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_draft_media_plans_set_updated_at
on public.content_draft_media_plans;

create trigger content_draft_media_plans_set_updated_at
before update on public.content_draft_media_plans
for each row
execute function public.set_content_draft_media_plans_updated_at();

drop policy if exists content_draft_asset_links_select_own
on public.content_draft_asset_links;
drop policy if exists content_draft_asset_links_insert_own
on public.content_draft_asset_links;
drop policy if exists content_draft_asset_links_update_own
on public.content_draft_asset_links;
drop policy if exists content_draft_asset_links_delete_own
on public.content_draft_asset_links;

create policy content_draft_asset_links_select_own
on public.content_draft_asset_links
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_asset_links.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_asset_links_insert_own
on public.content_draft_asset_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_asset_links.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_asset_links_update_own
on public.content_draft_asset_links
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_asset_links.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_asset_links.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_asset_links_delete_own
on public.content_draft_asset_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_asset_links.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

drop policy if exists content_draft_media_plans_select_own
on public.content_draft_media_plans;
drop policy if exists content_draft_media_plans_insert_own
on public.content_draft_media_plans;
drop policy if exists content_draft_media_plans_update_own
on public.content_draft_media_plans;
drop policy if exists content_draft_media_plans_delete_own
on public.content_draft_media_plans;

create policy content_draft_media_plans_select_own
on public.content_draft_media_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_media_plans.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_media_plans_insert_own
on public.content_draft_media_plans
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_media_plans.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_media_plans_update_own
on public.content_draft_media_plans
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_media_plans.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_media_plans.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_media_plans_delete_own
on public.content_draft_media_plans
for delete
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_media_plans.draft_id
      and content_drafts.user_id = auth.uid()
  )
);
