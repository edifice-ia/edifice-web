alter table public.content_draft_visual_scenes
add column if not exists retained_at timestamptz null,
add column if not exists retained_by uuid null references auth.users(id) on delete set null,
add column if not exists locked boolean not null default false;

create index if not exists content_draft_visual_scenes_locked_idx
on public.content_draft_visual_scenes (draft_id, locked);

alter table public.content_drafts
add column if not exists visuals_validated_at timestamptz null,
add column if not exists protected boolean not null default false,
add column if not exists protected_at timestamptz null,
add column if not exists visual_status text not null default 'draft';

alter table public.content_drafts
drop constraint if exists content_drafts_visual_status_check;

alter table public.content_drafts
add constraint content_drafts_visual_status_check
check (visual_status in ('draft', 'in_progress', 'visual_ready'));

create index if not exists content_drafts_protected_idx
on public.content_drafts (protected);

create index if not exists content_drafts_visual_status_idx
on public.content_drafts (visual_status);
