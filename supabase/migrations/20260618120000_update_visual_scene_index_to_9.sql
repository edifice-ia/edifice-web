alter table public.content_draft_visual_scenes
  drop constraint if exists content_draft_visual_scenes_visual_prompt_index_check;

alter table public.content_draft_visual_scenes
  add constraint content_draft_visual_scenes_visual_prompt_index_check
  check (visual_prompt_index between 1 and 9);
