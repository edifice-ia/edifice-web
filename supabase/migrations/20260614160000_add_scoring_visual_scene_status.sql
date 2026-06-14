alter table public.content_draft_visual_scenes
drop constraint if exists content_draft_visual_scenes_generation_status_check;

alter table public.content_draft_visual_scenes
add constraint content_draft_visual_scenes_generation_status_check
check (
  generation_status in (
    'pending',
    'searching_library',
    'selected_from_library',
    'scoring',
    'generating',
    'uploading',
    'ready',
    'error',
    'retained',
    'rejected',
    'generated',
    'failed',
    'selected'
  )
);
