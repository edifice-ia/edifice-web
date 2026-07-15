create table if not exists public.personal_garmin_daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  date date not null,
  sleep_score integer null,
  sleep_duration_minutes integer null,
  sleep_deep_minutes integer null,
  sleep_rem_minutes integer null,
  sleep_light_minutes integer null,
  body_battery_min integer null,
  body_battery_max integer null,
  body_battery_charged integer null,
  body_battery_drained integer null,
  hrv_status text null,
  hrv_last_night_avg integer null,
  resting_heart_rate integer null,
  stress_avg integer null,
  stress_max integer null,
  training_load_7day numeric null,
  training_readiness_score integer null,
  raw_payload jsonb null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_garmin_daily_stats_user_date_key
    unique (user_id, date),
  constraint personal_garmin_daily_stats_sleep_score_check
    check (sleep_score is null or (sleep_score >= 0 and sleep_score <= 100)),
  constraint personal_garmin_daily_stats_body_battery_min_check
    check (body_battery_min is null or (body_battery_min >= 0 and body_battery_min <= 100)),
  constraint personal_garmin_daily_stats_body_battery_max_check
    check (body_battery_max is null or (body_battery_max >= 0 and body_battery_max <= 100)),
  constraint personal_garmin_daily_stats_stress_avg_check
    check (stress_avg is null or (stress_avg >= 0 and stress_avg <= 100)),
  constraint personal_garmin_daily_stats_stress_max_check
    check (stress_max is null or (stress_max >= 0 and stress_max <= 100)),
  constraint personal_garmin_daily_stats_training_readiness_score_check
    check (training_readiness_score is null or (training_readiness_score >= 0 and training_readiness_score <= 100))
);

alter table public.personal_garmin_daily_stats enable row level security;

revoke all on table public.personal_garmin_daily_stats from anon;

grant select, insert, update, delete on table public.personal_garmin_daily_stats to authenticated;

create index if not exists personal_garmin_daily_stats_user_id_idx
on public.personal_garmin_daily_stats (user_id);

create index if not exists personal_garmin_daily_stats_date_idx
on public.personal_garmin_daily_stats (date);

create or replace function public.set_personal_garmin_daily_stats_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_garmin_daily_stats_set_updated_at on public.personal_garmin_daily_stats;

create trigger personal_garmin_daily_stats_set_updated_at
before update on public.personal_garmin_daily_stats
for each row
execute function public.set_personal_garmin_daily_stats_updated_at();

drop policy if exists personal_garmin_daily_stats_select_own on public.personal_garmin_daily_stats;
drop policy if exists personal_garmin_daily_stats_insert_own on public.personal_garmin_daily_stats;
drop policy if exists personal_garmin_daily_stats_update_own on public.personal_garmin_daily_stats;
drop policy if exists personal_garmin_daily_stats_delete_own on public.personal_garmin_daily_stats;

create policy personal_garmin_daily_stats_select_own
on public.personal_garmin_daily_stats
for select
to authenticated
using (user_id = auth.uid());

create policy personal_garmin_daily_stats_insert_own
on public.personal_garmin_daily_stats
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_garmin_daily_stats_update_own
on public.personal_garmin_daily_stats
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy personal_garmin_daily_stats_delete_own
on public.personal_garmin_daily_stats
for delete
to authenticated
using (user_id = auth.uid());
