alter table public.project_memory
add column if not exists key text null,
add column if not exists value text null,
add column if not exists confidence numeric(4, 3) null;

create unique index if not exists project_memory_key_idx
on public.project_memory (key)
where key is not null;

create table if not exists public.project_memory_audit_log (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null,
  previous_value jsonb null,
  next_value jsonb not null,
  source text null,
  user_id uuid null,
  created_at timestamptz not null default now()
);

alter table public.project_memory_audit_log enable row level security;

revoke all on table public.project_memory_audit_log from anon;
revoke all on table public.project_memory_audit_log from authenticated;

create index if not exists project_memory_audit_log_memory_key_idx
on public.project_memory_audit_log (memory_key);

create index if not exists project_memory_audit_log_created_at_idx
on public.project_memory_audit_log (created_at desc);
