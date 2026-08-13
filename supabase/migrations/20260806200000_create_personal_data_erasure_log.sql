-- Journal d'audit des suppressions definitives de donnees Personnel.
--
-- Ecrit par le geste "Vider l'historique" de Reglages > Personnel, seule
-- suppression physique du depot. Une entree par TABLE effectivement videe,
-- jamais une entree groupee : l'historique doit dire precisement quoi a ete
-- supprime et quand.
--
-- Un module etendu sur plusieurs tables produit donc plusieurs entrees, portant
-- le meme `module` et des `table_name` distincts — c'est le cas d'Habitudes,
-- dont les realisations sont bien plus nombreuses que les habitudes. Une entree
-- unique par module aurait tu le plus gros des deux volumes.
--
-- Ce journal ne stocke AUCUN contenu supprime, seulement des volumes.
-- Journaliser le contenu d'un effacement le contredirait.

create table if not exists public.personal_data_erasure_log (
  id uuid primary key default gen_random_uuid(),
  -- Pas de cle etrangere vers auth.users, deliberement : une suppression de
  -- compte cascaderait et effacerait la preuve que l'effacement a eu lieu. Un
  -- journal d'audit ne doit pas pouvoir etre efface par ce qu'il journalise.
  user_id uuid not null,
  module text not null,
  table_name text not null,
  deleted_count integer not null,
  requested_at timestamptz not null default now(),
  source text not null default 'settings_personal',
  constraint personal_data_erasure_log_deleted_count_positive
    check (deleted_count >= 0)
);

alter table public.personal_data_erasure_log enable row level security;

-- Patron de securite repris de project_memory_audit_log : les DEUX roles sont
-- revoques, et aucune policy n'est creee. La table n'est donc accessible que
-- par la cle service-role.
--
-- C'est la difference avec les tables du pole Personnel, ou RLS est le garde
-- reel parce que le navigateur y accede. Ici le navigateur ne doit jamais y
-- acceder du tout : un journal d'audit lisible ou modifiable depuis le client
-- ne prouve rien.
revoke all on table public.personal_data_erasure_log from anon;
revoke all on table public.personal_data_erasure_log from authenticated;

create index if not exists personal_data_erasure_log_user_id_requested_at_idx
on public.personal_data_erasure_log (user_id, requested_at desc);
