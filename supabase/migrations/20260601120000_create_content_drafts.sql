create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid null,
  project text null,
  platform_targets text[] null,
  theme text null,
  angle text null,
  hook text null,
  script text null,
  title text null,
  caption text null,
  hashtags text[] null,
  visual_prompt text null,
  voice_style text null,
  status text not null default 'draft',
  source text not null default 'content_workshop'
);

alter table public.content_drafts enable row level security;

revoke all on table public.content_drafts from anon;
grant select, insert, update, delete on table public.content_drafts to authenticated;

create index if not exists content_drafts_user_id_idx
on public.content_drafts (user_id);

create index if not exists content_drafts_status_idx
on public.content_drafts (status);

create index if not exists content_drafts_created_at_idx
on public.content_drafts (created_at desc);

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

drop policy if exists content_drafts_select_own on public.content_drafts;
drop policy if exists content_drafts_insert_own on public.content_drafts;
drop policy if exists content_drafts_update_own on public.content_drafts;
drop policy if exists content_drafts_delete_own on public.content_drafts;

create policy content_drafts_select_own
on public.content_drafts
for select
to authenticated
using (user_id = auth.uid());

create policy content_drafts_insert_own
on public.content_drafts
for insert
to authenticated
with check (user_id = auth.uid());

create policy content_drafts_update_own
on public.content_drafts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy content_drafts_delete_own
on public.content_drafts
for delete
to authenticated
using (user_id = auth.uid());
