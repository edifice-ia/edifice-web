create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  global_preferences jsonb not null default '{}'::jsonb,
  account_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

revoke all on table public.user_preferences from anon;
revoke all on table public.user_preferences from authenticated;
grant select, insert, update on table public.user_preferences to authenticated;

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_preferences_set_updated_at
on public.user_preferences;

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();

drop policy if exists user_preferences_select_own
on public.user_preferences;
drop policy if exists user_preferences_insert_own
on public.user_preferences;
drop policy if exists user_preferences_update_own
on public.user_preferences;

create policy user_preferences_select_own
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

create policy user_preferences_insert_own
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

create policy user_preferences_update_own
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
