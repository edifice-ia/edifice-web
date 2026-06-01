create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid null,
  status text not null default 'draft',
  theme text not null,
  angle text null,
  platform text not null default 'Multi-plateforme',
  idea text not null,
  hook text not null,
  script text not null,
  title text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  visual_prompt text not null,
  visual_prompts jsonb not null default '[]'::jsonb,
  emotional_angle text null,
  estimated_duration text null,
  score jsonb not null default '{}'::jsonb,
  source_summary jsonb not null default '[]'::jsonb
);

alter table public.content_drafts enable row level security;

revoke all on table public.content_drafts from anon;
revoke all on table public.content_drafts from authenticated;

create or replace function public.set_content_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_drafts_set_updated_at on public.content_drafts;

create trigger content_drafts_set_updated_at
before update on public.content_drafts
for each row
execute function public.set_content_drafts_updated_at();
