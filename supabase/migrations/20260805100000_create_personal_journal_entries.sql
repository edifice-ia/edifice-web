-- Module Journal et Humeur du pole Personnel (saisie manuelle).
--
-- Deuxieme module a saisie manuelle du pole, construit sur le patron de
-- personal_notes (20260804100000) : meme forme de RLS, meme soft delete, meme
-- absence de privilege DELETE. Les commentaires qui justifient ces choix ne
-- sont pas reecrits ici, ils sont dans la migration Notes ; seuls les ecarts
-- propres a ce module sont commentes.
--
-- Pas de rattachement Marque/Projet : DEC-010 s'applique a tout module de
-- domaine de vie construit avant que le concept n'existe en code.
--
-- Hors perimetre de cette migration : la tendance d'humeur sur une periode
-- decrite par 23-modules.md. Elle se calcule en lecture a partir de mood et
-- created_at, sans colonne ni table supplementaire — differee, pas oubliee.

create table if not exists public.personal_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  -- Humeur facultative : une entree peut n'etre que du texte. Le nullable
  -- porte donc une information — "non renseignee" — et ne doit pas etre
  -- confondu avec une valeur neutre au milieu de l'echelle.
  mood integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint personal_journal_entries_content_not_blank
    check (length(btrim(content)) > 0),
  -- 20000 la ou personal_notes plafonne a 10000. 23-modules.md oppose
  -- explicitement les deux modules par le poids de ce qu'ils portent : une
  -- note est "une information ponctuelle qui ne merite pas une entree de
  -- journal". Le plafond suit cette distinction plutot que de l'ignorer.
  constraint personal_journal_entries_content_max_length
    check (length(content) <= 20000),
  constraint personal_journal_entries_mood_range
    check (mood is null or (mood >= 1 and mood <= 5))
);

alter table public.personal_journal_entries enable row level security;

revoke all on table public.personal_journal_entries from anon;

-- Pas de "delete" : voir la migration personal_notes pour le raisonnement
-- complet. En resume, ni le privilege ni une policy DELETE n'existent, donc
-- les deux devraient etre ajoutes pour qu'une suppression physique devienne
-- possible par un utilisateur authentifie.
grant select, insert, update on table public.personal_journal_entries to authenticated;

-- Sert la requete de liste : entrees vivantes d'un utilisateur, les plus
-- recentes d'abord. Le meme index couvrira la future tendance d'humeur, qui
-- filtre par utilisateur et par plage de dates — aucun index supplementaire
-- n'est cree par anticipation.
create index if not exists personal_journal_entries_user_id_created_at_idx
on public.personal_journal_entries (user_id, created_at desc)
where deleted_at is null;

create or replace function public.set_personal_journal_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_journal_entries_set_updated_at on public.personal_journal_entries;

create trigger personal_journal_entries_set_updated_at
before update on public.personal_journal_entries
for each row
execute function public.set_personal_journal_entries_updated_at();

-- Policies strictement scopees au proprietaire, identiques a celles de
-- personal_notes : "user_id = auth.uid()", jamais de qual permissif. Le
-- "with check" est present sur insert et update pour qu'un utilisateur ne
-- puisse ni creer une entree au nom d'un autre, ni en reassigner une.
drop policy if exists personal_journal_entries_select_own on public.personal_journal_entries;
drop policy if exists personal_journal_entries_insert_own on public.personal_journal_entries;
drop policy if exists personal_journal_entries_update_own on public.personal_journal_entries;

create policy personal_journal_entries_select_own
on public.personal_journal_entries
for select
to authenticated
using (user_id = auth.uid());

create policy personal_journal_entries_insert_own
on public.personal_journal_entries
for insert
to authenticated
with check (user_id = auth.uid());

-- Couvre aussi le soft delete, qui est un UPDATE de deleted_at.
create policy personal_journal_entries_update_own
on public.personal_journal_entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
