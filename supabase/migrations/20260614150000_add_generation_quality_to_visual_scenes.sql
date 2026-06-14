alter table public.content_draft_visual_scenes
add column if not exists generation_quality text not null default 'medium';

alter table public.content_draft_visual_scenes
drop constraint if exists content_draft_visual_scenes_generation_quality_check;

alter table public.content_draft_visual_scenes
add constraint content_draft_visual_scenes_generation_quality_check
check (generation_quality in ('low', 'medium', 'high'));
