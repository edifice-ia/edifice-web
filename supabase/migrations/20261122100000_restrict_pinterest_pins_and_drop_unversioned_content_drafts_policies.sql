-- Securite : fermer la lecture ouverte de `pinterest_pins`, et supprimer les
-- quatre policies `{public}` de `content_drafts` qui n'existent qu'en base.
--
-- ORIGINE. Controles en lecture seule du 2026-11-22 (MANUAL_ACTIONS.md,
-- « Controles de cloture de l'audit de securite »), executes par le mainteneur
-- dans le SQL Editor, resultats consignes dans la meme entree.
--
-- 1. pinterest_pins — la policy `pinterest_pins_authenticated_select` est
--    `for select to authenticated using (true)`, et `authenticated` detient
--    SELECT. Les deux sont voulus et versionnes (20260605110000), mais ils
--    contredisent 13-securite-gouvernance.md : une policy plus large que le
--    proprietaire est une anomalie. La table n'a d'ailleurs pas de `user_id`.
--    Effet reel : tout compte connecte — le compte reviewer compris — peut lire
--    toutes les epingles, `raw_payload` compris, par l'API REST Supabase avec la
--    cle anonyme, qui est publique par construction.
--
--    POURQUOI RIEN N'EST RE-GRANTE. Les trois seuls fichiers qui lisent ou
--    ecrivent la table passent par la cle service-role, verifie le 2026-11-22 :
--    lib/server/pinterest-reviews.ts, lib/server/pinterest-publisher.ts,
--    lib/pinterestLocalIndexes.ts. Aucun composant, aucun client de session
--    (src/lib/supabase/server.ts : app/login/actions.ts et les stores de
--    lib/server/personal) ni client navigateur (src/lib/supabase/client.ts, sans
--    importateur) ne la cite. Meme patron que le chantier 7 (20260928100000) :
--    un privilege que l'application n'utilise jamais est de la surface.
--
--    RLS reste activee. Sans policy et sans privilege, aucun role client ne lit
--    plus rien ; service_role contourne RLS et n'est pas touche.
--
-- 2. content_drafts — quatre policies `to public` (« Users can create / read /
--    update / delete their own content drafts »), creees hors du flux de
--    migrations : aucun fichier du depot ne les cree (recherche du 2026-11-22).
--    Lues le 2026-11-22 : toutes restreintes au proprietaire
--    (`auth.uid() = user_id`), donc pas une fuite. Elles font doublon avec les
--    quatre policies versionnees `content_drafts_*_own` (20260601120000), qui
--    restent en place, et elles sont deja inatteignables : `anon` et
--    `authenticated` n'ont plus aucun privilege sur la table depuis
--    20260928100000. Les supprimer ne change donc aucun acces ; cela ramene la
--    base a ce que disent les migrations, ce qui est la raison de ce fichier.
--
-- drop policy if exists et revoke sont idempotents.

begin;

drop policy if exists pinterest_pins_authenticated_select on public.pinterest_pins;
revoke all on table public.pinterest_pins from anon, authenticated;

drop policy if exists "Users can create their own content drafts" on public.content_drafts;
drop policy if exists "Users can read their own content drafts" on public.content_drafts;
drop policy if exists "Users can update their own content drafts" on public.content_drafts;
drop policy if exists "Users can delete their own content drafts" on public.content_drafts;

commit;

-- RETOUR ARRIERE. NON APPLIQUE : a copier dans le SQL Editor seulement si un
-- chemin du code lisait pinterest_pins par un client de session, et apres
-- l'avoir identifie. Il restaure l'etat de 20260605110000 a l'identique, lecture
-- ouverte comprise.
--
--   begin;
--   grant select on table public.pinterest_pins to authenticated;
--   create policy pinterest_pins_authenticated_select
--   on public.pinterest_pins
--   for select
--   to authenticated
--   using (true);
--   commit;
--
-- Les quatre policies `{public}` de content_drafts ne sont pas a recreer : elles
-- n'ont jamais ete versionnees, et les policies `content_drafts_*_own` portent
-- le meme filtre.
