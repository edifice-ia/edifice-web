create table if not exists public.personal_daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  date date not null,
  recovery_level text not null,
  recommended_focus jsonb null,
  accepted boolean null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_daily_briefs_user_date_key
    unique (user_id, date),
  constraint personal_daily_briefs_recovery_level_check
    check (recovery_level in ('low', 'medium', 'high'))
);

alter table public.personal_daily_briefs enable row level security;

revoke all on table public.personal_daily_briefs from anon;

grant select, insert, update, delete on table public.personal_daily_briefs to authenticated;

create index if not exists personal_daily_briefs_user_id_idx
on public.personal_daily_briefs (user_id);

create index if not exists personal_daily_briefs_date_idx
on public.personal_daily_briefs (date);

create or replace function public.set_personal_daily_briefs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_daily_briefs_set_updated_at on public.personal_daily_briefs;

create trigger personal_daily_briefs_set_updated_at
before update on public.personal_daily_briefs
for each row
execute function public.set_personal_daily_briefs_updated_at();

drop policy if exists personal_daily_briefs_select_own on public.personal_daily_briefs;
drop policy if exists personal_daily_briefs_insert_own on public.personal_daily_briefs;
drop policy if exists personal_daily_briefs_update_own on public.personal_daily_briefs;
drop policy if exists personal_daily_briefs_delete_own on public.personal_daily_briefs;

create policy personal_daily_briefs_select_own
on public.personal_daily_briefs
for select
to authenticated
using (user_id = auth.uid());

create policy personal_daily_briefs_insert_own
on public.personal_daily_briefs
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_daily_briefs_update_own
on public.personal_daily_briefs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy personal_daily_briefs_delete_own
on public.personal_daily_briefs
for delete
to authenticated
using (user_id = auth.uid());
