-- EDIFICE ACADEMY, etape 2b-1 du chantier 8 : objectifs pedagogiques.
--
-- PERIMETRE. Une table, academy_objectives (DEC-014, table des entites :
-- "Objectifs pedagogiques -> academy_objectives, rattaches a un niveau de la
-- hierarchie"). Choix valides le 2026-11-26 :
--   - niveaux rattachables : programme, matiere, module, chapitre ; PAS la lecon ;
--   - pas de statut "atteint" : la progression se calculera a l'etape 6 ;
--   - pas de Storage.
-- Hors perimetre : ressources pedagogiques (etape 2b-2), fichiers (2b-3).
--
-- ENTITE PEDAGOGIQUE, PAS UN OBJECTIF PERSONNEL. Aucun lien avec
-- personal_goals ni avec trajectoire_objectives (DEC-014, "source de verite
-- unique").
--
-- UN PARENT, ET UN SEUL. Une colonne nullable par niveau rattachable
-- (program_id, subject_id, unit_id, chapter_id), chacune referencee par une cle
-- etrangere COMPOSITE (parent_id, user_id) -> parent (id, user_id), sur le
-- patron de la migration 20261124120000. Une colonne generique "node_id" ne
-- pourrait porter aucune vraie cle etrangere : les cles composites, exigees par
-- DEC-014, l'excluent. La contrainte academy_objectives_one_parent impose
-- exactement une colonne de parent non nulle. Une cle composite dont la colonne
-- de parent est nulle n'est pas controlee (MATCH SIMPLE) : seule la colonne
-- renseignee l'est. Le controle d'une cle etrangere s'execute hors RLS ; c'est
-- la presence de user_id DANS la cle qui garantit qu'un objectif ne peut pas
-- pointer vers le niveau d'un autre utilisateur, la policy d'insertion imposant
-- deja user_id = auth.uid().
--
-- ON DELETE CASCADE, en filet de securite seulement, comme pour la hierarchie :
-- aucun role client n'a DELETE ; la suppression physique passera par la cle
-- service-role (etape 8).
--
-- ARCHIVAGE. deleted_at, suppression logique. Archiver le niveau parent
-- n'archive pas ses objectifs : c'est la LECTURE qui doit les masquer, comme
-- pour les enfants de la hierarchie.
--
-- DROITS. Patron de 20261124120000 : RLS activee, revocation explicite de anon
-- ET authenticated AVANT tout grant, puis select, insert, update a
-- authenticated. AUCUN DELETE, ni en privilege ni en policy. Trois policies,
-- toutes sur user_id = auth.uid().
--
-- Idempotente : create table/index if not exists, create or replace function,
-- drop trigger/policy if exists. Une table deja presente n'est pas modifiee.

begin;

-- ---------------------------------------------------------------------------
-- academy_objectives
-- ---------------------------------------------------------------------------

create table if not exists public.academy_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid null,
  subject_id uuid null,
  unit_id uuid null,
  chapter_id uuid null,
  title text not null,
  description text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_objectives_id_user_id_key unique (id, user_id),
  constraint academy_objectives_one_parent
    check (num_nonnulls(program_id, subject_id, unit_id, chapter_id) = 1),
  constraint academy_objectives_program_fk
    foreign key (program_id, user_id)
    references public.academy_programs (id, user_id)
    on delete cascade,
  constraint academy_objectives_subject_fk
    foreign key (subject_id, user_id)
    references public.academy_subjects (id, user_id)
    on delete cascade,
  constraint academy_objectives_unit_fk
    foreign key (unit_id, user_id)
    references public.academy_units (id, user_id)
    on delete cascade,
  constraint academy_objectives_chapter_fk
    foreign key (chapter_id, user_id)
    references public.academy_chapters (id, user_id)
    on delete cascade,
  constraint academy_objectives_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_objectives_title_max_length
    check (length(title) <= 200),
  constraint academy_objectives_description_not_blank
    check (description is null or length(btrim(description)) > 0),
  constraint academy_objectives_description_max_length
    check (description is null or length(description) <= 2000),
  constraint academy_objectives_position_not_negative
    check (position >= 0)
);

-- ---------------------------------------------------------------------------
-- Index : objectifs actifs d'un niveau, archives exclus
-- ---------------------------------------------------------------------------

create index if not exists academy_objectives_program_id_position_idx
on public.academy_objectives (program_id, position)
where deleted_at is null and program_id is not null;

create index if not exists academy_objectives_subject_id_position_idx
on public.academy_objectives (subject_id, position)
where deleted_at is null and subject_id is not null;

create index if not exists academy_objectives_unit_id_position_idx
on public.academy_objectives (unit_id, position)
where deleted_at is null and unit_id is not null;

create index if not exists academy_objectives_chapter_id_position_idx
on public.academy_objectives (chapter_id, position)
where deleted_at is null and chapter_id is not null;

-- ---------------------------------------------------------------------------
-- RLS et droits : revocation explicite AVANT tout grant ; aucun DELETE
-- ---------------------------------------------------------------------------

alter table public.academy_objectives enable row level security;

revoke all on table public.academy_objectives from anon, authenticated;

grant select, insert, update on table public.academy_objectives to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_academy_objectives_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_objectives_set_updated_at on public.academy_objectives;
create trigger academy_objectives_set_updated_at
before update on public.academy_objectives
for each row
execute function public.set_academy_objectives_updated_at();

-- ---------------------------------------------------------------------------
-- Policies : trois, toutes scopees au proprietaire
-- ---------------------------------------------------------------------------

drop policy if exists academy_objectives_select_own on public.academy_objectives;
drop policy if exists academy_objectives_insert_own on public.academy_objectives;
drop policy if exists academy_objectives_update_own on public.academy_objectives;

create policy academy_objectives_select_own
on public.academy_objectives for select to authenticated
using (user_id = auth.uid());

create policy academy_objectives_insert_own
on public.academy_objectives for insert to authenticated
with check (user_id = auth.uid());

create policy academy_objectives_update_own
on public.academy_objectives for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
