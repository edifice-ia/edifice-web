create table if not exists public.cost_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  draft_id uuid null references public.content_drafts(id) on delete set null,
  account_id text null,
  platform text null,
  provider text not null
    check (provider in ('openai', 'elevenlabs', 'railway', 'supabase', 'internal')),
  category text not null
    check (category in ('image_generation', 'image_analysis', 'voice_generation', 'subtitle_generation', 'video_render', 'storage', 'other')),
  quantity numeric null,
  unit text null,
  estimated_cost_eur numeric(12, 6) null,
  actual_cost_eur numeric(12, 6) null,
  currency text not null default 'EUR',
  status text not null default 'estimated'
    check (status in ('estimated', 'recorded', 'reconciled', 'failed')),
  event_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_key)
);

create index if not exists cost_events_occurred_at_idx
on public.cost_events (occurred_at desc);

create index if not exists cost_events_draft_id_idx
on public.cost_events (draft_id);

create index if not exists cost_events_account_id_idx
on public.cost_events (account_id);

create index if not exists cost_events_provider_idx
on public.cost_events (provider);

create index if not exists cost_events_category_idx
on public.cost_events (category);

alter table public.cost_events enable row level security;

revoke all on table public.cost_events from anon;
revoke all on table public.cost_events from authenticated;
grant select, insert, update on table public.cost_events to authenticated;

drop policy if exists cost_events_select_own
on public.cost_events;
drop policy if exists cost_events_insert_own
on public.cost_events;
drop policy if exists cost_events_update_own
on public.cost_events;

create policy cost_events_select_own
on public.cost_events
for select
to authenticated
using (user_id = auth.uid());

create policy cost_events_insert_own
on public.cost_events
for insert
to authenticated
with check (user_id = auth.uid());

create policy cost_events_update_own
on public.cost_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
