create table if not exists public.project_memory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category text null,
  status text null,
  title text not null,
  content text null,
  next_action text null,
  priority text null,
  source text null
);

alter table public.project_memory enable row level security;

revoke all on table public.project_memory from anon;
revoke all on table public.project_memory from authenticated;

create or replace function public.set_project_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_memory_set_updated_at on public.project_memory;

create trigger project_memory_set_updated_at
before update on public.project_memory
for each row
execute function public.set_project_memory_updated_at();
