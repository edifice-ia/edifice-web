-- Securite : retirer a `anon` et `authenticated` tout privilege sur neuf tables
-- qui ne sont accedees que par la cle service-role.
--
-- Tables : personal_calendar_events, personal_calendar_sync_state,
-- content_drafts, content_draft_asset_links, content_draft_media_plans,
-- content_draft_visual_scenes, trajectoire_projects, trajectoire_objectives,
-- trajectoire_actions.
--
-- ORIGINE. Meme mecanisme que le chantier 6 (20260824110000 et
-- 20260824120000). Le projet Supabase porte deux ALTER DEFAULT PRIVILEGES,
-- poses par `postgres` et par `supabase_admin`, qui accordent arwdDxtm a tous
-- les roles sur toute nouvelle table du schema public. Un defaut ne s'applique
-- qu'aux objets crees par le role qui l'a pose : les migrations du depot
-- tournent en `postgres`, c'est donc le defaut de `postgres` qui les concerne,
-- vide le 2026-08-30 pour les seules tables creees APRES cette date. Celui de
-- `supabase_admin`, hors de portee du SQL Editor, reste le residu que le
-- chantier 6 documente. Les fichiers de creation des neuf tables sont dates du
-- 2026-06-01 au 2026-07-26 ; la date d'application en base de chacun n'est pas
-- consignee. Une table appliquee avant le 2026-08-30 a herite du defaut ; une
-- table appliquee apres n'a herite que de ses grants explicites. Le meme
-- `revoke all` traite les deux cas.
--
-- Leurs migrations ecrivent
--   revoke all ... from anon;
--   grant select, insert, update, delete ... to authenticated;
-- sans jamais revoquer cote authenticated. Or un grant est ADDITIF : il ajoute
-- quatre privileges a ceux deja detenus, il n'en retire aucun. Pour une table
-- qui a herite du defaut, authenticated detient donc tout ce que le defaut lui
-- a accorde, TRUNCATE, REFERENCES, TRIGGER et MAINTAIN compris, et pas
-- seulement les quatre privileges que le fichier de creation annonce. L'etat
-- reel est celui que lisent les controles aclexplode de MANUAL_ACTIONS.md.
--
-- Le chantier 6 n'a traite que cinq tables du pole Personnel et a affirme
-- qu'elles etaient les seules du depot dans ce cas. C'etait faux des
-- l'ecriture : ces neuf tables, plus personal_daily_briefs et
-- personal_garmin_daily_stats, ne revoquaient pas non plus `from authenticated`.
-- Les deux dernieres ne sont PAS traitees ici : elles sont hors du perimetre
-- demande, et sont consignees dans suivi-chantiers-edifice.md (chantier 7).
--
-- POURQUOI RIEN N'EST RE-GRANTE ICI, contrairement au chantier 6. Le chantier 6
-- terminait par un `grant` parce que les stores des cinq tables utilisent le
-- client de session : RLS y est le garde reel, et authenticated a besoin des
-- privileges que les policies filtrent. Ces neuf tables ne sont accedees que
-- par des clients service-role. Verifie le 2026-09-28 par lecture du code :
--   - aucun fichier qui utilise le client de session (src/lib/supabase/server.ts
--     createClient : app/login/actions.ts et les six stores de lib/server/personal)
--     ni le client navigateur (src/lib/supabase/client.ts, sans importateur) ne
--     reference ces tables ;
--   - les noms de table dynamiques ont ete inclus dans la recherche :
--     deleteTrajectoireEntity (lib/server/trajectoire.ts) ne vise que les trois
--     tables trajectoire_*, sous client service-role ; data-erasure-store.ts ne
--     vise que des tables personal_* ; observatory/read-model.ts ne sonde que
--     short_video_publications ;
--   - lib/supabase.ts exporte un client a cle anonyme, mais aucun fichier ne
--     l'importe.
-- Un privilege que l'application n'utilise jamais n'est pas une commodite, c'est
-- de la surface. service_role et postgres ne sont PAS touches : la cle
-- service-role contourne RLS et garde ses propres privileges.
--
-- CE QUI NE CHANGE PAS. RLS reste activee, aucune policy n'est modifiee, aucun
-- trigger ni aucune contrainte non plus. Les policies `to authenticated`
-- deviennent inatteignables : faute de privilege, la requete est refusee avant
-- que RLS ne filtre quoi que ce soit. Elles restent en place comme seconde
-- couche.
--
-- EFFET A CONNAITRE. Cinq autres tables portent, dans leurs policies
-- `to authenticated`, une sous-requete `exists (select 1 from public.content_drafts ...)` :
-- content_assets (qui lit aussi content_draft_asset_links), video_render_jobs,
-- short_video_schedules, short_video_publications et
-- publication_performance_snapshots. Une sous-requete de policy est evaluee avec
-- les privileges de l'appelant : une requete `authenticated` sur ces cinq
-- tables echouera en "permission denied for table content_drafts" au lieu de
-- renvoyer des lignes filtrees. Aucun code du depot n'emet une telle requete
-- (tous leurs acces passent par la cle service-role), et l'echec est ferme et
-- non ouvert. Ce comportement n'a pas ete teste : il est deduit du
-- fonctionnement des policies, et signale ici pour que personne ne le decouvre
-- par surprise.
--
-- revoke est idempotent : revoquer un privilege non detenu est un no-op.

begin;

revoke all on table public.personal_calendar_events from anon, authenticated;
revoke all on table public.personal_calendar_sync_state from anon, authenticated;

revoke all on table public.content_drafts from anon, authenticated;
revoke all on table public.content_draft_asset_links from anon, authenticated;
revoke all on table public.content_draft_media_plans from anon, authenticated;
revoke all on table public.content_draft_visual_scenes from anon, authenticated;

revoke all on table public.trajectoire_projects from anon, authenticated;
revoke all on table public.trajectoire_objectives from anon, authenticated;
revoke all on table public.trajectoire_actions from anon, authenticated;

commit;

-- RETOUR ARRIERE. NON APPLIQUE : a copier dans le SQL Editor seulement si le
-- test de fumee de MANUAL_ACTIONS.md revele qu'un chemin du code utilisait
-- ces tables par le client de session, et apres l'avoir identifie.
--
--   begin;
--   grant select, insert, update, delete on table public.personal_calendar_events to authenticated;
--   grant select, insert, update, delete on table public.personal_calendar_sync_state to authenticated;
--   grant select, insert, update, delete on table public.content_drafts to authenticated;
--   grant select, insert, update, delete on table public.content_draft_asset_links to authenticated;
--   grant select, insert, update, delete on table public.content_draft_media_plans to authenticated;
--   grant select, insert, update, delete on table public.content_draft_visual_scenes to authenticated;
--   grant select, insert, update, delete on table public.trajectoire_projects to authenticated;
--   grant select, insert, update, delete on table public.trajectoire_objectives to authenticated;
--   grant select, insert, update, delete on table public.trajectoire_actions to authenticated;
--   commit;
--
-- Ce script restaure les quatre privileges que les migrations d'origine
-- annoncent. Il ne restaure PAS TRUNCATE, REFERENCES, TRIGGER ni MAINTAIN,
-- issus du seul defaut de schema : ne pas les remettre est voulu, et un retour
-- arriere ne doit pas rouvrir le defaut. Rien n'est re-accorde a `anon`, qui n'a
-- jamais rien detenu de ces tables par grant explicite.
