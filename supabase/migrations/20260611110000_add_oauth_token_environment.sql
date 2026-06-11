alter table public.oauth_tokens
add column if not exists oauth_environment text;

alter table public.oauth_tokens
drop constraint if exists oauth_tokens_oauth_environment_check;

alter table public.oauth_tokens
add constraint oauth_tokens_oauth_environment_check
check (
  oauth_environment is null
  or oauth_environment in ('production', 'sandbox')
);
