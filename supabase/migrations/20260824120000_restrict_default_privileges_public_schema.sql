-- Correctif de la CAUSE : retirer aux futures tables du schema public le
-- blanc-seing accorde a anon et authenticated par les privileges par defaut.
--
-- Sans ce correctif, 20260824110000 traite les cinq tables existantes et la
-- sixieme reproduira le probleme. ALTER DEFAULT PRIVILEGES n'affecte QUE les
-- objets crees APRES son execution : les deux migrations sont donc
-- complementaires, aucune ne remplace l'autre.
--
-- CHOIX : ne rien accorder par defaut, plutot que d'accorder
-- select/insert/update.
--
-- Accorder trois privileges par defaut serait moins dangereux que d'en
-- accorder huit, mais resterait faux pour toute table qui ne doit RIEN exposer
-- a authenticated — les journaux d'audit personal_data_erasure_log et
-- personal_item_erasure_log sont exactement dans ce cas, et une future table
-- du meme genre heriterait silencieusement d'un droit de lecture sur des
-- donnees d'audit. Toutes les migrations du depot accordent deja explicitement
-- ce dont elles ont besoin ; aucune ne depend du defaut. Le defaut peut donc
-- etre vide sans rien casser, et chaque table redevient responsable de son
-- propre ACL.
--
-- service_role et postgres ne sont PAS touches : la cle service-role doit
-- garder tous ses privileges, c'est elle qui porte les gestes de suppression
-- physique et l'ecriture des journaux d'audit.
--
-- EFFET DE BORD A CONNAITRE AVANT D'APPLIQUER. Une table creee depuis le
-- Table Editor du dashboard Supabase ne sera plus lisible par l'API tant qu'un
-- grant explicite n'aura pas ete pose. C'est le comportement voulu, mais il
-- surprend : la table apparaitra vide ou en erreur cote PostgREST.

begin;

-- Le defaut pose par `postgres`, le role qui execute les migrations.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

commit;

-- LE SECOND DEFAUT, pose par `supabase_admin`, N'EST PAS TRAITE ICI.
--
-- Le modifier exige d'etre supabase_admin ou superutilisateur ; le SQL Editor
-- s'execute en `postgres`, qui ne l'est pas. La commande echouerait avec
-- "permission denied to change default privileges".
--
-- Consequence : une table creee PAR supabase_admin — c'est-a-dire par
-- l'outillage interne de Supabase, pas par une migration du depot — heritera
-- encore du blanc-seing. Les tables du depot etant toutes creees par
-- `postgres`, le correctif ci-dessus couvre le chemin qui nous concerne.
--
-- La commande, si un acces superutilisateur devient disponible un jour :
--
--   alter default privileges for role supabase_admin in schema public
--     revoke all on tables from anon, authenticated;
--
-- A defaut, le garde-fou reste la discipline de migration : toute nouvelle
-- table revoque explicitement avant d'accorder. C'est ce que font deja les
-- seize autres tables du depot.
