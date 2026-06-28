create table if not exists public.short_video_publications (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.short_video_schedules(id) on delete cascade,
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok')),
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'publishing', 'scheduled', 'published', 'failed', 'cancelled')),
  title text not null,
  description text null,
  hashtags text[] not null default array[]::text[],
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  scheduled_at timestamptz not null,
  timezone text not null default 'Europe/Paris',
  account_id text null,
  youtube_video_id text null,
  youtube_url text null,
  published_at timestamptz null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists short_video_publications_one_active_per_draft_platform_idx
on public.short_video_publications (draft_id, platform)
where status in ('draft', 'ready', 'publishing', 'scheduled');

create unique index if not exists short_video_publications_schedule_platform_idx
on public.short_video_publications (schedule_id, platform);

create index if not exists short_video_publications_status_idx
on public.short_video_publications (platform, status, scheduled_at);

alter table public.short_video_publications enable row level security;

revoke all on table public.short_video_publications from anon;
revoke all on table public.short_video_publications from authenticated;
grant select, insert, update on table public.short_video_publications to authenticated;

create or replace function public.set_short_video_publications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists short_video_publications_set_updated_at
on public.short_video_publications;

create trigger short_video_publications_set_updated_at
before update on public.short_video_publications
for each row
execute function public.set_short_video_publications_updated_at();

drop policy if exists short_video_publications_select_own
on public.short_video_publications;
drop policy if exists short_video_publications_insert_own
on public.short_video_publications;
drop policy if exists short_video_publications_update_own
on public.short_video_publications;

create policy short_video_publications_select_own
on public.short_video_publications
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_publications.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy short_video_publications_insert_own
on public.short_video_publications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_publications.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy short_video_publications_update_own
on public.short_video_publications
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_publications.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_publications.draft_id
      and content_drafts.user_id = auth.uid()
  )
);
