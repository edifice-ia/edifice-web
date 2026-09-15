-- Cles etrangeres COMPOSITES sur la table de liaison des categories de Journal.
--
-- FAILLE CORRIGEE : les deux cles etrangeres posees par 20260909110000 sont
-- simples — entry_id vers personal_journal_entries(id), category_id vers
-- personal_journal_categories(id). Or Postgres verifie une cle etrangere SANS
-- appliquer RLS : la documentation le dit explicitement, les controles
-- d'integrite referentielle contournent toujours la securite par ligne, pour
-- que l'integrite tienne. La policy insert de la liaison ne controle que
-- user_id = auth.uid() ; rien ne controle a qui appartiennent l'entree et la
-- categorie referencees.
--
-- Consequence concrete : un utilisateur connaissant l'UUID d'une categorie
-- d'un AUTRE compte pouvait y lier sa propre entree. Le `on delete restrict`
-- aurait alors bloque le proprietaire legitime au moment de supprimer SA
-- categorie — et son controle applicatif, qui passe par RLS, n'aurait pas vu
-- ce lien etranger : l'application aurait conclu "rien ne bloque", la base
-- aurait refuse, et le geste aurait fini en 500. Un blocage impose par un
-- tiers, sans moyen de le lever.
--
-- CORRECTIF, repris tel quel d'Habitudes : chaque cle etrangere porte aussi
-- user_id, et vise (id, user_id) chez le parent. Une liaison ne peut plus
-- referencer qu'une entree et une categorie appartenant au meme user_id
-- qu'elle-meme — et la policy insert impose deja que ce user_id soit
-- auth.uid(). Voir personal_habit_completions_habit_fk dans 20260806100000.
--
-- Effet de bord bienvenu : cela ferme aussi la "limite assumee" documentee
-- dans 20260909110000, selon laquelle rien en base ne garantissait que le
-- user_id de la liaison egale celui de l'entree et celui de la categorie. Les
-- cles composites le garantissent desormais, sans trigger.
--
-- CE QUI NE CHANGE PAS : les regles de suppression. restrict vers les
-- categories — la moitie structurelle de la regle de blocage — et cascade vers
-- les entrees. Ni grant, ni policy, ni RLS ne sont touches.
--
-- POURQUOI MAINTENANT : la table de liaison est vide, aucune interface ne cree
-- encore de liaison. Poser les cles ne revalide aucune donnee existante.
--
-- Pas d'`on update cascade`, comme pour Habitudes : ni id ni user_id ne sont
-- modifies par l'application. Le test de donnees du 2026-08-18 a montre ce
-- que cela coute — deplacer des lignes d'un compte a l'autre bute sur la cle
-- — et c'est precisement l'effet recherche ici.
--
-- Idempotent : les ajouts sont gardes par un test d'existence, les retraits
-- par `if exists`. Le rejouer ne casse rien.

begin;

-- 1. Cibles des cles composites. Redondantes avec les cles primaires, mais
--    Postgres exige une contrainte unique portant exactement les colonnes
--    referencees — meme raison que personal_habits_id_user_id_key.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_journal_entries_id_user_id_key'
      and conrelid = 'public.personal_journal_entries'::regclass
  ) then
    alter table public.personal_journal_entries
      add constraint personal_journal_entries_id_user_id_key unique (id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_journal_categories_id_user_id_key'
      and conrelid = 'public.personal_journal_categories'::regclass
  ) then
    alter table public.personal_journal_categories
      add constraint personal_journal_categories_id_user_id_key unique (id, user_id);
  end if;
end $$;

-- 2. Retrait des deux cles simples. Noms par defaut de Postgres pour une
--    reference declaree en ligne : <table>_<colonne>_fkey. L'entree
--    MANUAL_ACTIONS.md fait verifier ces noms AVANT application, et controle
--    APRES qu'aucune cle simple vers ces deux tables ne subsiste.
--
--    La cle simple user_id -> auth.users(id) on delete cascade est CONSERVEE.
alter table public.personal_journal_entry_categories
  drop constraint if exists personal_journal_entry_categories_entry_id_fkey;
alter table public.personal_journal_entry_categories
  drop constraint if exists personal_journal_entry_categories_category_id_fkey;

-- 3. Cles composites. Dans la meme transaction que le retrait : il n'existe
--    aucun instant ou la liaison serait sans cle etrangere.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_journal_entry_categories_entry_fk'
      and conrelid = 'public.personal_journal_entry_categories'::regclass
  ) then
    -- CASCADE, inchange : la suppression d'une entree emporte ses liens. Filet
    -- et non mecanisme — DEC-013 impose que le store d'effacement supprime
    -- ces lignes explicitement avant l'entree.
    alter table public.personal_journal_entry_categories
      add constraint personal_journal_entry_categories_entry_fk
      foreign key (entry_id, user_id)
      references public.personal_journal_entries (id, user_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_journal_entry_categories_category_fk'
      and conrelid = 'public.personal_journal_entry_categories'::regclass
  ) then
    -- RESTRICT, inchange : moitie structurelle de la regle "bloque si seule
    -- categorie restante". Elle ne peut plus etre declenchee que par les
    -- liaisons du proprietaire lui-meme.
    alter table public.personal_journal_entry_categories
      add constraint personal_journal_entry_categories_category_fk
      foreign key (category_id, user_id)
      references public.personal_journal_categories (id, user_id)
      on delete restrict;
  end if;
end $$;

commit;

-- Index : aucun a ajouter. La verification de la cle vers les categories, a la
-- suppression d'une categorie, cherche (category_id, user_id) dans la liaison ;
-- personal_journal_entry_categories_category_id_idx la sert. Celle vers les
-- entrees cherche (entry_id, user_id) ; la cle primaire (entry_id, category_id)
-- et personal_journal_entry_categories_user_id_entry_id_idx la servent.
