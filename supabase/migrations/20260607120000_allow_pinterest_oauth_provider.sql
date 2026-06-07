do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.oauth_tokens'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%provider%'
  loop
    execute format(
      'alter table public.oauth_tokens drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

alter table public.oauth_tokens
add constraint oauth_tokens_provider_check
check (provider in ('youtube', 'tiktok', 'meta', 'pinterest'));
