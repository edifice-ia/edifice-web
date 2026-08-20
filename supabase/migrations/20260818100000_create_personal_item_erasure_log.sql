-- Journal d'audit des suppressions definitives d'un ELEMENT archive.
--
-- Ecrit par le bouton "Supprimer definitivement" de la carte Archives, sur
-- Notes, Journal et Humeur, et Habitudes. Une entree par element supprime.
--
-- Table distincte de personal_data_erasure_log, qui journalise le geste
-- "Vider l'historique" a l'echelle du module. Les deux n'ont pas la meme
-- granularite : l'autre compte des lignes par table (deleted_count), celle-ci
-- designe une ligne precise (item_id). Les fusionner obligerait deleted_count
-- et item_id a etre tous deux nullables, chacun dependant de la valeur de
-- l'autre — un schema qu'on relit de travers six mois plus tard.
--
-- Ce journal ne stocke AUCUN contenu supprime. Journaliser le contenu d'un
-- effacement le contredirait.

create table if not exists public.personal_item_erasure_log (
  id uuid primary key default gen_random_uuid(),
  -- Pas de cle etrangere vers auth.users, deliberement : une suppression de
  -- compte cascaderait et effacerait la preuve que l'effacement a eu lieu. Un
  -- journal d'audit ne doit pas pouvoir etre efface par ce qu'il journalise.
  -- Meme raison que dans 20260806200000.
  user_id uuid not null,
  module text not null,
  table_name text not null,
  -- Identifiant technique de la ligne supprimee. Ce n'est pas du contenu :
  -- l'uuid ne dit rien de ce que la note disait, ni du nom de l'habitude. Il
  -- permet de rapprocher une entree d'audit d'une trace externe si elle existe.
  --
  -- Pas de cle etrangere non plus, et pour une raison supplementaire ici : la
  -- ligne referencee n'existe justement plus au moment de l'ecriture.
  item_id uuid not null,
  -- Volume des lignes dependantes emportees avec l'element. Vaut 0 pour un
  -- module a table unique. Une seule entree est ecrite par element, y compris
  -- pour un module a plusieurs tables : ici l'unite auditee est l'element, pas
  -- la table, et cette colonne porte le volume dependant.
  --
  -- Asymetrie assumee avec personal_data_erasure_log, qui ecrit une entree PAR
  -- TABLE videe. Les deux journaux repondent a des questions differentes.
  related_deleted_count integer not null default 0,
  requested_at timestamptz not null default now(),
  source text not null default 'archives_panel',
  constraint personal_item_erasure_log_related_count_positive
    check (related_deleted_count >= 0)
);

alter table public.personal_item_erasure_log enable row level security;

-- Patron de securite repris de project_memory_audit_log et de
-- personal_data_erasure_log : les DEUX roles sont revoques, et aucune policy
-- n'est creee. La table n'est donc accessible que par la cle service-role.
--
-- C'est la difference avec les tables du pole Personnel, ou RLS est le garde
-- reel parce que le navigateur y accede. Ici le navigateur ne doit jamais y
-- acceder du tout : un journal d'audit lisible ou modifiable depuis le client
-- ne prouve rien.
revoke all on table public.personal_item_erasure_log from anon;
revoke all on table public.personal_item_erasure_log from authenticated;

create index if not exists personal_item_erasure_log_user_id_requested_at_idx
on public.personal_item_erasure_log (user_id, requested_at desc);
