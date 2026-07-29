-- Security audit 2026-07, suite du Lot 2 : content_assets_authenticated_delete
-- portait qual = true, sans restriction de proprietaire. N'importe quel
-- utilisateur authentifie pouvait supprimer n'importe quelle ligne de
-- content_assets. Le grant DELETE etait bien accorde a authenticated (verifie
-- en base le 2026-07-28), donc la faille etait reellement exploitable, pas
-- seulement latente.
--
-- Cette policy n'etait creee par AUCUNE migration du depot : 20260601133000 la
-- supprime en preambule sans la recreer, et 20260721090000 (qui a resserre
-- _select/_insert/_update) ne la mentionne pas. Elle existait donc uniquement
-- en base, creee hors du flux de migrations. C'est la raison d'etre de ce
-- fichier : remettre le depot en phase avec l'etat reel.
--
-- Forme volontairement en drop + create plutot qu'en ALTER POLICY : le
-- correctif applique a chaud en production etait un ALTER, mais sur une base
-- reconstruite depuis ces seules migrations la policy n'existe pas et un ALTER
-- echouerait. Le drop + create produit le meme etat final sur les deux.
--
-- La condition de proprietaire est identique, a l'expression pres, a celle de
-- content_assets_authenticated_update (20260721090000) : un asset appartient a
-- un utilisateur soit directement via content_assets.linked_draft_id, soit
-- indirectement via content_draft_asset_links.

drop policy if exists content_assets_authenticated_delete on public.content_assets;

create policy content_assets_authenticated_delete
on public.content_assets
for delete
to authenticated
using (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_assets.linked_draft_id
      and content_drafts.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.content_draft_asset_links
    join public.content_drafts
      on content_drafts.id = content_draft_asset_links.draft_id
    where content_draft_asset_links.asset_id = content_assets.id
      and content_drafts.user_id = auth.uid()
  )
);

-- Note deliberement non appliquee ici : aucun code de l'application ne supprime
-- de content_assets (aucun .delete() sur cette table dans lib/, app/ ou
-- scripts/). Le grant DELETE a authenticated ne sert donc aucun usage reel et
-- pourrait etre revoque, ce qui supprimerait la couche de privilege en plus de
-- la couche RLS. Revoquer un privilege en production est un changement de
-- comportement qui demande une decision humaine explicite : ce fichier ne
-- corrige que la policy.
