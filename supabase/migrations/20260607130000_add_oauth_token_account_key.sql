alter table public.oauth_tokens
add column if not exists account_key text not null default 'default';

update public.oauth_tokens
set account_key = 'default'
where account_key is null or btrim(account_key) = '';

update public.oauth_tokens
set account_key = 'edifice_discipline'
where provider = 'pinterest'
  and account_key = 'default';

alter table public.oauth_tokens
alter column account_key set not null;

alter table public.oauth_tokens
drop constraint if exists oauth_tokens_provider_key;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.oauth_tokens'::regclass
      and contype = 'u'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.oauth_tokens'::regclass
            and attname = 'provider'
        )
      ]::smallint[]
  loop
    execute format(
      'alter table public.oauth_tokens drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

drop index if exists oauth_tokens_provider_account_key_key;

alter table public.oauth_tokens
add constraint oauth_tokens_provider_account_key_key
unique (provider, account_key);

create index if not exists oauth_tokens_provider_account_key_idx
on public.oauth_tokens (provider, account_key);
