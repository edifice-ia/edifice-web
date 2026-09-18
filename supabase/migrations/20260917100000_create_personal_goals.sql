-- Module Objectifs du pole Personnel, cinquieme module a saisie manuelle.
--
-- Module AUTONOME, construit sur le patron de Taches : une seule table, une ligne
-- par objectif, aucune dependante. Il n'est relie ni a Trajectoire
-- (trajectoire_objectives), ni au "moteur Objectifs" de
-- 20-catalogue-services.md. Pas de generalisation anticipee : un service commun
-- attend un second cas reel, pas un premier cas anticipe — meme raisonnement que
-- DEC-013.
--
-- La PROGRESSION n'est PAS une colonne. Elle se calcule a la lecture, dans
-- lib/personal/goals.ts :
--
--   ratio = (current_value - start_value) / (target_value - start_value)
--
-- Une seule formule couvre les deux sens. Objectif qui monte (epargne de 0 a
-- 5000) : denominateur positif. Objectif qui descend (poids de 90 a 80) :
-- numerateur et denominateur negatifs, ratio positif. Le sens n'est pas stocke
-- non plus : il se deduit du signe de target_value - start_value, et une colonne
-- "direction" pourrait contredire les deux valeurs. Meme decision que pour la
-- charge de Taches et la serie d'Habitudes : aucune valeur derivee n'est
-- persistee, donc aucune ne peut se perimer en silence.
--
-- Aucun historique des valeurs : current_value est ecrasee a chaque mise a jour.
-- Une courbe d'evolution demanderait une table dependante, donc DEC-012 et
-- DEC-013 — hors perimetre de cette migration.

create table if not exists public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- L'intitule. Meme patron que personal_tasks.title.
  title text not null,

  -- Les trois valeurs. numeric et non double precision : exact, adapte a des
  -- montants en euros. Precision 15, echelle 3 : douze chiffres entiers au plus,
  -- ce qui borne la valeur absolue sous 1e12 — un depassement est refuse en
  -- 22003, jamais tronque. Quinze chiffres significatifs restent representables
  -- sans perte par un nombre JSON, qui est un double.
  --
  -- ATTENTION : au-dela de trois decimales, Postgres ARRONDIT sans erreur. Le
  -- parser applicatif doit donc refuser plus de trois decimales, faute de quoi
  -- une valeur saisie ne serait pas celle enregistree.
  --
  -- Valeurs negatives acceptees : un solde peut l'etre.

  -- Valeur de depart. NOT NULL DEFAULT 0, et non nullable : "absente" et "0"
  -- seraient deux representations du meme etat, qui divergeraient a la lecture
  -- — la regle deja appliquee a personal_tasks.context_label. Consequence
  -- connue : un objectif de poids cree sans depart part de 0 et se lit comme un
  -- objectif qui monte. L'interface met la valeur de depart en evidence.
  start_value numeric(15, 3) not null default 0,

  -- Valeur cible. Obligatoire, et differente du depart : voir la contrainte
  -- personal_goals_target_differs_from_start.
  target_value numeric(15, 3) not null,

  -- Valeur actuelle, mise a jour a la main. Sans defaut en base : une colonne ne
  -- peut pas prendre par defaut la valeur d'une autre. C'est l'application qui
  -- la fixe a start_value a la creation quand rien n'est saisi.
  current_value numeric(15, 3) not null,

  -- L'unite, texte libre : "EUR", "kg", "km", "livres". Sur le modele de
  -- personal_tasks.context_label : nul autorise, chaine vide refusee.
  unit_label text null,

  -- L'echeance. Un JOUR, pas un instant, comme personal_tasks.due_on ; bornes de
  -- journee calculees en Europe/Paris cote application. Le nul porte une
  -- information : "pas d'echeance".
  due_on date null,

  -- Le statut, deux valeurs. C'est une DECLARATION de l'utilisateur, jamais
  -- recalculee : "cible atteinte" se deduit des valeurs, "atteint" se declare.
  -- Les deux peuvent diverger — un objectif declare atteint sous sa cible — et
  -- l'ecran les montre sans les confondre. Passer automatiquement a 'achieved'
  -- reviendrait a stocker une valeur derivee.
  --
  -- Pas de 'abandoned' : renoncer a un objectif, c'est l'archiver — geste
  -- reversible, qui le retire de la liste active. Meme retenue que 'doing'
  -- ecarte de personal_tasks.
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Suppression logique, patron du pole. Voir 12-modele-de-donnees.md, regle
  -- "soft delete par defaut".
  deleted_at timestamptz null,

  constraint personal_goals_title_not_blank
    check (length(btrim(title)) > 0),
  constraint personal_goals_title_max_length
    check (length(title) <= 200),
  -- Une cible egale au depart n'a pas de progression definie : la formule
  -- diviserait par zero. Refuse ici, pour que la lecture n'ait jamais a traiter
  -- ce cas.
  constraint personal_goals_target_differs_from_start
    check (target_value <> start_value),
  constraint personal_goals_unit_label_not_blank
    check (unit_label is null or length(btrim(unit_label)) > 0),
  constraint personal_goals_unit_label_max_length
    check (unit_label is null or length(unit_label) <= 20),
  constraint personal_goals_status_known
    check (status in ('active', 'achieved'))
);

alter table public.personal_goals enable row level security;

-- REVOCATION EXPLICITE AVANT TOUT GRANT, y compris `from authenticated`.
--
-- Le projet porte un ALTER DEFAULT PRIVILEGES pose par supabase_admin, hors de
-- portee des migrations, qui accorde arwdDxtm a tous les roles sur toute
-- nouvelle table du schema public. Un grant etant additif, "revoke from anon"
-- puis "grant to authenticated" laisserait a authenticated DELETE, TRUNCATE,
-- REFERENCES, TRIGGER et MAINTAIN. C'est le defaut corrige le 2026-08-24 par
-- 20260824110000 sur les cinq tables d'alors : un commentaire enoncait la
-- garantie sans l'instruction qui la rendait vraie.
revoke all on table public.personal_goals from anon, authenticated;

-- Pas de "delete", ni en privilege ni en policy. Sous RLS l'absence de policy
-- vaut refus : il faudrait ajouter A LA FOIS le privilege et une policy pour
-- qu'une suppression physique devienne possible depuis le client de session.
--
-- La suppression physique de ce module passera par la cle service-role, comme
-- pour les quatre autres — "Vider l'historique" et suppression d'un objectif
-- archive, hors perimetre de cette migration.
grant select, insert, update on table public.personal_goals to authenticated;

-- Liste active, triee par creation.
create index if not exists personal_goals_user_id_created_at_idx
on public.personal_goals (user_id, created_at desc)
where deleted_at is null;

-- Tri et filtre par echeance. Partiel pour la meme raison : les objectifs
-- archives ne sont jamais listes ici.
create index if not exists personal_goals_user_id_due_on_idx
on public.personal_goals (user_id, due_on)
where deleted_at is null;

create or replace function public.set_personal_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_goals_set_updated_at on public.personal_goals;

create trigger personal_goals_set_updated_at
before update on public.personal_goals
for each row
execute function public.set_personal_goals_updated_at();

-- Trois policies, alignees sur les trois verbes accordes. RLS est ici le garde
-- REEL et non une defense en profondeur : le store utilisera le client de
-- session, pas la cle service-role.
drop policy if exists personal_goals_select_own on public.personal_goals;
drop policy if exists personal_goals_insert_own on public.personal_goals;
drop policy if exists personal_goals_update_own on public.personal_goals;

create policy personal_goals_select_own
on public.personal_goals
for select
to authenticated
using (user_id = auth.uid());

create policy personal_goals_insert_own
on public.personal_goals
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_goals_update_own
on public.personal_goals
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
