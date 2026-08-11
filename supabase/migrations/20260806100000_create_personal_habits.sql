-- Module Habitudes du pole Personnel (saisie manuelle).
--
-- Troisieme module a saisie manuelle du pole, et le premier a deux tables :
-- une definition qu'on pose une fois (personal_habits) et un historique de
-- realisations au jour le jour (personal_habit_completions).
--
-- Les commentaires qui justifient le patron commun — client de session, RLS
-- comme garde reel, soft delete, user_id non nullable — sont dans la migration
-- personal_notes (20260804100000). Seuls les ecarts propres a ce module sont
-- commentes ici, et il y en a deux : le DELETE physique sur les realisations,
-- et la denormalisation de user_id.
--
-- Pas de rattachement Marque/Projet : DEC-010.
--
-- Hors perimetre : le graphique par habitude. La serie en cours et le taux de
-- constance se calculent en lecture depuis les realisations, sans colonne
-- persistee — differes, pas oublies.

create table if not exists public.personal_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- Deux modes seulement. Toute granularite supplementaire ("3x par mois")
  -- demanderait de revoir le calcul de serie, pas seulement d'ajouter une
  -- valeur ici.
  frequency_type text not null,
  -- Requis en hebdomadaire, interdit en quotidien : une habitude quotidienne
  -- n'a pas de cible, elle est attendue tous les jours. La contrainte croisee
  -- ci-dessous rend l'incoherence impossible plutot que de la laisser au code.
  frequency_target integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint personal_habits_name_not_blank
    check (length(btrim(name)) > 0),
  constraint personal_habits_name_max_length
    check (length(name) <= 120),
  constraint personal_habits_frequency_coherent
    check (
      (frequency_type = 'daily' and frequency_target is null)
      or (frequency_type = 'weekly' and frequency_target between 1 and 7)
    ),
  -- Cible du FK composite de personal_habit_completions. Redondante avec la
  -- cle primaire, mais Postgres exige une contrainte unique portant exactement
  -- les colonnes referencees.
  constraint personal_habits_id_user_id_key unique (id, user_id)
);

create table if not exists public.personal_habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  -- user_id est denormalise depuis personal_habits. Sans lui, chaque policy
  -- devrait joindre sur la table des habitudes par sous-requete : plus lent,
  -- et surtout plus facile a ecrire de travers.
  --
  -- Le risque de la denormalisation — une realisation dont le user_id ne
  -- correspond pas a celui de son habitude — est ferme par le FK composite
  -- ci-dessous plutot que par une convention de code : la base refuse la ligne
  -- incoherente.
  user_id uuid not null,
  -- Un jour, pas un instant. Les bornes de journee sont calculees en
  -- Europe/Paris cote application (todayInParis), jamais en UTC.
  completed_on date not null,
  created_at timestamptz not null default now(),
  constraint personal_habit_completions_habit_fk
    foreign key (habit_id, user_id)
    references public.personal_habits (id, user_id)
    on delete cascade,
  -- Un jour ne peut etre marque qu'une fois par habitude. C'est ce qui rend la
  -- presence d'une ligne equivalente a "fait ce jour-la", sans colonne d'etat.
  constraint personal_habit_completions_habit_day_key
    unique (habit_id, completed_on)
);

alter table public.personal_habits enable row level security;
alter table public.personal_habit_completions enable row level security;

revoke all on table public.personal_habits from anon;
revoke all on table public.personal_habit_completions from anon;

-- personal_habits suit le patron de Notes et Journal : pas de DELETE, la
-- suppression est logique. Archiver une habitude preserve son historique.
grant select, insert, update on table public.personal_habits to authenticated;

-- ECART ASSUME, et le premier du pole : personal_habit_completions accorde
-- DELETE a authenticated, avec une policy DELETE.
--
-- Raison : une realisation n'est pas du contenu personnel, c'est un booleen sur
-- un jour. Decocher une case mal cochee doit retirer la ligne, pas la marquer
-- supprimee. Un soft delete obligerait en plus a rendre partielle la contrainte
-- d'unicite (habit_id, completed_on) et a ressusciter la ligne au lieu
-- d'inserer — plus de code pour aucun benefice visible.
--
-- Le garde reste le meme que partout ailleurs : la policy DELETE est scopee au
-- proprietaire. C'est exactement ce qui manquait a content_assets le
-- 2026-07-28, ou une policy DELETE en using(true) coexistait avec le privilege.
-- Ici les deux existent, mais la policy filtre sur auth.uid().
--
-- Pas d'UPDATE en revanche : une realisation n'a aucun champ modifiable. On la
-- cree ou on la retire.
grant select, insert, delete on table public.personal_habit_completions to authenticated;

create index if not exists personal_habits_user_id_created_at_idx
on public.personal_habits (user_id, created_at desc)
where deleted_at is null;

-- Sert la lecture de la liste : toutes les realisations d'un utilisateur sur
-- une fenetre de dates, pour calculer serie et taux de constance en une
-- requete. La contrainte d'unicite fournit deja l'index par habitude.
create index if not exists personal_habit_completions_user_id_completed_on_idx
on public.personal_habit_completions (user_id, completed_on desc);

create or replace function public.set_personal_habits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_habits_set_updated_at on public.personal_habits;

create trigger personal_habits_set_updated_at
before update on public.personal_habits
for each row
execute function public.set_personal_habits_updated_at();

-- personal_habits : trois policies, identiques a Notes et Journal.
drop policy if exists personal_habits_select_own on public.personal_habits;
drop policy if exists personal_habits_insert_own on public.personal_habits;
drop policy if exists personal_habits_update_own on public.personal_habits;

create policy personal_habits_select_own
on public.personal_habits
for select
to authenticated
using (user_id = auth.uid());

create policy personal_habits_insert_own
on public.personal_habits
for insert
to authenticated
with check (user_id = auth.uid());

-- Couvre aussi l'archivage, qui est un UPDATE de deleted_at.
create policy personal_habits_update_own
on public.personal_habits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- personal_habit_completions : select, insert et delete, toutes scopees au
-- proprietaire. Aucune policy UPDATE, faute de champ modifiable.
drop policy if exists personal_habit_completions_select_own on public.personal_habit_completions;
drop policy if exists personal_habit_completions_insert_own on public.personal_habit_completions;
drop policy if exists personal_habit_completions_delete_own on public.personal_habit_completions;

create policy personal_habit_completions_select_own
on public.personal_habit_completions
for select
to authenticated
using (user_id = auth.uid());

create policy personal_habit_completions_insert_own
on public.personal_habit_completions
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_habit_completions_delete_own
on public.personal_habit_completions
for delete
to authenticated
using (user_id = auth.uid());
