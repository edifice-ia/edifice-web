create table if not exists public.trajectoire_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  description text null,
  category text not null default 'Autre',
  status text not null default 'actif',
  priority text not null default 'moyenne',
  deadline date null,
  progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trajectoire_projects_category_check
    check (category in (
      'L''Edifice',
      'Projets perso',
      'Sport',
      'Ecriture',
      'Alternance / travail',
      'Administratif',
      'Sante',
      'Autre'
    )),
  constraint trajectoire_projects_status_check
    check (status in ('actif', 'pause', 'termine', 'archive')),
  constraint trajectoire_projects_priority_check
    check (priority in ('basse', 'moyenne', 'haute')),
  constraint trajectoire_projects_progress_check
    check (progress >= 0 and progress <= 100)
);

create table if not exists public.trajectoire_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  project_id uuid not null references public.trajectoire_projects(id) on delete cascade,
  title text not null,
  description text null,
  deadline date null,
  status text not null default 'non commence',
  priority text not null default 'moyenne',
  progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trajectoire_objectives_status_check
    check (status in ('non commence', 'en cours', 'bloque', 'reporte', 'termine')),
  constraint trajectoire_objectives_priority_check
    check (priority in ('basse', 'moyenne', 'haute')),
  constraint trajectoire_objectives_progress_check
    check (progress >= 0 and progress <= 100)
);

create table if not exists public.trajectoire_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  objective_id uuid not null references public.trajectoire_objectives(id) on delete cascade,
  title text not null,
  status text not null default 'a faire',
  due_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trajectoire_actions_status_check
    check (status in ('a faire', 'en cours', 'fait'))
);

alter table public.trajectoire_projects enable row level security;
alter table public.trajectoire_objectives enable row level security;
alter table public.trajectoire_actions enable row level security;

revoke all on table public.trajectoire_projects from anon;
revoke all on table public.trajectoire_objectives from anon;
revoke all on table public.trajectoire_actions from anon;

grant select, insert, update, delete on table public.trajectoire_projects to authenticated;
grant select, insert, update, delete on table public.trajectoire_objectives to authenticated;
grant select, insert, update, delete on table public.trajectoire_actions to authenticated;

create index if not exists trajectoire_projects_user_id_idx
on public.trajectoire_projects (user_id);

create index if not exists trajectoire_projects_status_idx
on public.trajectoire_projects (status);

create index if not exists trajectoire_projects_deadline_idx
on public.trajectoire_projects (deadline);

create index if not exists trajectoire_objectives_project_id_idx
on public.trajectoire_objectives (project_id);

create index if not exists trajectoire_objectives_user_id_idx
on public.trajectoire_objectives (user_id);

create index if not exists trajectoire_objectives_deadline_idx
on public.trajectoire_objectives (deadline);

create index if not exists trajectoire_actions_objective_id_idx
on public.trajectoire_actions (objective_id);

create index if not exists trajectoire_actions_user_id_idx
on public.trajectoire_actions (user_id);

create index if not exists trajectoire_actions_due_date_idx
on public.trajectoire_actions (due_date);

create or replace function public.set_trajectoire_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trajectoire_projects_set_updated_at on public.trajectoire_projects;
drop trigger if exists trajectoire_objectives_set_updated_at on public.trajectoire_objectives;
drop trigger if exists trajectoire_actions_set_updated_at on public.trajectoire_actions;

create trigger trajectoire_projects_set_updated_at
before update on public.trajectoire_projects
for each row
execute function public.set_trajectoire_updated_at();

create trigger trajectoire_objectives_set_updated_at
before update on public.trajectoire_objectives
for each row
execute function public.set_trajectoire_updated_at();

create trigger trajectoire_actions_set_updated_at
before update on public.trajectoire_actions
for each row
execute function public.set_trajectoire_updated_at();

drop policy if exists trajectoire_projects_select_own on public.trajectoire_projects;
drop policy if exists trajectoire_projects_insert_own on public.trajectoire_projects;
drop policy if exists trajectoire_projects_update_own on public.trajectoire_projects;
drop policy if exists trajectoire_projects_delete_own on public.trajectoire_projects;

create policy trajectoire_projects_select_own
on public.trajectoire_projects
for select
to authenticated
using (user_id = auth.uid());

create policy trajectoire_projects_insert_own
on public.trajectoire_projects
for insert
to authenticated
with check (user_id = auth.uid());

create policy trajectoire_projects_update_own
on public.trajectoire_projects
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy trajectoire_projects_delete_own
on public.trajectoire_projects
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists trajectoire_objectives_select_own on public.trajectoire_objectives;
drop policy if exists trajectoire_objectives_insert_own on public.trajectoire_objectives;
drop policy if exists trajectoire_objectives_update_own on public.trajectoire_objectives;
drop policy if exists trajectoire_objectives_delete_own on public.trajectoire_objectives;

create policy trajectoire_objectives_select_own
on public.trajectoire_objectives
for select
to authenticated
using (user_id = auth.uid());

create policy trajectoire_objectives_insert_own
on public.trajectoire_objectives
for insert
to authenticated
with check (user_id = auth.uid());

create policy trajectoire_objectives_update_own
on public.trajectoire_objectives
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy trajectoire_objectives_delete_own
on public.trajectoire_objectives
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists trajectoire_actions_select_own on public.trajectoire_actions;
drop policy if exists trajectoire_actions_insert_own on public.trajectoire_actions;
drop policy if exists trajectoire_actions_update_own on public.trajectoire_actions;
drop policy if exists trajectoire_actions_delete_own on public.trajectoire_actions;

create policy trajectoire_actions_select_own
on public.trajectoire_actions
for select
to authenticated
using (user_id = auth.uid());

create policy trajectoire_actions_insert_own
on public.trajectoire_actions
for insert
to authenticated
with check (user_id = auth.uid());

create policy trajectoire_actions_update_own
on public.trajectoire_actions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy trajectoire_actions_delete_own
on public.trajectoire_actions
for delete
to authenticated
using (user_id = auth.uid());
