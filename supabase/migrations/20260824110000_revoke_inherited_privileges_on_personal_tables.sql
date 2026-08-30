-- Correctif : retirer a `authenticated` les privileges herites du defaut de
-- schema sur les cinq tables du pole Personnel.
--
-- CAUSE. Le projet Supabase porte deux ALTER DEFAULT PRIVILEGES, poses par
-- `postgres` et `supabase_admin`, qui accordent arwdDxtm — tous privileges,
-- DELETE et TRUNCATE compris — a tous les roles sur toute nouvelle table du
-- schema public. Les migrations du pole ont ecrit
--   revoke all ... from anon;
--   grant select, insert, update ... to authenticated;
-- sans jamais revoquer cote authenticated. Or un grant est ADDITIF : il ajoute
-- trois privileges a ceux deja detenus, il n'en retire aucun. Le grant etait
-- donc un no-op, et le commentaire qui l'accompagnait — "pas de delete dans ce
-- grant, deliberement" — decrivait l'intention, pas l'effet.
--
-- Toutes les autres tables du depot revoquent d'abord `from authenticated`.
-- Les cinq tables du pole sont les seules a ne l'avoir jamais fait.
--
-- CE QUI N'ETAIT PAS CASSE. Aucune suppression physique n'etait possible :
-- verifie le 2026-08-24 par test negatif avec un vrai JWT `authenticated`, un
-- DELETE sur une ligne appartenant a l'utilisateur renvoie 0 ligne supprimee
-- SANS erreur de privilege — signature exacte d'un privilege accorde et d'une
-- policy absente. La protection tenait donc, mais par UNE seule couche au lieu
-- des deux annoncees. C'est la configuration qui a rendu l'incident
-- content_assets du 2026-07-28 exploitable le jour ou cette couche unique est
-- tombee.
--
-- METHODE. `revoke all` puis re-grant de l'ensemble voulu, plutot qu'une
-- enumeration des privileges a retirer. Enumerer expose a en oublier un — le
-- privilege MAINTAIN, par exemple, n'existe que depuis PostgreSQL 17 et cette
-- base tourne en 17.6. `revoke all` est exhaustif par construction.
--
-- revoke est idempotent : revoquer un privilege non detenu est un no-op.

begin;

-- Les trois modules a saisie manuelle : select, insert, update. Pas de delete,
-- la suppression y est logique (deleted_at).
revoke all on table public.personal_notes from anon, authenticated;
grant select, insert, update on table public.personal_notes to authenticated;

revoke all on table public.personal_journal_entries from anon, authenticated;
grant select, insert, update on table public.personal_journal_entries to authenticated;

revoke all on table public.personal_habits from anon, authenticated;
grant select, insert, update on table public.personal_habits to authenticated;

revoke all on table public.personal_tasks from anon, authenticated;
grant select, insert, update on table public.personal_tasks to authenticated;

-- EXCEPTION, et elle n'est pas un oubli : personal_habit_completions CONSERVE
-- DELETE. Une realisation est un booleen sur un jour, pas du contenu —
-- decocher une case mal cochee doit retirer la ligne. Le privilege est
-- intentionnel depuis 20260806100000 et il est double d'une policy DELETE
-- scopee au proprietaire, personal_habit_completions_delete_own.
--
-- En revanche UPDATE lui est retire : cette table n'a jamais eu de grant
-- UPDATE, une realisation n'ayant aucun champ modifiable. On la cree ou on la
-- retire. UPDATE ne lui venait que du defaut de schema.
revoke all on table public.personal_habit_completions from anon, authenticated;
grant select, insert, delete on table public.personal_habit_completions to authenticated;

commit;
