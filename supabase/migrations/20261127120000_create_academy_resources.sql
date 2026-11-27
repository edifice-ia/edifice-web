-- EDIFICE ACADEMY, etape 2b-2 du chantier 8 : ressources pedagogiques.
--
-- PERIMETRE. Une table, academy_resources (DEC-014, table des entites :
-- "Ressources pedagogiques -> academy_resources, lien, fichier dans Supabase
-- Storage, ou texte"). Choix valides le 2026-11-27 :
--   - deux types seulement : lien (kind = 'link') et texte (kind = 'text') ;
--   - rattachement au programme ou a la lecon, pas aux niveaux intermediaires ;
--   - pas de Storage : les fichiers sont reportes a l'etape 2b-3, qui devra
--     elargir la contrainte academy_resources_kind_known ;
--   - pas de statut.
-- Hors perimetre : fichiers (2b-3).
--
-- ENTITE PEDAGOGIQUE, PAS UNE RESSOURCE DU COCKPIT. Aucun lien avec le module
-- Ressources du cockpit (projectResources, memoire projet) : DEC-014, "source de
-- verite unique".
--
-- UN PARENT, ET UN SEUL. Meme principe que academy_objectives (migration
-- 20261126120000), sur deux colonnes : program_id et lesson_id, nullables,
-- chacune referencee par une cle etrangere COMPOSITE (parent_id, user_id) ->
-- parent (id, user_id). La contrainte academy_resources_one_parent impose
-- exactement une colonne de parent non nulle (num_nonnulls = 1). Une cle
-- composite dont la colonne de parent est nulle n'est pas controlee (MATCH
-- SIMPLE). Le controle d'une cle etrangere s'execute hors RLS ; c'est la
-- presence de user_id DANS la cle qui garantit qu'une ressource ne peut pas
-- pointer vers le programme ou la lecon d'un autre utilisateur, la policy
-- d'insertion imposant deja user_id = auth.uid().
--
-- LIEN OU TEXTE, JAMAIS LES DEUX. academy_resources_kind_fields impose : un lien
-- a une url et pas de body ; un texte a un body et pas d'url.
--
-- URL. http ou https uniquement, sans espace, 2 048 caracteres au plus, et sans
-- identifiants avant l'hote (academy_resources_url_no_credentials). Ces
-- contraintes doublent le controle du parser : javascript:, data:, file: et
-- toute autre forme sont refusees par la base meme si un appelant contourne le
-- parser.
--
-- ON DELETE CASCADE, en filet de securite seulement, comme pour la hierarchie et
-- les objectifs : aucun role client n'a DELETE ; la suppression physique passera
-- par la cle service-role (etape 8).
--
-- ARCHIVAGE. deleted_at, suppression logique. Archiver le parent n'archive pas
-- ses ressources : c'est la LECTURE qui doit les masquer.
--
-- DROITS. Patron de 20261126120000 : RLS activee, revocation explicite de anon
-- ET authenticated AVANT tout grant, puis select, insert, update a
-- authenticated. AUCUN DELETE, ni en privilege ni en policy. Trois policies,
-- toutes sur user_id = auth.uid().
--
-- Idempotente : create table/index if not exists, create or replace function,
-- drop trigger/policy if exists. Une table deja presente n'est pas modifiee.

begin;

-- ---------------------------------------------------------------------------
-- academy_resources
-- ---------------------------------------------------------------------------

create table if not exists public.academy_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid null,
  lesson_id uuid null,
  kind text not null,
  title text not null,
  url text null,
  body text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint academy_resources_id_user_id_key unique (id, user_id),
  constraint academy_resources_one_parent
    check (num_nonnulls(program_id, lesson_id) = 1),
  constraint academy_resources_program_fk
    foreign key (program_id, user_id)
    references public.academy_programs (id, user_id)
    on delete cascade,
  constraint academy_resources_lesson_fk
    foreign key (lesson_id, user_id)
    references public.academy_lessons (id, user_id)
    on delete cascade,
  constraint academy_resources_kind_known
    check (kind in ('link', 'text')),
  constraint academy_resources_kind_fields
    check (
      (kind = 'link' and url is not null and body is null)
      or (kind = 'text' and body is not null and url is null)
    ),
  constraint academy_resources_title_not_blank
    check (length(btrim(title)) > 0),
  constraint academy_resources_title_max_length
    check (length(title) <= 200),
  constraint academy_resources_url_http
    check (url is null or url ~* '^https?://[^[:space:]]+$'),
  constraint academy_resources_url_max_length
    check (url is null or length(url) <= 2048),
  constraint academy_resources_url_no_credentials
    check (url is null or url !~* '^https?://[^/?#]*@'),
  constraint academy_resources_body_not_blank
    check (body is null or length(btrim(body)) > 0),
  constraint academy_resources_body_max_length
    check (body is null or length(body) <= 20000),
  constraint academy_resources_position_not_negative
    check (position >= 0)
);

-- ---------------------------------------------------------------------------
-- Index : ressources actives d'un parent, archives exclues
-- ---------------------------------------------------------------------------

create index if not exists academy_resources_program_id_position_idx
on public.academy_resources (program_id, position)
where deleted_at is null and program_id is not null;

create index if not exists academy_resources_lesson_id_position_idx
on public.academy_resources (lesson_id, position)
where deleted_at is null and lesson_id is not null;

-- ---------------------------------------------------------------------------
-- RLS et droits : revocation explicite AVANT tout grant ; aucun DELETE
-- ---------------------------------------------------------------------------

alter table public.academy_resources enable row level security;

revoke all on table public.academy_resources from anon, authenticated;

grant select, insert, update on table public.academy_resources to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_academy_resources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_resources_set_updated_at on public.academy_resources;
create trigger academy_resources_set_updated_at
before update on public.academy_resources
for each row
execute function public.set_academy_resources_updated_at();

-- ---------------------------------------------------------------------------
-- Policies : trois, toutes scopees au proprietaire
-- ---------------------------------------------------------------------------

drop policy if exists academy_resources_select_own on public.academy_resources;
drop policy if exists academy_resources_insert_own on public.academy_resources;
drop policy if exists academy_resources_update_own on public.academy_resources;

create policy academy_resources_select_own
on public.academy_resources for select to authenticated
using (user_id = auth.uid());

create policy academy_resources_insert_own
on public.academy_resources for insert to authenticated
with check (user_id = auth.uid());

create policy academy_resources_update_own
on public.academy_resources for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
