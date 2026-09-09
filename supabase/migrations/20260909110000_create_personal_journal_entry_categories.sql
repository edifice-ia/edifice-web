-- Table de liaison entre une entree de Journal et ses categories.
--
-- Une entree peut porter plusieurs categories, une categorie couvre plusieurs
-- entrees. Cardinalite N-N, donc TABLE DE LIAISON EXPLICITE — jamais un tableau
-- de texte ni une colonne unique sur l'entree. C'est le principe pose par
-- 12-modele-de-donnees.md : toute relation plus complexe qu'un lien
-- parent-enfant passe par une table nommee, dont les lignes sont interrogeables
-- et contraignables.
--
-- Depend de 20260909100000. Appliquer les deux dans l'ordre.
--
-- CONSEQUENCE A CONNAITRE AVANT D'APPLIQUER, hors perimetre de cette migration
-- mais provoquee par elle : Journal devient le DEUXIEME module du pole a porter
-- une table dependante, apres Habitudes. C'est precisement le second cas reel
-- que DEC-013 attendait pour passer de `propose` a `actif`. Le store
-- d'effacement (lib/server/personal/data-erasure-store.ts) declare aujourd'hui
-- `journal: { dependents: [] }` — cette declaration devient fausse des que
-- cette table existe, et les deux gestes de suppression physique du pole
-- laisseraient des lignes de liaison orphelines. A traiter avant d'appliquer,
-- ou immediatement apres.

create table if not exists public.personal_journal_entry_categories (
  -- La suppression physique d'une entree emporte ses liens. Le cascade est un
  -- FILET, pas le mecanisme : conformement a DEC-013, le store d'effacement
  -- devra supprimer ces lignes EXPLICITEMENT avant l'entree, sans presumer que
  -- la cascade est appliquee en base. Les deux coexistent volontairement.
  entry_id uuid not null
    references public.personal_journal_entries(id) on delete cascade,

  -- RESTRICT, et non cascade : c'est la moitie structurelle de la regle
  -- "bloque si seule categorie restante".
  --
  -- Postgres refuse de supprimer une categorie encore liee a au moins une
  -- entree, quoi qu'ait decide l'application. C'est plus strict que la regle
  -- metier — qui autorise a delier silencieusement une entree portant d'autres
  -- categories — et c'est voulu : l'application delie d'abord, supprime
  -- ensuite. L'ordre inverse buterait sur cette contrainte.
  --
  -- Ce que le restrict apporte que la requete applicative ne peut pas apporter :
  -- le controle et la suppression ne sont pas atomiques. Entre les deux, une
  -- autre session peut creer une entree mono-categorie. Le restrict transforme
  -- cette course en erreur de base plutot qu'en entree sans categorie.
  category_id uuid not null
    references public.personal_journal_categories(id) on delete restrict,

  -- REDONDANT AVEC LES DEUX PARENTS, ET DELIBEREMENT.
  --
  -- Il permet aux policies RLS de cette table de filtrer SANS JOINTURE. Une
  -- policy qui doit joindre deux tables pour decider d'un droit d'acces est une
  -- policy qu'on ne relit pas correctement ; celle-ci se verifie a l'oeil nu.
  --
  -- Limite assumee : rien en base ne garantit que ce user_id egale celui de
  -- l'entree et celui de la categorie. Un trigger le pourrait ; il n'est pas
  -- pose, parce qu'il s'executerait a chaque insertion pour couvrir un cas que
  -- seule l'application peut produire. La coherence est donc tenue a
  -- l'insertion applicative, et ce commentaire est la trace de ce choix.
  user_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),

  -- L'unicite du lien est une propriete de la cle, pas une contrainte ajoutee :
  -- une entree ne peut pas porter deux fois la meme categorie.
  primary key (entry_id, category_id)
);

-- PAS de deleted_at : un lien n'a pas d'etat intermediaire. Il existe ou non.
-- Meme raison que l'absence de deleted_at sur personal_habit_completions.

-- Lecture des categories d'une entree, et filtre par utilisateur sans jointure.
create index if not exists personal_journal_entry_categories_user_id_entry_id_idx
on public.personal_journal_entry_categories (user_id, entry_id);

-- Sert la verification "combien d'entrees portent cette categorie", donc la
-- regle de blocage, et la suppression des liens d'une categorie.
create index if not exists personal_journal_entry_categories_category_id_idx
on public.personal_journal_entry_categories (category_id);

alter table public.personal_journal_entry_categories enable row level security;

-- Revocation explicite avant tout grant, meme raison que dans 20260909100000 :
-- le defaut du schema est propre depuis 20260824120000 et verifie dans
-- pg_default_acl, mais une migration pose l'etat, elle ne le presume pas.
revoke all on table public.personal_journal_entry_categories from anon, authenticated;

-- PAS d'UPDATE, deliberement. Un lien n'a aucun champ modifiable : on le cree
-- ou on le retire. Accorder UPDATE ici reproduirait l'erreur que
-- personal_habit_completions a trainee jusqu'au chantier 6 — un privilege que
-- rien n'utilise, et que personne ne remarque tant qu'il ne sert pas.
--
-- DELETE est necessaire : retirer une categorie d'une entree est un geste de
-- saisie courante, au meme titre que decocher une realisation.
grant select, insert, delete on table public.personal_journal_entry_categories to authenticated;

-- Trois policies, une par verbe accorde. Aucune sur update, qui n'est pas
-- accorde — les deux listes restent alignees.
drop policy if exists personal_journal_entry_categories_select_own
  on public.personal_journal_entry_categories;
drop policy if exists personal_journal_entry_categories_insert_own
  on public.personal_journal_entry_categories;
drop policy if exists personal_journal_entry_categories_delete_own
  on public.personal_journal_entry_categories;

create policy personal_journal_entry_categories_select_own
on public.personal_journal_entry_categories
for select
to authenticated
using (user_id = auth.uid());

create policy personal_journal_entry_categories_insert_own
on public.personal_journal_entry_categories
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_journal_entry_categories_delete_own
on public.personal_journal_entry_categories
for delete
to authenticated
using (user_id = auth.uid());
