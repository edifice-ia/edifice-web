create table if not exists public.assistant_decision_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  workflow_id text null,
  recommended_decision text not null,
  chosen_action text null,
  source text not null default 'assistant',
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'executed', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists assistant_decision_memory_user_id_idx
on public.assistant_decision_memory (user_id);

create index if not exists assistant_decision_memory_decided_at_idx
on public.assistant_decision_memory (decided_at desc);

create index if not exists assistant_decision_memory_status_idx
on public.assistant_decision_memory (status);

alter table public.assistant_decision_memory enable row level security;

revoke all on table public.assistant_decision_memory from anon;
revoke all on table public.assistant_decision_memory from authenticated;
grant select, insert, update on table public.assistant_decision_memory to authenticated;

drop policy if exists assistant_decision_memory_select_own
on public.assistant_decision_memory;
drop policy if exists assistant_decision_memory_insert_own
on public.assistant_decision_memory;
drop policy if exists assistant_decision_memory_update_own
on public.assistant_decision_memory;

create policy assistant_decision_memory_select_own
on public.assistant_decision_memory
for select
to authenticated
using (user_id = auth.uid());

create policy assistant_decision_memory_insert_own
on public.assistant_decision_memory
for insert
to authenticated
with check (user_id = auth.uid());

create policy assistant_decision_memory_update_own
on public.assistant_decision_memory
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
