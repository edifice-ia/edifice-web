create table if not exists public.publication_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.short_video_publications(id) on delete cascade,
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  account_id text null,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok')),
  external_media_id text null,
  collection_interval text not null default 'latest',
  fetched_at timestamptz not null default now(),
  published_at timestamptz null,
  views bigint null,
  reach bigint null,
  likes bigint null,
  comments bigint null,
  shares bigint null,
  saves bigint null,
  watch_time_seconds numeric null,
  average_view_duration_seconds numeric null,
  average_view_percentage numeric null,
  subscribers_gained bigint null,
  metrics jsonb not null default '{}'::jsonb,
  status text not null default 'ok'
    check (status in ('ok', 'partial', 'failed', 'unavailable')),
  source text not null default 'api'
    check (source in ('api', 'manual', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists publication_performance_snapshots_interval_idx
on public.publication_performance_snapshots (publication_id, source, collection_interval);

create index if not exists publication_performance_snapshots_draft_idx
on public.publication_performance_snapshots (draft_id, fetched_at desc);

create index if not exists publication_performance_snapshots_platform_idx
on public.publication_performance_snapshots (platform, fetched_at desc);

create index if not exists publication_performance_snapshots_account_idx
on public.publication_performance_snapshots (account_id, fetched_at desc);

alter table public.publication_performance_snapshots enable row level security;

revoke all on table public.publication_performance_snapshots from anon;
revoke all on table public.publication_performance_snapshots from authenticated;
grant select, insert, update on table public.publication_performance_snapshots to authenticated;

create or replace function public.set_publication_performance_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists publication_performance_snapshots_set_updated_at
on public.publication_performance_snapshots;

create trigger publication_performance_snapshots_set_updated_at
before update on public.publication_performance_snapshots
for each row
execute function public.set_publication_performance_snapshots_updated_at();

drop policy if exists publication_performance_snapshots_select_own
on public.publication_performance_snapshots;
drop policy if exists publication_performance_snapshots_insert_own
on public.publication_performance_snapshots;
drop policy if exists publication_performance_snapshots_update_own
on public.publication_performance_snapshots;

create policy publication_performance_snapshots_select_own
on public.publication_performance_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = publication_performance_snapshots.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy publication_performance_snapshots_insert_own
on public.publication_performance_snapshots
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = publication_performance_snapshots.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy publication_performance_snapshots_update_own
on public.publication_performance_snapshots
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = publication_performance_snapshots.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = publication_performance_snapshots.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create table if not exists public.publication_performance_recommendation_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recommendation_key text not null,
  action text not null check (action in ('accepted', 'ignored')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, recommendation_key, action)
);

alter table public.publication_performance_recommendation_actions enable row level security;

revoke all on table public.publication_performance_recommendation_actions from anon;
revoke all on table public.publication_performance_recommendation_actions from authenticated;
grant select, insert, update on table public.publication_performance_recommendation_actions to authenticated;

drop policy if exists publication_performance_recommendation_actions_own
on public.publication_performance_recommendation_actions;

create policy publication_performance_recommendation_actions_own
on public.publication_performance_recommendation_actions
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
