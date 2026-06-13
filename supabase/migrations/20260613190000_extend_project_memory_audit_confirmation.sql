alter table public.project_memory_audit_log
add column if not exists confidence numeric(4, 3) null,
add column if not exists user_confirmed boolean not null default true;
