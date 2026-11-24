-- EDIFICE ACADEMY, etape 2a du chantier 8 : hierarchie pedagogique.
--
-- PERIMETRE. Cinq tables, une par niveau (DEC-014, note du 2026-11-22) :
--   academy_programs  -> curriculum ou formation (instance de l'espace)
--   academy_subjects  -> matieres
--   academy_units     -> modules pedagogiques ("unit" : le mot "module" designe
--                        deja un domaine de vie dans l'architecture)
--   academy_chapters  -> chapitres
--   academy_lessons   -> cours et lecons, contenu Markdown facultatif
-- Hors perimetre, etape 2b : objectifs pedagogiques et ressources pedagogiques.
-- Hors perimetre de l'etape 2 : evaluations, notes, revisions, calendrier,
-- historique du Professeur IA.
--
-- KIND EST UNE SIMPLE ETIQUETTE. academy_programs.kind vaut 'curriculum' ou
-- 'formation', et AUCUNE regle de donnees ne depend de sa valeur : les deux
-- suivent la meme structure, programme -> matiere -> module -> chapitre ->
-- lecon. Une formation saute le niveau curriculum, pas le niveau matiere
-- (DEC-014, note du 2026-11-22). Le distinguo sert la presentation, pas le
-- schema.
--
-- LIENS DE PARENTE OBLIGATOIRES. Chaque niveau enfant porte la cle de son
-- parent en NOT NULL, et la reference par une cle etrangere COMPOSITE
-- (parent_id, user_id) -> parent (id, user_id), sur le patron d'Habitudes et des
-- categories de Journal. Consequence voulue : une ligne ne peut pas pointer vers
-- le parent d'un autre utilisateur. Le controle d'une cle etrangere s'execute
-- hors RLS ; c'est la presence de user_id DANS la cle qui garantit la
-- propriete, la policy d'insertion imposant deja user_id = auth.uid().
--
-- ON DELETE CASCADE, en filet de securite seulement. Aucun role client n'a
-- DELETE. La suppression physique passera par la cle service-role (etape 8),
-- qui supprimera EXPLICITEMENT les enfants avant leurs parents (DEC-013) :
-- la cascade rattrape le cas ou cet ordre manquerait, elle n'en est pas le
-- mecanisme.
--
-- user_id SUR CHAQUE TABLE, dependantes comprises (DEC-013) : c'est ce qui
-- permet a la suppression physique de filtrer par user_id sans jointure.
--
-- ARCHIVAGE D'UN PARENT. La suppression logique (deleted_at) d'un parent
-- n'archive PAS ses enfants : aucune cascade logique, aucun declencheur. C'est
-- la LECTURE qui doit masquer les enfants d'un parent archive, et la
-- restauration du parent les fait reapparaitre. Ce masquage releve du store de
-- l'etape 2 (lecture), pas de cette migration.
--
-- ORDRE. position integer not null default 0, >= 0, SANS contrainte
-- d'unicite : reordonner reste une simple mise a jour. Le tri de lecture est
-- position, puis created_at.
--
-- PAS DE STATUT, PAS DE DATES DE PROGRAMME : la progression sera calculee
-- (etape 6), la planification relevera du calendrier (etape 3).
--
-- DROITS. Patron de 20260917100000 (personal_goals) : RLS activee, revocation
-- explicite de anon ET authenticated AVANT tout grant (un grant est additif, et
-- le defaut de schema pose par supabase_admin accorde arwdDxtm a toute nouvelle
-- table), puis select, insert, update a authenticated. AUCUN DELETE, ni en
-- privilege ni en policy. Trois policies par table, toutes sur
-- user_id = auth.uid(). RLS est ici le garde REEL : les stores utiliseront le
-- client de session.
--
-- Idempotente : create table/index if not exists, create or replace function,
-- drop trigger/policy if exists. Une table deja presente n'est pas modifiee.

begin;

-- ---------------------------------------------------------------------------
-- academy_programs
-- ---------------------------------------------------------------------------

create table if not exists public.academy_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_programs_id_user_id_key unique (id, user_id),
  constraint academy_programs_kind_known
    check (kind in ('curriculum', 'formation')),
  constraint academy_programs_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_programs_title_max_length
    check (length(title) <= 200),
  constraint academy_programs_description_not_blank
    check (description is null or length(btrim(description)) > 0),
  constraint academy_programs_description_max_length
    check (description is null or length(description) <= 2000)
);

-- ---------------------------------------------------------------------------
-- academy_subjects
-- ---------------------------------------------------------------------------

create table if not exists public.academy_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null,
  title text not null,
  description text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_subjects_id_user_id_key unique (id, user_id),
  constraint academy_subjects_program_fk
    foreign key (program_id, user_id)
    references public.academy_programs (id, user_id)
    on delete cascade,
  constraint academy_subjects_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_subjects_title_max_length
    check (length(title) <= 200),
  constraint academy_subjects_description_not_blank
    check (description is null or length(btrim(description)) > 0),
  constraint academy_subjects_description_max_length
    check (description is null or length(description) <= 2000),
  constraint academy_subjects_position_not_negative
    check (position >= 0)
);

-- ---------------------------------------------------------------------------
-- academy_units (modules pedagogiques)
-- ---------------------------------------------------------------------------

create table if not exists public.academy_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  title text not null,
  description text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_units_id_user_id_key unique (id, user_id),
  constraint academy_units_subject_fk
    foreign key (subject_id, user_id)
    references public.academy_subjects (id, user_id)
    on delete cascade,
  constraint academy_units_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_units_title_max_length
    check (length(title) <= 200),
  constraint academy_units_description_not_blank
    check (description is null or length(btrim(description)) > 0),
  constraint academy_units_description_max_length
    check (description is null or length(description) <= 2000),
  constraint academy_units_position_not_negative
    check (position >= 0)
);

-- ---------------------------------------------------------------------------
-- academy_chapters
-- ---------------------------------------------------------------------------

create table if not exists public.academy_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null,
  title text not null,
  description text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_chapters_id_user_id_key unique (id, user_id),
  constraint academy_chapters_unit_fk
    foreign key (unit_id, user_id)
    references public.academy_units (id, user_id)
    on delete cascade,
  constraint academy_chapters_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_chapters_title_max_length
    check (length(title) <= 200),
  constraint academy_chapters_description_not_blank
    check (description is null or length(btrim(description)) > 0),
  constraint academy_chapters_description_max_length
    check (description is null or length(description) <= 2000),
  constraint academy_chapters_position_not_negative
    check (position >= 0)
);

-- ---------------------------------------------------------------------------
-- academy_lessons
-- ---------------------------------------------------------------------------

create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null,
  title text not null,
  -- Contenu de la lecon, en Markdown. Facultatif : une lecon peut etre creee
  -- avant d'etre redigee.
  content text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_lessons_id_user_id_key unique (id, user_id),
  constraint academy_lessons_chapter_fk
    foreign key (chapter_id, user_id)
    references public.academy_chapters (id, user_id)
    on delete cascade,
  constraint academy_lessons_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_lessons_title_max_length
    check (length(title) <= 200),
  constraint academy_lessons_content_not_blank
    check (content is null or length(btrim(content)) > 0),
  constraint academy_lessons_content_max_length
    check (content is null or length(content) <= 100000),
  constraint academy_lessons_position_not_negative
    check (position >= 0)
);

-- ---------------------------------------------------------------------------
-- Index : listes actives, archives exclues
-- ---------------------------------------------------------------------------

create index if not exists academy_programs_user_id_created_at_idx
on public.academy_programs (user_id, created_at desc)
where deleted_at is null;

create index if not exists academy_subjects_program_id_position_idx
on public.academy_subjects (program_id, position)
where deleted_at is null;

create index if not exists academy_units_subject_id_position_idx
on public.academy_units (subject_id, position)
where deleted_at is null;

create index if not exists academy_chapters_unit_id_position_idx
on public.academy_chapters (unit_id, position)
where deleted_at is null;

create index if not exists academy_lessons_chapter_id_position_idx
on public.academy_lessons (chapter_id, position)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- RLS et droits : revocation explicite AVANT tout grant ; aucun DELETE
-- ---------------------------------------------------------------------------

alter table public.academy_programs enable row level security;
alter table public.academy_subjects enable row level security;
alter table public.academy_units enable row level security;
alter table public.academy_chapters enable row level security;
alter table public.academy_lessons enable row level security;

revoke all on table public.academy_programs from anon, authenticated;
revoke all on table public.academy_subjects from anon, authenticated;
revoke all on table public.academy_units from anon, authenticated;
revoke all on table public.academy_chapters from anon, authenticated;
revoke all on table public.academy_lessons from anon, authenticated;

grant select, insert, update on table public.academy_programs to authenticated;
grant select, insert, update on table public.academy_subjects to authenticated;
grant select, insert, update on table public.academy_units to authenticated;
grant select, insert, update on table public.academy_chapters to authenticated;
grant select, insert, update on table public.academy_lessons to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at : une fonction et un declencheur par table
-- ---------------------------------------------------------------------------

create or replace function public.set_academy_programs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_programs_set_updated_at on public.academy_programs;
create trigger academy_programs_set_updated_at
before update on public.academy_programs
for each row
execute function public.set_academy_programs_updated_at();

create or replace function public.set_academy_subjects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_subjects_set_updated_at on public.academy_subjects;
create trigger academy_subjects_set_updated_at
before update on public.academy_subjects
for each row
execute function public.set_academy_subjects_updated_at();

create or replace function public.set_academy_units_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_units_set_updated_at on public.academy_units;
create trigger academy_units_set_updated_at
before update on public.academy_units
for each row
execute function public.set_academy_units_updated_at();

create or replace function public.set_academy_chapters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_chapters_set_updated_at on public.academy_chapters;
create trigger academy_chapters_set_updated_at
before update on public.academy_chapters
for each row
execute function public.set_academy_chapters_updated_at();

create or replace function public.set_academy_lessons_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_lessons_set_updated_at on public.academy_lessons;
create trigger academy_lessons_set_updated_at
before update on public.academy_lessons
for each row
execute function public.set_academy_lessons_updated_at();

-- ---------------------------------------------------------------------------
-- Policies : trois par table, toutes scopees au proprietaire
-- ---------------------------------------------------------------------------

drop policy if exists academy_programs_select_own on public.academy_programs;
drop policy if exists academy_programs_insert_own on public.academy_programs;
drop policy if exists academy_programs_update_own on public.academy_programs;

create policy academy_programs_select_own
on public.academy_programs for select to authenticated
using (user_id = auth.uid());

create policy academy_programs_insert_own
on public.academy_programs for insert to authenticated
with check (user_id = auth.uid());

create policy academy_programs_update_own
on public.academy_programs for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists academy_subjects_select_own on public.academy_subjects;
drop policy if exists academy_subjects_insert_own on public.academy_subjects;
drop policy if exists academy_subjects_update_own on public.academy_subjects;

create policy academy_subjects_select_own
on public.academy_subjects for select to authenticated
using (user_id = auth.uid());

create policy academy_subjects_insert_own
on public.academy_subjects for insert to authenticated
with check (user_id = auth.uid());

create policy academy_subjects_update_own
on public.academy_subjects for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists academy_units_select_own on public.academy_units;
drop policy if exists academy_units_insert_own on public.academy_units;
drop policy if exists academy_units_update_own on public.academy_units;

create policy academy_units_select_own
on public.academy_units for select to authenticated
using (user_id = auth.uid());

create policy academy_units_insert_own
on public.academy_units for insert to authenticated
with check (user_id = auth.uid());

create policy academy_units_update_own
on public.academy_units for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists academy_chapters_select_own on public.academy_chapters;
drop policy if exists academy_chapters_insert_own on public.academy_chapters;
drop policy if exists academy_chapters_update_own on public.academy_chapters;

create policy academy_chapters_select_own
on public.academy_chapters for select to authenticated
using (user_id = auth.uid());

create policy academy_chapters_insert_own
on public.academy_chapters for insert to authenticated
with check (user_id = auth.uid());

create policy academy_chapters_update_own
on public.academy_chapters for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists academy_lessons_select_own on public.academy_lessons;
drop policy if exists academy_lessons_insert_own on public.academy_lessons;
drop policy if exists academy_lessons_update_own on public.academy_lessons;

create policy academy_lessons_select_own
on public.academy_lessons for select to authenticated
using (user_id = auth.uid());

create policy academy_lessons_insert_own
on public.academy_lessons for insert to authenticated
with check (user_id = auth.uid());

create policy academy_lessons_update_own
on public.academy_lessons for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
