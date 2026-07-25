create table if not exists public.personal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  calendar_id text not null default 'primary',
  google_event_id text not null,
  title text null,
  location text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  is_all_day boolean not null default false,
  attendees jsonb null,
  status text not null default 'confirmed',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_calendar_events_user_calendar_event_key
    unique nulls not distinct (user_id, calendar_id, google_event_id),
  constraint personal_calendar_events_status_check
    check (status in ('confirmed', 'tentative', 'cancelled'))
);

alter table public.personal_calendar_events enable row level security;

revoke all on table public.personal_calendar_events from anon;

grant select, insert, update, delete on table public.personal_calendar_events to authenticated;

create index if not exists personal_calendar_events_user_id_idx
on public.personal_calendar_events (user_id);

create index if not exists personal_calendar_events_starts_at_idx
on public.personal_calendar_events (starts_at);

create or replace function public.set_personal_calendar_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_calendar_events_set_updated_at on public.personal_calendar_events;

create trigger personal_calendar_events_set_updated_at
before update on public.personal_calendar_events
for each row
execute function public.set_personal_calendar_events_updated_at();

drop policy if exists personal_calendar_events_select_own on public.personal_calendar_events;
drop policy if exists personal_calendar_events_insert_own on public.personal_calendar_events;
drop policy if exists personal_calendar_events_update_own on public.personal_calendar_events;
drop policy if exists personal_calendar_events_delete_own on public.personal_calendar_events;

create policy personal_calendar_events_select_own
on public.personal_calendar_events
for select
to authenticated
using (user_id = auth.uid());

create policy personal_calendar_events_insert_own
on public.personal_calendar_events
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_calendar_events_update_own
on public.personal_calendar_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy personal_calendar_events_delete_own
on public.personal_calendar_events
for delete
to authenticated
using (user_id = auth.uid());
