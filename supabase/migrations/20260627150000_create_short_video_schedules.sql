create table if not exists public.short_video_schedules (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  scheduled_at timestamptz not null,
  timezone text not null default 'Europe/Paris',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'published', 'failed')),
  recommendation_source text not null default 'default'
    check (recommendation_source in ('default', 'account_analytics', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, platform, scheduled_at),
  unique (platform, scheduled_at)
);

alter table public.short_video_schedules enable row level security;

revoke all on table public.short_video_schedules from anon;
revoke all on table public.short_video_schedules from authenticated;
grant select, insert, update on table public.short_video_schedules to authenticated;

create index if not exists short_video_schedules_draft_id_idx
on public.short_video_schedules (draft_id);

create index if not exists short_video_schedules_scheduled_at_idx
on public.short_video_schedules (scheduled_at);

create index if not exists short_video_schedules_platform_status_idx
on public.short_video_schedules (platform, status);

create or replace function public.set_short_video_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists short_video_schedules_set_updated_at
on public.short_video_schedules;

create trigger short_video_schedules_set_updated_at
before update on public.short_video_schedules
for each row
execute function public.set_short_video_schedules_updated_at();

drop policy if exists short_video_schedules_select_own
on public.short_video_schedules;
drop policy if exists short_video_schedules_insert_own
on public.short_video_schedules;
drop policy if exists short_video_schedules_update_own
on public.short_video_schedules;

create policy short_video_schedules_select_own
on public.short_video_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_schedules.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy short_video_schedules_insert_own
on public.short_video_schedules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_schedules.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy short_video_schedules_update_own
on public.short_video_schedules
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_schedules.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = short_video_schedules.draft_id
      and content_drafts.user_id = auth.uid()
  )
);
