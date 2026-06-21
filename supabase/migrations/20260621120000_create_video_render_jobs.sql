create table if not exists public.video_render_jobs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  manifest_id uuid null references public.content_assets(id) on delete set null,
  manifest_path text null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  output_path text null,
  output_url text null,
  metadata jsonb not null default '{}'::jsonb,
  constraint video_render_jobs_manifest_reference_check
    check (manifest_id is not null or manifest_path is not null or jsonb_typeof(metadata) = 'object')
);

alter table public.video_render_jobs enable row level security;

revoke all on table public.video_render_jobs from anon;
revoke all on table public.video_render_jobs from authenticated;
grant select, insert, update on table public.video_render_jobs to authenticated;

create index if not exists video_render_jobs_draft_id_idx
on public.video_render_jobs (draft_id);

create index if not exists video_render_jobs_status_requested_at_idx
on public.video_render_jobs (status, requested_at);

create index if not exists video_render_jobs_processing_started_at_idx
on public.video_render_jobs (started_at)
where status = 'processing';

create index if not exists video_render_jobs_manifest_id_idx
on public.video_render_jobs (manifest_id);

drop policy if exists video_render_jobs_select_own
on public.video_render_jobs;
drop policy if exists video_render_jobs_insert_own
on public.video_render_jobs;
drop policy if exists video_render_jobs_update_own
on public.video_render_jobs;

create policy video_render_jobs_select_own
on public.video_render_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = video_render_jobs.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy video_render_jobs_insert_own
on public.video_render_jobs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = video_render_jobs.draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy video_render_jobs_update_own
on public.video_render_jobs
for update
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = video_render_jobs.draft_id
      and content_drafts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = video_render_jobs.draft_id
      and content_drafts.user_id = auth.uid()
  )
);
