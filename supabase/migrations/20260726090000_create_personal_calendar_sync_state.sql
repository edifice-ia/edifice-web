create table if not exists public.personal_calendar_sync_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  calendar_id text not null default 'primary',
  channel_id text not null,
  resource_id text not null,
  channel_token text not null,
  expires_at timestamptz not null,
  sync_token text null,
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_calendar_sync_state_user_calendar_key
    unique nulls not distinct (user_id, calendar_id),
  constraint personal_calendar_sync_state_channel_id_key
    unique (channel_id)
);

alter table public.personal_calendar_sync_state enable row level security;

revoke all on table public.personal_calendar_sync_state from anon;

grant select, insert, update, delete on table public.personal_calendar_sync_state to authenticated;

create index if not exists personal_calendar_sync_state_user_id_idx
on public.personal_calendar_sync_state (user_id);

create index if not exists personal_calendar_sync_state_channel_id_idx
on public.personal_calendar_sync_state (channel_id);

create index if not exists personal_calendar_sync_state_expires_at_idx
on public.personal_calendar_sync_state (expires_at);

create or replace function public.set_personal_calendar_sync_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_calendar_sync_state_set_updated_at on public.personal_calendar_sync_state;

create trigger personal_calendar_sync_state_set_updated_at
before update on public.personal_calendar_sync_state
for each row
execute function public.set_personal_calendar_sync_state_updated_at();

drop policy if exists personal_calendar_sync_state_select_own on public.personal_calendar_sync_state;
drop policy if exists personal_calendar_sync_state_insert_own on public.personal_calendar_sync_state;
drop policy if exists personal_calendar_sync_state_update_own on public.personal_calendar_sync_state;
drop policy if exists personal_calendar_sync_state_delete_own on public.personal_calendar_sync_state;

create policy personal_calendar_sync_state_select_own
on public.personal_calendar_sync_state
for select
to authenticated
using (user_id = auth.uid());

create policy personal_calendar_sync_state_insert_own
on public.personal_calendar_sync_state
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_calendar_sync_state_update_own
on public.personal_calendar_sync_state
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy personal_calendar_sync_state_delete_own
on public.personal_calendar_sync_state
for delete
to authenticated
using (user_id = auth.uid());
