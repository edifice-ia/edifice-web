# Changelog

Statut : journal initial  
Dernière mise à jour : 2026-07-28

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Format](#format)
- [2026-07-28 (révocation du grant DELETE content_assets)](#2026-07-28-révocation-du-grant-delete-content_assets)
- [2026-07-28 (RLS content_assets, policy DELETE)](#2026-07-28-rls-content_assets-policy-delete)
- [2026-07-28 (module Trajectoire)](#2026-07-28-module-trajectoire)
- [2026-07-28 (module Ressources et Bibliothèque)](#2026-07-28-module-ressources-et-bibliothèque)
- [2026-07-28 (audit sécurité)](#2026-07-28-audit-sécurité)
- [2026-07-28](#2026-07-28)
- [2026-07-22](#2026-07-22)
- [2026-07-11](#2026-07-11)
- [2026-07-08](#2026-07-08)
- [2026-07-07](#2026-07-07)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier trace les évolutions structurantes de la base de connaissances et du projet. Il ne remplace pas Git ; il donne une lecture humaine des changements importants.

## Format

Chaque entrée devrait préciser :

- date ;
- type : documentation, architecture, base de données, workflow, sécurité, produit ;
- résumé ;
- fichiers liés ;
- impact ;
- action de suivi si nécessaire.

## 2026-07-28 (révocation du grant DELETE content_assets)

Type : sécurité, base de données  
Résumé : retrait de la seconde couche de la faille `content_assets`. La policy RLS a été corrigée par `20260728210000`, mais c'est le grant `DELETE` accordé à `authenticated` qui rendait la policy `using(true)` réellement exploitable — une policy ne filtre que les lignes d'un privilège déjà détenu. Ce grant n'était pas prévu : la migration d'origine `20260601133000` fait `grant select, insert, update`, sans `delete`. Il a donc été ajouté hors du flux de migrations, comme la policy elle-même.  
Fichiers liés :

- `supabase/migrations/20260728220000_revoke_content_assets_delete_from_authenticated.sql`

Impact : les deux couches doivent désormais tomber pour que la faille réapparaisse. Si une future policy revenait à `using(true)` par accident, aucun utilisateur authentifié ne pourrait supprimer de ligne faute de privilège ; si le grant était réaccordé, la policy filtrerait sur le propriétaire.

Vérifié avant révocation, sur l'ensemble du dépôt : aucun code ne supprime de `content_assets`. Les six appels `.delete()` visent `content_drafts`, `content_draft_asset_links` (trois fois), les tables `trajectoire_*` et `oauth_tokens`. Les trois scripts qui touchent `content_assets` (`index-content-assets`, `enrich-visual-assets`, `reconcile-content-assets-storage`) ne font que lire, insérer et mettre à jour, et passent par la clé service-role — non affectée, `service_role` contournant RLS et disposant de ses propres privilèges.

Découpage volontaire en deux migrations plutôt qu'une : `20260728210000` était déjà commitée et son équivalent déjà appliqué en production. Y ajouter la révocation aurait fait que toute base l'ayant déjà exécutée ne la recevrait jamais.

## 2026-07-28 (RLS content_assets, policy DELETE)

Type : sécurité, base de données  
Résumé : la vérification en base des policies `content_assets` (dernier point ouvert du Lot 2) a révélé une quatrième policy que personne n'avait dans son périmètre : `content_assets_authenticated_delete`, avec `qual = true` littéral. N'importe quel utilisateur authentifié pouvait supprimer n'importe quelle ligne de la table, sans restriction de propriétaire. Le grant `DELETE` étant effectivement accordé à `authenticated`, la faille était exploitable en production, pas seulement latente. Corrigée en base par `ALTER POLICY` le 2026-07-28, puis versionnée.  
Fichiers liés :

- `supabase/migrations/20260728210000_scope_content_assets_delete_policy_to_owner.sql`
- `MANUAL_ACTIONS.md`

Impact : la policy `DELETE` porte la même condition de propriétaire que `UPDATE` (appartenance directe via `linked_draft_id` ou indirecte via `content_draft_asset_links`). La migration est écrite en `drop if exists` + `create` et non en `ALTER POLICY` : sur une base reconstruite depuis les seules migrations du dépôt, cette policy n'existe pas et un `ALTER` échouerait.

Constat structurant, distinct de la faille : **`supabase/migrations` ne reflète pas fidèlement l'état réel de la base.** Cette policy n'était créée par aucune migration — `20260601133000` la supprime en préambule sans jamais la recréer, `20260721090000` ne la mentionne pas. Elle existait uniquement en base, créée hors du flux de migrations. Un audit qui ne lit que les fichiers de migration ne peut donc pas conclure sur la sécurité réelle : il faut interroger `pg_policies` et `information_schema.role_table_grants`.

Action de suivi : la révocation du grant `DELETE`, évoquée ici comme décision humaine à prendre, a été décidée et versionnée le même jour — voir l'entrée [2026-07-28 (révocation du grant DELETE content_assets)](#2026-07-28-révocation-du-grant-delete-content_assets).

## 2026-07-28 (module Trajectoire)

Type : produit, documentation  
Résumé : cadrage du module Développement / Trajectoire. Un écart de sincérité corrigé sur la progression des projets : `calculatedProjectProgress` retombait sur `project.progress` quand le projet n'avait aucun objectif, si bien que la valeur saisie à la main s'affichait sous l'étiquette « Progression calculee », à côté d'une « Progression manuelle » portant le chiffre identique. La fonction renvoie désormais `null` dans ce cas, comme `calculatedObjectiveProgress` le faisait déjà — la carte objectif distinguait correctement calculée, manuelle et retenue, la carte projet non. Un `retainedProjectProgress` explicite porte le repli et alimente la barre de progression.  
Fichiers liés :

- `app/interface/trajectoire/TrajectoireClient.tsx`
- `/knowledge/06_Modules.md`

Impact : un projet sans objectif affiche « Calcule : non disponible » au lieu d'un pourcentage d'apparence dérivée. La métrique globale, renommée « Progression moyenne retenue », indique combien de projets ont une progression réellement calculée (`N/M calculees`) au lieu de moyenner silencieusement du calculé et du saisi. Aucun changement pour un projet dont tous les objectifs portent des actions : la valeur affichée est la même qu'avant.

Action de suivi : `retainedObjectiveProgress` reste implémenté deux fois, dans `lib/server/trajectoire.ts` et dans `TrajectoireClient.tsx`. Les deux versions sont identiques aujourd'hui et rien ne les tient synchronisées ; unifier demanderait de partager du code entre serveur et client, ce qui n'a pas été fait dans ce lot. Par ailleurs, la migration `20260711100000_add_effort_level_to_trajectoire_actions.sql` est lue par `lib/server/trajectoire.ts` (`select ... effort_level ...`) alors que son application en base n'est pas confirmée — voir `MANUAL_ACTIONS.md`.

## 2026-07-28 (module Ressources et Bibliothèque)

Type : produit, documentation  
Résumé : cadrage du module Bibliothèque demandé, qui a mené à deux constats distincts. D'abord, la Bibliothèque décrite en section 13 de la documentation stratégique (gestion documentaire centralisée, indexation par entité) n'existe nulle part dans le code et n'était pas documentée dans `/knowledge` : écart de couverture entre vision et implémentation, désormais consigné explicitement plutôt que laissé implicite. Aucune surface ne prétendant l'offrir, ce n'est pas une dette masquée. Ensuite, le module Ressources — le plus proche parent existant — portait un écart de sincérité : les 27 entrées de `projectResources` avaient `linkStatus: "accessible"` en dur, affiché en badge vert, alors qu'aucune sonde ne teste les URL et que le champ n'est lu nulle part ailleurs que dans le rendu. L'en-tête de la page affirmait par ailleurs que « le statut du lien est separe de l'etat projet », ce qui suggérait une vérification indépendante inexistante.  
Fichiers liés :

- `lib/resources/project-resources.ts`
- `components/cockpit/ProjectResourcesView.tsx`
- `/knowledge/06_Modules.md`

Impact : `linkStatus` vaut `"non testé"` partout, seule valeur exacte tant qu'aucune sonde n'existe, et l'invariant est écrit sur le type pour empêcher qu'on y remette une valeur affirmative sans sonde. L'en-tête annonce que les deux statuts sont déclaratifs. Les deux entrées GitHub pointaient vers `https://github.com/` alors qu'elles sont décrites comme le dépôt du projet : corrigées vers l'URL réelle du dépôt. `06_Modules.md` documente enfin les fichiers du module Ressources, jusque-là décrit en une ligne sans référence.

Action de suivi : deux points laissés en l'état faute d'arbitrage produit — six paires de ressources pointent vers la même URL sous deux noms et gonflent le compteur affiché par catégorie ; `projectStatus` reste un jugement éditorial qui vieillit sans marquage. Si Bibliothèque doit exister, elle doit d'abord entrer dans la [Roadmap](./02_Roadmap.md), où elle ne figure à aucun horizon.

## 2026-07-28 (audit sécurité)

Type : sécurité  
Résumé : fermeture des expositions restantes après les Lots 1 à 3 de l'audit de juillet. Six routes API étaient lisibles sans authentification : `/api/oauth/youtube/status` et `/api/oauth/calendar/status` (les plus graves — elles rafraîchissaient le token stocké, appelaient l'API tierce et renvoyaient l'identité de la chaîne YouTube ou de l'agenda principal, les scopes accordés et l'expiration du token), `/api/meta/status`, `/api/oauth/meta/status`, `/api/oauth/tiktok/status` et `/api/meta/instagram/accounts`. Toutes portent désormais un garde dans leur handler. Par ailleurs, l'OAuth Garmin échappait au durcissement du Lot 1 : `start` ne demandait aucune authentification et son état PKCE, bien que signé, n'était pas lié à un utilisateur — un visiteur anonyme pouvait démarrer un flow et faire écrire un token dans le magasin partagé. L'état porte maintenant l'identifiant utilisateur dans la charge signée, sur le patron de TikTok.  
Fichiers liés :

- `app/api/oauth/{youtube,calendar,meta,tiktok}/status/route.ts`
- `app/api/meta/status/route.ts`, `app/api/meta/instagram/accounts/route.ts`
- `app/api/oauth/garmin/{start,callback}/route.ts`
- `lib/server/oauth/garmin-state.ts`
- `scripts/garmin-oauth-pkce-check.mjs`
- `/knowledge/03_Decisions.md` (DEC-007), `/knowledge/10_Conventions.md`

Impact : la surface API ne comporte plus de route non gardée en dehors de `/api/health` (qui ne renvoie que `{ ok: true }`) et `/api/webhooks/calendar` (qui valide `x-goog-channel-token` à temps constant). `/api/oauth/tiktok/status` est gardée sur la session seule, sans filtre de rôle, pour préserver l'accès du compte reviewer TikTok pendant la review — la raison est écrite dans le fichier.

Action de suivi : la migration RLS `20260721090000_scope_content_assets_rls_to_owner.sql` (Lot 2) est écrite et committée mais son application en base n'est pas vérifiable depuis le dépôt. Voir l'entrée correspondante dans `MANUAL_ACTIONS.md`.

## 2026-07-28

Type : produit, documentation  
Résumé : correction des deux derniers contenus déclaratifs figés de l'Observatoire, repérés après la clôture de l'audit du 22 juillet. `projectMemoryForAssistant.nextRecommendedAction` portait une directive écrite le 29 mai (« Brancher les statuts reels en lecture seule dans l'Observatoire, en commencant par OAuth YouTube et Supabase ») devenue fausse une fois les sondes branchées, et s'affichait comme « Prochaine pierre » dans `ProjectMemoryPanel` sans marquage. Elle est remplacée par `fallbackNextRecommendedAction`, dont le texte annonce son propre statut de repli au lieu de décrire l'état du projet. `constructionJournalSeed`, entrée de journal codée en dur du 29 mai dont le blocage annoncé (« les statuts restent declaratifs tant que les sondes live ne sont pas branchees ») était devenu faux, est supprimé : il n'était plus rendu dans l'UI mais restait exposé à l'assistant.  
Fichiers liés :

- `lib/cockpit/observatory.ts`
- `/knowledge/06_Modules.md`

Impact : les deux chemins de lecture de l'assistant sont concernés — celui de `getLiveProjectMemory` et le repli de `AssistantCommandCenter` quand `projectContext` est absent. Aucun des deux ne peut plus présenter une directive périmée comme une recommandation courante, ni un blocage résolu comme actif. Aucun changement de comportement quand une source live existe : la chaîne de dérivation (mémoire projet, puis premier item `Bloque`/`A migrer`/`En cours`) est inchangée.

Action de suivi : aucune. Les trois items d'area `Agents` non rendus (`ProjectObservatory.tsx` non monté) restent une décision de conception UI ouverte, distincte de la transparence des statuts.

## 2026-07-22

Type : documentation, sécurité  
Résumé : documentation de `lib/server/publication-performance.ts` (jamais ajouté à `/knowledge` malgré un usage réel en production) et correction d'une sonde cassée dans `lib/server/observatory/read-model.ts` : `publicationTableCandidates` listait cinq noms de tables inexistants (`publications`, `publication_queue`, `scheduled_publications`, `publisher_jobs`, `content_publications`) au lieu du vrai nom `short_video_publications`, ce qui affichait en permanence un statut Publisher/Scheduler faussement "À migrer".  
Fichiers liés :

- `/knowledge/06_Modules.md`
- `lib/server/observatory/read-model.ts`
- `lib/server/publication-performance.ts`

Impact : le statut Publisher/Scheduler de l'Observatoire reflète maintenant la présence réelle de `short_video_publications` ; le module de performance de publication (YouTube/Instagram réels, TikTok placeholder assumé) est désormais traçable dans `/knowledge` au lieu d'être du code fonctionnel non documenté.

Action de suivi : voir aussi l'audit Observatoire (transparence des items déclaratifs de l'Observatoire, Journal récent codé en dur) traité dans le même lot.

## 2026-07-11

Type : base de données, workflow  
Résumé : ajout de `trajectoire_actions.effort_level` (`low`/`medium`/`high`, défaut `medium`) pour remplacer le proxy assumé dans `lib/server/personal/daily-brief-engine.ts` (priorisation des actions ouvertes selon le niveau de récupération basée sur la priorité de l'objectif parent, faute de champ dédié). La priorisation lit désormais directement l'effort de l'action.  
Fichiers liés :

- `supabase/migrations/20260711100000_add_effort_level_to_trajectoire_actions.sql`
- `lib/server/trajectoire.ts`
- `lib/server/personal/daily-brief-engine.ts`
- `scripts/personal-daily-brief-check.mjs`

Impact : la priorisation du brief quotidien n'est plus couplée à la priorité de l'objectif parent ; un objectif haute priorité peut désormais contenir des actions de tout niveau d'effort sans fausser l'ordre proposé.

Action de suivi : migration non encore appliquée (en attente du rapport d'audit sécurité) ; backfill via le `DEFAULT 'medium'` de la colonne, aucune action manuelle requise sur les lignes existantes une fois appliquée.

## 2026-07-08

Type : documentation, base de données  
Résumé : réconciliation entre `/knowledge` et du code déjà existant mais non documenté : le module Personnel (`app/interface/personnel`, `lib/personal/connectors`) avec un connecteur Garmin en développement et des stubs Strava/Notion/Finance. Documentation ajoutée avant tout nouveau code (migrations, OAuth, logique métier).  
Fichiers liés :

- `/knowledge/06_Modules.md`
- `/knowledge/05_Database.md`
- `/knowledge/03_Decisions.md` (DEC-005, DEC-006)
- `app/interface/personnel`
- `lib/personal/connectors`

Impact : le module Personnel devient une source de vérité documentée, avec une décision explicite sur l'accès Garmin (API officielle uniquement, activation manuelle) et sur le style UI distinct assumé.

Action de suivi : ajouter les tables `personal_garmin_daily_stats` et `personal_daily_briefs` aux migrations Supabase (étape suivante de cette réconciliation), puis mettre à jour cette entrée si l'approbation Garmin Developer Program change de statut.

## 2026-07-07

Type : documentation  
Résumé : création de la base de connaissances indépendante des modèles d'IA.  
Fichiers liés :

- `/knowledge/README.md`
- `/knowledge/00_Vision.md`
- `/knowledge/01_Architecture.md`
- `/knowledge/02_Roadmap.md`
- `/knowledge/03_Decisions.md`
- `/knowledge/04_Stack.md`
- `/knowledge/05_Database.md`
- `/knowledge/06_Modules.md`
- `/knowledge/07_Agents.md`
- `/knowledge/08_Workflows.md`
- `/knowledge/09_Prompts.md`
- `/knowledge/10_Conventions.md`
- `/knowledge/11_Changelog.md`

Impact : le projet dispose désormais d'une source documentaire portable entre ChatGPT, Claude, Gemini ou tout autre LLM.

Action de suivi : compléter les sections "À mettre à jour" avec les informations opérationnelles manquantes.

## Liens utiles

- [README Knowledge](./README.md)
- [Décisions](./03_Decisions.md)
- [Roadmap](./02_Roadmap.md)

## À mettre à jour

- Ajouter les changements antérieurs importants si nécessaire.
- Ajouter les futures évolutions fonctionnelles et techniques.
- Relier les entrées aux commits ou PR quand le workflow Git le permet.
