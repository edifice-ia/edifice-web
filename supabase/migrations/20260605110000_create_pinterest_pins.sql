create table if not exists public.pinterest_pins (
  id uuid primary key default gen_random_uuid(),
  local_id text not null,
  account_id text not null,
  account_name text null,
  niche text null,
  title text null,
  description text null,
  keywords text[] not null default '{}'::text[],
  board_name text null,
  board_id text null,
  status text not null default 'generated',
  source_post_id text null,
  local_image_path text null,
  storage_bucket text null,
  storage_path text null,
  public_image_url text null,
  pin_url text null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  constraint pinterest_pins_account_local_key unique (account_id, local_id)
);

create index if not exists pinterest_pins_account_id_idx
on public.pinterest_pins (account_id);

create index if not exists pinterest_pins_status_idx
on public.pinterest_pins (status);

create index if not exists pinterest_pins_created_at_idx
on public.pinterest_pins (created_at desc);

create index if not exists pinterest_pins_storage_path_idx
on public.pinterest_pins (storage_path);

create index if not exists pinterest_pins_raw_payload_idx
on public.pinterest_pins
using gin (raw_payload);

create or replace function public.set_pinterest_pins_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pinterest_pins_set_updated_at on public.pinterest_pins;

create trigger pinterest_pins_set_updated_at
before update on public.pinterest_pins
for each row
execute function public.set_pinterest_pins_updated_at();

alter table public.pinterest_pins enable row level security;

revoke all on table public.pinterest_pins from anon;
revoke all on table public.pinterest_pins from authenticated;
grant select on table public.pinterest_pins to authenticated;

drop policy if exists pinterest_pins_authenticated_select on public.pinterest_pins;

create policy pinterest_pins_authenticated_select
on public.pinterest_pins
for select
to authenticated
using (true);
