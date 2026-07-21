-- Security audit 2026-07, Lot 2 : content_assets avait des policies
-- select/insert/update en using(true)/with check(true), sans isolation
-- utilisateur, contrairement a toutes les autres tables du domaine content_*.
-- Un asset appartient a un utilisateur soit directement via
-- content_assets.linked_draft_id, soit indirectement via une ligne
-- content_draft_asset_links (reutilisation d'une image de bibliotheque par
-- un autre brouillon).

drop policy if exists content_assets_authenticated_select on public.content_assets;
drop policy if exists content_assets_authenticated_insert on public.content_assets;
drop policy if exists content_assets_authenticated_update on public.content_assets;

create policy content_assets_authenticated_select
on public.content_assets
for select
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

create policy content_assets_authenticated_insert
on public.content_assets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.content_drafts
    where content_drafts.id = content_assets.linked_draft_id
      and content_drafts.user_id = auth.uid()
  )
);

create policy content_assets_authenticated_update
on public.content_assets
for update
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
)
with check (
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
