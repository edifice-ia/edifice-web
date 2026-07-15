alter table public.trajectoire_actions
add column if not exists effort_level text not null default 'medium';

alter table public.trajectoire_actions
drop constraint if exists trajectoire_actions_effort_level_check;

alter table public.trajectoire_actions
add constraint trajectoire_actions_effort_level_check
check (effort_level in ('low', 'medium', 'high'));
