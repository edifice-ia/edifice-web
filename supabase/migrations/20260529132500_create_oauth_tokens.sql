create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  access_token text not null,
  refresh_token text null,
  token_type text null,
  scope text null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oauth_tokens enable row level security;

revoke all on table public.oauth_tokens from anon;
revoke all on table public.oauth_tokens from authenticated;

create or replace function public.set_oauth_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists oauth_tokens_set_updated_at on public.oauth_tokens;

create trigger oauth_tokens_set_updated_at
before update on public.oauth_tokens
for each row
execute function public.set_oauth_tokens_updated_at();
