alter table public.content_draft_media_plans
add column if not exists assets_found integer not null default 0,
add column if not exists assets_selected integer not null default 0,
add column if not exists generation_requested boolean not null default false,
add column if not exists generation_reason text,
add column if not exists last_run_at timestamptz;

create index if not exists content_draft_media_plans_generation_requested_idx
on public.content_draft_media_plans (generation_requested);
