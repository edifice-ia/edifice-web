-- Module Notes du pole Personnel (saisie manuelle).
--
-- Premier module a saisie manuelle du pole. Pas de rattachement Marque/Projet
-- dans cette version : le concept de marque n'existe pas encore en code
-- (voir DEC-009), et construire la table de liaison maintenant serait du
-- scaffolding autour d'un concept absent.
--
-- Le rattachement contexte decrit par 12-modele-de-donnees.md se fera par une
-- table de liaison dediee le jour ou Marque et Projet existent, sans toucher
-- a cette table : c'est precisement ce que le modele en table de liaison
-- permet, et la raison de ne pas ajouter ici une colonne marque_id nullable
-- qui resterait vide indefiniment.

create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  -- NOT NULL et rattache a auth.users, contrairement a
  -- personal_calendar_events dont le user_id est nullable : ce dernier est
  -- alimente par une synchronisation service-role qui n'a pas toujours de
  -- contexte utilisateur. Une note est toujours ecrite par un humain
  -- authentifie, donc l'absence de proprietaire n'a aucun sens ici et
  -- "user_id = auth.uid()" reste sans ambiguite.
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete par defaut (12-modele-de-donnees.md). La suppression physique
  -- releve du geste RGPD distinct "Supprimer l'historique d'un module" et ne
  -- passe pas par cette route.
  deleted_at timestamptz null,
  constraint personal_notes_content_not_blank
    check (length(btrim(content)) > 0),
  constraint personal_notes_content_max_length
    check (length(content) <= 10000)
);

alter table public.personal_notes enable row level security;

revoke all on table public.personal_notes from anon;

-- Pas de "delete" dans ce grant, deliberement. L'application ne supprime
-- jamais physiquement une note : DELETE /api/personal/notes/[id] ecrit
-- deleted_at. Aucune policy DELETE n'est creee non plus. Sous RLS, l'absence
-- de policy vaut refus : il faudrait donc ajouter a la fois le privilege et
-- une policy pour qu'une suppression physique devienne possible par un
-- utilisateur authentifie. C'est la lecon de l'audit content_assets du
-- 2026-07-28, ou le grant DELETE et une policy "using (true)" avaient tous
-- deux ete ajoutes hors du flux de migrations, et ou la faille n'etait
-- exploitable que parce que les deux couches etaient tombees ensemble.
-- Le geste RGPD, lui, passera par la cle service-role, que ni ce grant ni
-- ces policies ne contraignent.
grant select, insert, update on table public.personal_notes to authenticated;

-- Sert exactement la requete de liste : notes vivantes d'un utilisateur, les
-- plus recentes d'abord. L'index partiel ignore les notes supprimees, qui ne
-- sont jamais listees.
create index if not exists personal_notes_user_id_created_at_idx
on public.personal_notes (user_id, created_at desc)
where deleted_at is null;

create or replace function public.set_personal_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_notes_set_updated_at on public.personal_notes;

create trigger personal_notes_set_updated_at
before update on public.personal_notes
for each row
execute function public.set_personal_notes_updated_at();

-- Policies strictement scopees au proprietaire, sur le patron deja audite de
-- personal_calendar_events : "user_id = auth.uid()", jamais de qual permissif.
-- Le "with check" est present sur insert et update pour qu'un utilisateur ne
-- puisse ni creer une note au nom d'un autre, ni en reassigner une.
drop policy if exists personal_notes_select_own on public.personal_notes;
drop policy if exists personal_notes_insert_own on public.personal_notes;
drop policy if exists personal_notes_update_own on public.personal_notes;

create policy personal_notes_select_own
on public.personal_notes
for select
to authenticated
using (user_id = auth.uid());

create policy personal_notes_insert_own
on public.personal_notes
for insert
to authenticated
with check (user_id = auth.uid());

-- Couvre aussi le soft delete, qui est un UPDATE de deleted_at.
create policy personal_notes_update_own
on public.personal_notes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
