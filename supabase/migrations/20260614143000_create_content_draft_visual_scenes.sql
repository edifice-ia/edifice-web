create table if not exists public.content_draft_visual_scenes (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  asset_id uuid null references public.content_assets(id) on delete set null,
  visual_prompt_index integer not null check (visual_prompt_index between 1 and 7),
  visual_prompt_text text not null default '',
  generation_source text not null default 'library'
    check (generation_source in ('library', 'generated', 'regenerated')),
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'generated', 'failed', 'selected', 'retained', 'rejected')),
  image_url text,
  storage_path text,
  score_total numeric,
  score_breakdown jsonb not null default '{}'::jsonb,
  score_source text not null default 'none'
    check (score_source in ('heuristic', 'gpt_vision', 'none')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, visual_prompt_index)
);

alter table public.content_draft_visual_scenes enable row level security;

revoke all on table public.content_draft_visual_scenes from anon;
grant select, insert, update, delete on table public.content_draft_visual_scenes to authenticated;

create index if not exists content_draft_visual_scenes_draft_id_idx
on public.content_draft_visual_scenes (draft_id);

create index if not exists content_draft_visual_scenes_asset_id_idx
on public.content_draft_visual_scenes (asset_id);

create index if not exists content_draft_visual_scenes_status_idx
on public.content_draft_visual_scenes (generation_status);

create or replace function public.set_content_draft_visual_scenes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_draft_visual_scenes_set_updated_at
on public.content_draft_visual_scenes;

create trigger content_draft_visual_scenes_set_updated_at
before update on public.content_draft_visual_scenes
for each row
execute function public.set_content_draft_visual_scenes_updated_at();

drop policy if exists content_draft_visual_scenes_select_own
on public.content_draft_visual_scenes;
drop policy if exists content_draft_visual_scenes_insert_own
on public.content_draft_visual_scenes;
drop policy if exists content_draft_visual_scenes_update_own
on public.content_draft_visual_scenes;
drop policy if exists content_draft_visual_scenes_delete_own
on public.content_draft_visual_scenes;

create policy content_draft_visual_scenes_select_own
on public.content_draft_visual_scenes
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_visual_scenes.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_visual_scenes_insert_own
on public.content_draft_visual_scenes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_visual_scenes.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_visual_scenes_update_own
on public.content_draft_visual_scenes
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_visual_scenes.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_visual_scenes.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_draft_visual_scenes_delete_own
on public.content_draft_visual_scenes
for delete
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_draft_visual_scenes.draft_id
      and content_drafts.user_id = auth.uid()
  )
);
