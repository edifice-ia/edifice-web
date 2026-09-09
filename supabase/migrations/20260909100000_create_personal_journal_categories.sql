-- Categories de Journal, creees par l'utilisateur.
--
-- PERIMETRE : Journal uniquement. Ni Notes, ni Taches, ni service commun
-- generalise. C'est l'application de DEC-013 a la conception : pas de
-- generalisation avant un second cas reel. Le jour ou Notes voudra des
-- categories, ce sera une seconde paire de tables, et c'est seulement a ce
-- moment-la qu'une abstraction commune pourra etre pesee sur deux cas
-- observes plutot que sur un cas et une hypothese.
--
-- Une categorie ne porte AUCUN contenu : c'est une etiquette. Cette phrase
-- justifie a elle seule les deux ecarts au patron du pole documentes plus bas,
-- l'absence de deleted_at et la presence du privilege DELETE.
--
-- La table de liaison vit dans la migration suivante, 20260909110000. Les deux
-- sont indissociables : appliquer celle-ci seule cree des categories que rien
-- ne peut rattacher a une entree.

create table if not exists public.personal_journal_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Le nom affiche. Non vide apres trim et borne, pour qu'une valeur absurde
  -- soit refusee par la base et pas seulement par le formulaire.
  name text not null,

  -- Description courte, facultative. Le nul signifie "non renseignee", jamais
  -- "vide" — meme raisonnement que mood sur personal_journal_entries et que
  -- context_label sur personal_tasks. La chaine vide est refusee par contrainte
  -- pour qu'il n'existe qu'une seule ecriture de cet etat.
  description text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- PAS de deleted_at, et c'est un ECART DELIBERE au patron du pole.
  --
  -- Le soft delete existe ailleurs parce que l'archivage y est un geste qui a
  -- du sens sur du CONTENU : une note archivee reste lisible, restaurable.
  -- Une etiquette n'a rien a relire. "Restaurer une categorie archivee" ne
  -- repond a aucun besoin exprime, et un deleted_at ici couterait trois
  -- choses :
  --   1. toute lecture devrait filtrer, y compris a travers la table de
  --      liaison — un oubli ferait reapparaitre une categorie supprimee ;
  --   2. l'index unique ci-dessous deviendrait faux : recreer "Sport" apres
  --      l'avoir supprimee violerait l'unicite, ou obligerait a un index
  --      partiel, de la complexite pour un besoin inexistant ;
  --   3. la regle de blocage (voir 20260909110000) devrait traiter les liens
  --      vers des categories logiquement supprimees.
  --
  -- Le garde-fou contre la perte n'est PAS une corbeille : c'est la regle de
  -- blocage elle-meme. Une categorie ne peut pas disparaitre en laissant une
  -- entree sans categorie. La protection est la, pas dans un deleted_at.
  --
  -- Consequence assumee : supprimer une categorie est irreversible, et il faut
  -- la recreer a la main. L'interface doit le dire.

  constraint personal_journal_categories_name_not_blank
    check (length(btrim(name)) > 0),
  constraint personal_journal_categories_name_max_length
    check (length(name) <= 60),
  -- Autorise le nul, mais refuse la chaine vide : "pas de description" s'ecrit
  -- null. Deux representations du meme etat divergeraient a la lecture.
  constraint personal_journal_categories_description_not_blank
    check (description is null or length(btrim(description)) > 0),
  constraint personal_journal_categories_description_max_length
    check (description is null or length(description) <= 200)
);

-- Unicite INSENSIBLE A LA CASSE et insensible aux blancs de bord, par
-- utilisateur. "Sport" et "sport" pour le meme compte sont une faute de saisie,
-- pas deux categories.
--
-- Index unique et non contrainte unique : une contrainte ne peut pas porter
-- sur une expression. C'est aussi cet index que vise le `on conflict do
-- nothing` de l'amorcage ponctuel decrit dans MANUAL_ACTIONS.md.
create unique index if not exists personal_journal_categories_user_id_name_key
on public.personal_journal_categories (user_id, lower(btrim(name)));

-- Liste de l'ecran de gestion, triee par nom.
create index if not exists personal_journal_categories_user_id_name_idx
on public.personal_journal_categories (user_id, name);

alter table public.personal_journal_categories enable row level security;

-- REVOCATION EXPLICITE AVANT TOUT GRANT, y compris `from authenticated`.
--
-- Le defaut du schema a ete restreint le 2026-08-30 par 20260824120000, et
-- verifie dans pg_default_acl avant l'ecriture de cette migration : la ligne
-- `postgres` / `r` ne concede plus rien a anon ni authenticated. Cette
-- revocation est donc, en principe, un no-op.
--
-- Elle reste ecrite quand meme. C'est exactement la lecon du chantier 6 : les
-- cinq migrations du pole revoquaient `from anon` seulement, faisaient
-- confiance a ce qu'elles croyaient etre le defaut, et ont laisse DELETE et
-- TRUNCATE a authenticated pendant vingt jours. Ce qui a manque n'etait pas le
-- defaut, c'etait la discipline. Une migration ne presume pas de l'etat du
-- serveur : elle le pose.
revoke all on table public.personal_journal_categories from anon, authenticated;

-- DELETE est accorde ici, et c'est la SECONDE EXCEPTION du pole apres
-- personal_habit_completions.
--
-- Partout ailleurs la suppression physique passe par la cle service-role, parce
-- qu'elle detruit du contenu et releve d'un geste encadre. Ici la suppression
-- est un geste de gestion courante sur une etiquette, doublee d'une policy
-- scopee au proprietaire et d'une regle de blocage applicative et structurelle
-- (voir 20260909110000). Il n'y a pas de contenu a proteger.
--
-- 05_Database.md doit etre corrige en consequence : sa phrase "Aucune n'accorde
-- le privilege DELETE a authenticated, sauf personal_habit_completions" ne
-- compte plus qu'une exception sur deux.
grant select, insert, update, delete on table public.personal_journal_categories to authenticated;

create or replace function public.set_personal_journal_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_journal_categories_set_updated_at
  on public.personal_journal_categories;

create trigger personal_journal_categories_set_updated_at
before update on public.personal_journal_categories
for each row
execute function public.set_personal_journal_categories_updated_at();

-- Quatre policies, une par verbe accorde. RLS est ici le garde REEL et non une
-- defense en profondeur : le store utilisera le client de session, pas la cle
-- service-role. Un verbe accorde sans policy serait refuse ; une policy sans
-- verbe accorde serait inerte. Les deux listes doivent rester alignees.
drop policy if exists personal_journal_categories_select_own
  on public.personal_journal_categories;
drop policy if exists personal_journal_categories_insert_own
  on public.personal_journal_categories;
drop policy if exists personal_journal_categories_update_own
  on public.personal_journal_categories;
drop policy if exists personal_journal_categories_delete_own
  on public.personal_journal_categories;

create policy personal_journal_categories_select_own
on public.personal_journal_categories
for select
to authenticated
using (user_id = auth.uid());

create policy personal_journal_categories_insert_own
on public.personal_journal_categories
for insert
to authenticated
with check (user_id = auth.uid());

-- Couvre le renommage et la modification de description, tous deux dans le
-- perimetre. Le `with check` interdit de reassigner une categorie a un autre
-- compte au passage.
create policy personal_journal_categories_update_own
on public.personal_journal_categories
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy personal_journal_categories_delete_own
on public.personal_journal_categories
for delete
to authenticated
using (user_id = auth.uid());
