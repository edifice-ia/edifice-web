# Changelog

Statut : journal initial  
Dernière mise à jour : 2026-11-24

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Format](#format)
- [2026-11-25 (Academy : page Leçon en lecture seule)](#2026-11-25-academy--page-leçon-en-lecture-seule)
- [2026-11-25 (Academy : arbre d'un programme en lecture seule)](#2026-11-25-academy--arbre-dun-programme-en-lecture-seule)
- [2026-11-25 (Academy : page Programmes en lecture seule)](#2026-11-25-academy--page-programmes-en-lecture-seule)
- [2026-11-25 (Academy : modification côté base des programmes et matières)](#2026-11-25-academy--modification-côté-base-des-programmes-et-matières)
- [2026-11-25 (Academy : modification côté base et cascade)](#2026-11-25-academy--modification-côté-base-et-cascade)
- [2026-11-24 (Academy : isolation côté base des modules, chapitres et leçons)](#2026-11-24-academy--isolation-côté-base-des-modules-chapitres-et-leçons)
- [2026-11-24 (Academy : routes testées à la main)](#2026-11-24-academy--routes-testées-à-la-main)
- [2026-11-24 (Academy : routes API de la hiérarchie)](#2026-11-24-academy--routes-api-de-la-hiérarchie)
- [2026-11-24 (Academy : validation et store de la hiérarchie)](#2026-11-24-academy--validation-et-store-de-la-hiérarchie)
- [2026-11-24 (Academy : migration 2a appliquée en base)](#2026-11-24-academy--migration-2a-appliquée-en-base)
- [2026-11-24 (Academy : migration 2a, hiérarchie pédagogique)](#2026-11-24-academy--migration-2a-hiérarchie-pédagogique)
- [2026-11-24 (Academy : étape 1, squelette de l'espace)](#2026-11-24-academy--étape-1-squelette-de-lespace)
- [2026-11-24 (CRON_SECRET absent en production, créé et redéployé)](#2026-11-24-cron_secret-absent-en-production-créé-et-redéployé)
- [2026-11-22 (Academy : critères de choix du fournisseur de recherche web)](#2026-11-22-academy--critères-de-choix-du-fournisseur-de-recherche-web)
- [2026-11-22 (Academy : module rattaché obligatoirement à une matière)](#2026-11-22-academy--module-rattaché-obligatoirement-à-une-matière)
- [2026-11-22 (Academy : trois questions d'architecture tranchées)](#2026-11-22-academy--trois-questions-darchitecture-tranchées)
- [2026-11-22 (Academy : création d'un cours à partir d'un sujet demandé, inscrite au plan)](#2026-11-22-academy--création-dun-cours-à-partir-dun-sujet-demandé-inscrite-au-plan)
- [2026-11-22 (audit de sécurité déclaré clos)](#2026-11-22-audit-de-sécurité-déclaré-clos)
- [2026-11-22 (CRON_SECRET comparé à temps constant)](#2026-11-22-cron_secret-comparé-à-temps-constant)
- [2026-11-22 (migration pinterest_pins / content_drafts appliquée en base)](#2026-11-22-migration-pinterest_pins--content_drafts-appliquée-en-base)
- [2026-11-22 (contrôles SQL de clôture de l'audit, et migration pinterest_pins / content_drafts)](#2026-11-22-contrôles-sql-de-clôture-de-laudit-et-migration-pinterest_pins--content_drafts)
- [2026-11-22 (EDIFICE ACADEMY : étape 0, décisions et documentation)](#2026-11-22-edifice-academy--étape-0-décisions-et-documentation)
- [2026-10-04 (chantier 7 : migration appliquée en base)](#2026-10-04-chantier-7--migration-appliquée-en-base)
- [2026-09-28 (chantier 7 : privilèges des neuf tables service-role, migration écrite)](#2026-09-28-chantier-7--privilèges-des-neuf-tables-service-role-migration-écrite)
- [2026-09-20 (validation UUID des routes /permanent)](#2026-09-20-validation-uuid-des-routes-permanent)
- [2026-09-19 (module Objectifs : suppression physique)](#2026-09-19-module-objectifs--suppression-physique)
- [2026-09-19 (module Objectifs : interface)](#2026-09-19-module-objectifs--interface)
- [2026-09-18 (module Objectifs : store et API)](#2026-09-18-module-objectifs--store-et-api)
- [2026-09-18 (module Objectifs : migration)](#2026-09-18-module-objectifs--migration)
- [2026-09-16 (réassignation depuis l'écran de blocage des catégories de Journal)](#2026-09-16-réassignation-depuis-lécran-de-blocage-des-catégories-de-journal)
- [2026-09-16 (sélecteur et affichage des catégories de Journal)](#2026-09-16-sélecteur-et-affichage-des-catégories-de-journal)
- [2026-09-16 (écran de gestion des catégories de Journal)](#2026-09-16-écran-de-gestion-des-catégories-de-journal)
- [2026-09-15 (socle serveur des catégories de Journal)](#2026-09-15-socle-serveur-des-catégories-de-journal)
- [2026-09-15 (clés étrangères composites sur la liaison des catégories de Journal)](#2026-09-15-clés-étrangères-composites-sur-la-liaison-des-catégories-de-journal)
- [2026-09-09 (catégories de Journal, et DEC-013 passée en actif)](#2026-09-09-catégories-de-journal-et-dec-013-passée-en-actif)
- [2026-09-05 (suppression définitive d'une tâche archivée)](#2026-09-05-suppression-définitive-dune-tâche-archivée)
- [2026-09-03 (Tâches dans « Vider l'historique », et correction de dates)](#2026-09-03-tâches-dans--vider-lhistorique--et-correction-de-dates)
- [2026-08-30 (module Tâches, et privilèges hérités du défaut de schéma)](#2026-08-30-module-tâches-et-privilèges-hérités-du-défaut-de-schéma)
- [2026-08-18 (suppression définitive d'un élément archivé)](#2026-08-18-suppression-définitive-dun-élément-archivé)
- [2026-08-16 (un module à la fois, et révision de DEC-012)](#2026-08-16-un-module-à-la-fois-et-révision-de-dec-012)
- [2026-08-13 (« Vider l'historique », Réglages > Personnel)](#2026-08-13--vider-lhistorique--réglages--personnel)
- [2026-08-10 (archives et restauration, Habitudes)](#2026-08-10-archives-et-restauration-habitudes)
- [2026-08-10 (module Habitudes)](#2026-08-10-module-habitudes)
- [2026-08-09 (libellé « Archiver », et un incident de cache Turbopack)](#2026-08-09-libellé--archiver--et-un-incident-de-cache-turbopack)
- [2026-08-06 (archives et restauration, Notes et Journal)](#2026-08-06-archives-et-restauration-notes-et-journal)
- [2026-08-05 (module Journal et Humeur)](#2026-08-05-module-journal-et-humeur)
- [2026-08-04 (pôle Assistant)](#2026-08-04-pôle-assistant)
- [2026-08-04 (module Notes)](#2026-08-04-module-notes)
- [2026-08-01 (réévaluation du garde TikTok status)](#2026-08-01-réévaluation-du-garde-tiktok-status)
- [2026-08-01 (alignement des libellés sur la doc stratégique)](#2026-08-01-alignement-des-libellés-sur-la-doc-stratégique)
- [2026-08-01 (module Paramètres)](#2026-08-01-module-paramètres)
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

## 2026-11-25 (Academy : page Leçon en lecture seule)

Type : produit

Résumé : `app/interface/academy/lecons/[id]/page.tsx`, Server Component, lit `getLiveLesson(user.id, id)` directement et affiche le titre et le contenu d'une leçon. Lecture seule.

- Garde `requirePrivateCockpitAccess()`, puis `isUuid` avant le store ; malformé, inexistant, archivé, masqué par un ancêtre archivé ou d'un autre compte : même `404` ; `AcademyStoreError` : « Operation Academy indisponible. », sans détail.
- Contenu en texte brut (`whitespace-pre-wrap`), sans HTML, Markdown ni `dangerouslySetInnerHTML` ; contenu vide : phrase explicite.
- Retour vers la liste des programmes : `AcademyLesson` ne porte pas l'identifiant du programme.
- Arbre d'un programme : chaque titre de leçon devient un lien vers la page Leçon.

Fichiers liés :

- `app/interface/academy/lecons/[id]/page.tsx`, `app/interface/academy/programmes/[id]/page.tsx`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucune route, aucun store, aucun schéma modifiés. Non vérifié : le rendu avec une session et des données réelles.

## 2026-11-25 (Academy : arbre d'un programme en lecture seule)

Type : produit

Résumé : `app/interface/academy/programmes/[id]/page.tsx`, Server Component, lit `getLiveProgramTree(user.id, id)` directement et affiche le programme, ses matières, modules, chapitres et les titres de ses leçons, en listes imbriquées. Lecture seule.

- Garde `requirePrivateCockpitAccess()`, puis `isUuid` (de `lib/academy/hierarchy.ts`) avant le store.
- Malformé, inexistant, archivé ou d'un autre compte : même `404` (`notFound()`). `AcademyStoreError` : « Operation Academy indisponible. », sans détail.
- Niveau vide : phrase explicite. Leçons : titre seul, sans lien ni contenu ; la page Leçon vient ensuite.
- Page Programmes : chaque titre devient un lien vers l'arbre.

Fichiers liés :

- `app/interface/academy/programmes/[id]/page.tsx`, `app/interface/academy/programmes/page.tsx`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucune route, aucun store, aucun schéma modifiés. Validé par Vincent dans le navigateur le 2026-11-25.

## 2026-11-25 (Academy : page Programmes en lecture seule)

Type : produit

Résumé : première section d'Academy qui affiche des données. `app/interface/academy/programmes/page.tsx`, Server Component, lit `listLivePrograms(user.id)` directement, sans passer par les routes API, et affiche les programmes vivants avec leur titre et leur type. Lecture seule.

- États : liste vide (« Aucun programme enregistré pour l'instant. ») ; `AcademyStoreError` (« Operation Academy indisponible. », sans détail technique) ; liste.
- En-tête de l'espace : « Squelette, sans données » et « aucune ne contient encore de données », devenus faux, remplacés par un texte exact.
- `lib/academy/sections.ts` : `plannedStep` accepte `"2a"` et `"2b"` ; Ressources passe à l'étape 2b ; Leçons, accessible par l'arbre des programmes, sans route de liste.

Fichiers liés :

- `app/interface/academy/programmes/page.tsx`, `app/interface/academy/AcademyPrimitives.tsx`, `app/interface/academy/[section]/page.tsx` (commentaire), `lib/academy/sections.ts`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucune route, aucun store, aucun schéma modifiés. Non vérifié : le rendu avec une session et des données réelles.

## 2026-11-25 (Academy : modification côté base des programmes et matières)

Type : sécurité

Résumé : test SQL de la modification (`update`) sur `academy_programs` et `academy_subjects`, exécuté par Vincent dans le SQL Editor sous `postgres`, **conforme**. L'agent a écrit le script et consigné les résultats ; il n'a exécuté aucune requête.

- Programme : (b) modification de la ligne de A par B, `0` ligne affectée ; (c) changement de `user_id`, `42501`. Pas de test (a) : le programme n'a pas de parent.
- Matière : (a) rattachement au programme de A, `23503` sur `academy_subjects_program_fk` ; (b) `0` ligne affectée ; (c) `42501`.
- Lignes de A et de B intactes ; `rollback` ; contrôles préalable et après coup conformes selon Vincent.

La modification est désormais éprouvée côté base sur les cinq tables ; le point ouvert relevé dans l'entrée « modification côté base et cascade » du même jour est clos.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée archivée « Tester la modification (update) de l'isolation SQL sur academy_programs et academy_subjects »
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucun sur le code. Prochaine étape : interface de l'étape 2a, sur demande explicite.

## 2026-11-25 (Academy : modification côté base et cascade)

Type : sécurité

Résumé : test SQL de la modification (`update`) sur `academy_units`, `academy_chapters` et `academy_lessons`, exécuté par Vincent dans le SQL Editor sous `postgres`, **conforme**. L'agent a écrit le script et consigné les résultats ; il n'a exécuté aucune requête.

- (a) B rattache sa ligne au parent de A : `23503` sur les trois tables (`academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk`).
- (b) B modifie une ligne de A : `0` ligne affectée.
- (c) B passe le `user_id` de sa ligne à A : `42501`, refus par la règle d'accès.
- Lignes de A et de B intactes ; `rollback`, contrôle après coup à `0` partout.

**Cascade, point clos** : constat en base du 2026-11-25, deux requêtes en lecture seule exécutées par Vincent : les quatre clés composites (`academy_subjects_program_fk`, `academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk`) sont en cascade (`confdeltype = 'c'`), et `service_role` a `DELETE` sur les cinq tables ; `authenticated` ne l'a pas (migration). Requêtes et résultats consignés dans l'entrée archivée « Contrôler en base la cascade et le droit DELETE de service_role sur Academy » du 2026-11-25 de `MANUAL_ACTIONS.md`. Les points « non couvert » des entrées du 2026-11-24 (modification côté base, cascade à l'usage) sont ainsi traités ; ces entrées, datées, restent inchangées.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée archivée « Tester la modification (update) de l'isolation SQL sur academy_units, academy_chapters et academy_lessons »
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucun sur le code. Prochaine étape : interface de l'étape 2a, sur demande explicite.

## 2026-11-24 (Academy : isolation côté base des modules, chapitres et leçons)

Type : sécurité

Résumé : test d'isolation SQL de `academy_units`, `academy_chapters` et `academy_lessons`, exécuté par Vincent dans le SQL Editor sous `postgres`, **conforme**. L'agent a écrit le script et consigné les résultats ; il n'a exécuté aucune requête.

- Contrôle préalable : `auth.users` sans autre colonne obligatoire que `id`, sans déclencheur.
- Chaque compte crée sa chaîne (`1 / 1 / 1`) ; les trois insertions de B sous les parents de A sont refusées en `23503` par `academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk` ; vues croisées `0 / 0 / 0` dans les deux sens.
- Transaction terminée par `rollback` ; contrôle après coup à `0` partout.

Avec le test précédent, l'isolation côté base est éprouvée sur les cinq tables. **Non couvert** : cascade à l'usage ; règle d'accès en modification côté base sur ces trois tables.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée archivée « Tester l'isolation SQL des tables academy_units, academy_chapters et academy_lessons »
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucun sur le code. Prochaine étape : interface de l'étape 2a, sur demande explicite.

## 2026-11-24 (Academy : routes testées à la main)

Type : sécurité, produit

Résumé : les routes Academy sont **testées à la main, conformes**, par le porteur du projet, dans la console du navigateur sur le serveur local. L'agent consigne les résultats transmis ; il n'a fait aucun appel ni aucune requête.

- **Contrat** : créations en `201` aux cinq niveaux, arbre et leçon en `200`, `401` sans session.
- **Masquage** : un module archivé masque son chapitre et sa leçon (`404` en écriture et en restauration) ; sa restauration rétablit tout.
- **Isolation** entre `test-erase@edificeia.com` (créations) et `academy@edificeia.com` (tentatives) : tout en `404`, malformé en `404`, JSON invalide en `400`, aucune écriture réussie.
- `GET` sur `chapters/[id]` en `405` : voulu, ce fichier n'exporte que `PATCH` et `DELETE`.

Données de test créées sous `test-erase@edificeia.com` par erreur de départ : l'entrée de nettoyage `pending` est réorientée vers ce compte, avec la liste des identifiants, dont un module en double non relevé. **Non couvert** : isolation côté base de `academy_units`, `academy_chapters` et `academy_lessons`.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée archivée « Tester les routes Academy : contrat, masquage, isolation » ; entrée `pending` de nettoyage réorientée
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : aucun sur le code.

## 2026-11-24 (Academy : routes API de la hiérarchie)

Type : produit, sécurité

Résumé : routes API de la hiérarchie pédagogique — **15 fichiers, 23 handlers** sous `app/api/academy/` (programmes, matières, modules, chapitres, leçons : création, lecture, mise à jour, archivage, restauration, arbre, contenu d'une leçon). **Sans interface.**

- Chaque handler : `authorizeCockpitApiAccess()` en premier appel ; UUID d'URL validé avant le store ; JSON illisible en `400` ; toute exception en `500` générique, détail aux journaux ; même `404` pour inexistant, autre compte, archivé ou masqué.
- `lib/academy/http.ts` (pur, source unique des messages, sans accents) et `lib/server/academy/route-reply.ts` (`NextResponse`, journalisation).
- Store : `description: null` retiré des leçons dans `mapChild`.
- `npm run academy:routes:check` : analyse statique des routes et tests de la traduction ; une mutation volontaire a bien été détectée.

**Non testé** : contrat et isolation des routes, à faire à la main sur le serveur local après accord, avec deux sessions de deux comptes distincts.

Fichiers liés :

- `app/api/academy/**/route.ts` (15), `lib/academy/http.ts`, `lib/server/academy/route-reply.ts`, `lib/server/academy/hierarchy-store.ts`, `scripts/academy-routes-check.mjs`, `package.json`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `suivi-chantiers-edifice.md` — chantier 8

Impact : nouvelles routes privées, gardées, non appelées par l'interface. Commit local seulement : code qui décide de qui peut lire quoi.

## 2026-11-24 (Academy : validation et store de la hiérarchie)

Type : produit, sécurité

Résumé : première partie de la suite de l'étape 2a. Elle pose la validation et le store de la hiérarchie pédagogique, **sans route ni interface**.

- `lib/academy/hierarchy.ts` : module pur. Types, limites, validation de création et de mise à jour par niveau, `filterLiveTree` (masquage des descendants d'un élément archivé), `isUuid` en copie locale.
- `lib/server/academy/hierarchy-store.ts` : client de session uniquement, filtre `user_id` sur chaque requête, `LEVEL_CONFIG` interne (aucun nom de table venu de l'extérieur), `resolveLiveChain`, création avec position calculée, mise à jour, archivage, restauration refusée sous un ancêtre archivé, lecture de l'arbre et d'une leçon, programmes vivants et archivés. Codes `ok` / `invalid` / `not_found`, jamais l'erreur brute de la base ; `AcademyStoreError` générique en cas de panne.
- `scripts/academy-hierarchy-check.mjs`, `npm run academy:hierarchy:check` : 106 vérifications sans base, dont le masquage à chaque niveau.

**Non vérifié** : le store contre une vraie base (aucune base de test, aucune route ne l'appelle encore), l'isolation entre utilisateurs, la cascade à l'usage.

Dettes consignées au chantier 8 : `isUuid` en quatrième copie ; message d'erreur brut des routes Objectifs.

Fichiers liés :

- `lib/academy/hierarchy.ts`, `lib/server/academy/hierarchy-store.ts`, `scripts/academy-hierarchy-check.mjs`, `package.json`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `05_Database.md`
- `suivi-chantiers-edifice.md` — chantier 8, étape 2a et dettes

Impact : aucun en production, aucun code appelant. Commit local seulement : ce code décide de qui peut lire quoi, la règle permanente de `CLAUDE.md` s'applique.

## 2026-11-24 (Academy : migration 2a appliquée en base)

Type : base de données, sécurité

Résumé : **la migration `20261124120000_create_academy_hierarchy.sql` est appliquée en base**, le jour même de son écriture, par le porteur du projet dans le SQL Editor. L'agent n'a exécuté aucune requête ; il consigne les résultats transmis.

- Témoin avant : aucune table `academy_*`. Application : « Success. No rows returned ».
- Droits : cinq lignes `authenticated` → `INSERT, SELECT, UPDATE` ; rien pour `anon` ni `PUBLIC` ; aucun `DELETE`.
- RLS activée sur les cinq tables ; quinze règles d'accès `{authenticated}` sur `user_id = auth.uid()`.
- Contraintes : clés primaires, `unique (id, user_id)`, références à `auth.users` en cascade, `check` attendus, quatre clés composites en cascade.

**Portée** : contrôles **structurels** seulement. L'isolation entre utilisateurs et la cascade à l'usage ne sont pas testées.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée « Appliquer la migration Academy (hiérarchie 2a) » passée en `done` et archivée
- `suivi-chantiers-edifice.md` — chantier 8, étape 2a

Impact : les cinq tables existent en base ; aucun code ne les utilise encore.

## 2026-11-24 (Academy : migration 2a, hiérarchie pédagogique)

Type : base de données, sécurité

Résumé : **migration écrite, non appliquée** : `supabase/migrations/20261124120000_create_academy_hierarchy.sql`. Elle crée cinq tables, une par niveau : `academy_programs`, `academy_subjects`, `academy_units`, `academy_chapters`, `academy_lessons`.

- Liens de parenté obligatoires, par clés composites `(parent_id, user_id)` ; `on delete cascade` en filet de sécurité seulement.
- `user_id`, `created_at`, `updated_at`, `deleted_at` sur chaque table ; `position` sans unicité ; `kind` simple étiquette ; pas de statut ni de dates.
- RLS ; `revoke all … from anon, authenticated` avant le `grant` ; `SELECT`, `INSERT`, `UPDATE` à `authenticated`, aucun `DELETE` ; quinze policies, toutes sur `user_id = auth.uid()`.
- Archivage d'un parent : les enfants ne sont pas archivés, la lecture les masque (note sous DEC-014).
- Objectifs et ressources reportés en 2b.

**Vérification** : relecture mécanique de la migration — les cinq `revoke` précèdent les cinq `grant`, aucun `DELETE`, quinze policies sur la seule condition `user_id = auth.uid()`, cinq tables, déclencheurs, fonctions et index, une transaction. **Non appliquée sur une base de test** : aucune base locale n'est disponible (ni CLI Supabase, ni `psql`, ni Docker). L'application et ses contrôles sont dans l'entrée `pending` du 2026-11-24 de `MANUAL_ACTIONS.md`.

Fichiers liés :

- `supabase/migrations/20261124120000_create_academy_hierarchy.sql`
- `MANUAL_ACTIONS.md` — entrée `pending` « Appliquer la migration Academy (hiérarchie 2a) »
- `knowledge/Documentation-Technique-Code/05_Database.md`, `03_Decisions.md` (note sous DEC-014), `06_Modules.md`
- `knowledge/Documentation-Strategique/Markdown/12-modele-de-donnees.md` et son PDF — entité Programme et hiérarchie
- `suivi-chantiers-edifice.md` — chantier 8 : étape 2 découpée en 2a et 2b

Impact : aucun tant que la migration n'est pas appliquée. Commit local seulement : la migration contient `GRANT`, `REVOKE` et des policies, la règle permanente de `CLAUDE.md` s'applique.

## 2026-11-24 (Academy : étape 1, squelette de l'espace)

Type : produit, interface

Résumé : **étape 1 du chantier 8 faite.** L'espace Academy existe comme squelette : une route, un layout, une navigation intérieure de dix sections, et une entrée dans le menu principal. **Aucune donnée, aucune table, aucune migration, aucune route API, aucun appel à un fournisseur d'IA.** Chaque page annonce qu'elle n'est pas encore construite, et à quelle étape elle le sera.

- `lib/academy/sections.ts` : liste unique des sections, dont dérivent la navigation et les pages.
- `app/interface/academy/` : `layout.tsx`, `AcademyNav.tsx`, `AcademyPrimitives.tsx`, `page.tsx` (tableau de bord), `[section]/page.tsx` (neuf sections, `404` pour un segment inconnu).
- `lib/cockpit/navigation.ts`, `lib/cockpit/modules.ts` : entrée `academy`, même identifiant dans les deux, statut `En cours`, sans sous-entrées dans le menu principal.
- Accès : aucun garde nouveau ; le layout `/interface` et le middleware s'appliquent.

Vérification : `tsc --noEmit`, `eslint` et le build passent. Rendu contrôlé sur le serveur de développement local, avec la session du propriétaire : dix routes en `200`, `404` sur un segment inconnu, redirection vers `/login` sans session, navigation intérieure présente, menu principal avec une seule entrée « Academy ». Un espace manquant dans la ligne « Étape N du plan » a été trouvé à ce contrôle et corrigé avant le commit. **Non vérifié** au moment du commit : le rendu en production.

**Mise à jour du même jour — vérifié en production** : déploiement `dpl_FAubGHeHg5TBg8GULs8aK3bR7nrc` (commit `2a3f82f`), `READY` sur `www.edificeia.com`. Sans session, `/interface/academy`, une section et un segment inconnu répondent `307` vers `/login` — constaté par l'agent. Rendu des pages avec la session du propriétaire vérifié par le porteur du projet, résultat transmis à l'agent.

Fichiers liés :

- `knowledge/Documentation-Technique-Code/06_Modules.md` — section « Espace Academy — squelette construit, sans données »
- `suivi-chantiers-edifice.md` — chantier 8, étape 1 faite

Impact : nouvelle entrée « Academy » dans le menu latéral et sur la page Accueil ; l'Assistant compte Academy parmi les modules « en cours ». Aucun autre module n'est modifié.

## 2026-11-24 (CRON_SECRET absent en production, créé et redéployé)

Type : sécurité, exploitation

Résumé : en cherchant à vérifier le correctif `3e2047e` en production, l'agent a constaté que **`CRON_SECRET` n'existait pas dans les variables du projet Vercel** : 31 variables lues sans leurs valeurs, aucune masquée. Les trois routes cron refusent tout appel sans ce secret, et Vercel Cron n'envoie aucun en-tête d'authentification sans lui. Les appels planifiés recevaient donc vraisemblablement tous `401`. Ce n'est pas une régression du correctif. Depuis quand la variable manquait : non établi.

- Variable créée par le mainteneur le 2026-11-24, en Production seulement.
- Production redéployée à l'identique par l'agent, sur accord explicite : `dpl_HHRwrtnSNBpwNjfGWttzKvmBQoxE`, commit `712ec92`, `READY`. Sans secret, les trois routes répondent toujours `401`.
- **Vérifié le même jour** : Run sur `calendar-channel-renewal` lancé par le mainteneur, **`200`** lu dans les logs Vercel. Le vrai secret est accepté. Seule cette route a été exercée.
- Renvoi : l'état exact de cette vérification — Run sur le déploiement `dpl_HHRwrtnSNBpwNjfGWttzKvmBQoxE` et non sur celui en ligne, aucun appel planifié vérifié — est consigné au chantier 2 de `suivi-chantiers-edifice.md`, entrée « État de la vérification du `CRON_SECRET` — 24 novembre 2026 ».

Fichiers liés :

- `MANUAL_ACTIONS.md` — deux entrées archivées du 2026-11-24 : création et redéploiement, puis vérification (`200`)
- `suivi-chantiers-edifice.md` — chantier 2, suivi du 24 novembre 2026

Impact : les routes cron peuvent désormais être autorisées par Vercel Cron. Première exécution réelle attendue pour `process-scheduled-publications` le 2026-11-25 à 02:00 UTC : elle publiera tout ce qui est programmé et dont l'heure est passée.

## 2026-11-22 (Academy : critères de choix du fournisseur de recherche web)

Type : architecture, documentation

Résumé : critères de choix du fournisseur de recherche web pour la création d'un cours à partir d'un sujet demandé, consignés en note datée sous DEC-015. **Aucun fournisseur n'est choisi, aucun code n'est écrit.**

- La recherche passe par le service commun IA ; aucun fournisseur n'est codé en dur, et en changer reste une modification de configuration.
- Le fournisseur renvoie les URL et les extraits, pour que la comparaison des sources et la validation humaine soient vérifiables.
- Le fournisseur ne conserve pas les requêtes ni les résultats pour entraîner ses modèles. Ce point sera vérifié dans ses conditions au moment du choix.
- Un plafond de dépense par demande, à fixer à la création de la fonctionnalité.

Le choix lui-même est reporté à la création de la fonctionnalité. Il s'appuiera sur une recherche sourcée des offres et des conditions en vigueur à ce moment.

Fichiers liés :

- `knowledge/Documentation-Technique-Code/03_Decisions.md` — note datée sous DEC-015
- `suivi-chantiers-edifice.md` — chantier 8, ligne de l'étape 7 : renvoi vers les critères

Impact : aucun sur le code.

## 2026-11-22 (Academy : module rattaché obligatoirement à une matière)

Type : architecture, documentation

Résumé : correction de la note datée sous DEC-014 (`10d1500`). Elle déduisait, sans arbitrage, qu'un module pouvait se rattacher directement à son programme, avec une matière facultative. **Le porteur du projet a retenu l'inverse.** Documentation uniquement : aucun code, aucune migration.

- **Tous les liens de parenté sont obligatoires** : programme → matière, matière → module, module → chapitre, chapitre → leçon.
- **Une formation est composée de matières** ; chaque module appartient obligatoirement à une matière.
- « Les formations indépendantes commencent au niveau des modules » signifie qu'elles **sautent le niveau curriculum, pas le niveau matière**. La formulation est clarifiée dans la vision, sans être supprimée.
- **Formations courtes sans matière : reportées**, sans décision.

Fichiers liés :

- `knowledge/Documentation-Technique-Code/03_Decisions.md` — note sous DEC-014 corrigée ; texte d'origine de DEC-014 inchangé
- `knowledge/Documentation-Strategique/Markdown/22-espaces-et-marques.md`, `90-glossaire.md`, et leurs PDF régénérés
- `knowledge/Documentation-Technique-Code/11_Changelog.md` — l'entrée précédente porte un renvoi vers celle-ci

Impact : aucun sur le code. Le modèle de l'étape 2 ne prévoit aucun rattachement direct d'un module à un programme.

## 2026-11-22 (Academy : trois questions d'architecture tranchées)

Type : architecture, documentation

Résumé : les trois questions ouvertes de DEC-014 et DEC-015 sont tranchées par le porteur du projet. **Documentation uniquement** : aucun code, aucune migration, aucune table.

- **Hiérarchie pédagogique : une table par niveau**, pour le curriculum, la matière, le module, le chapitre et la leçon (`academy_programs`, `academy_subjects`, `academy_units`, `academy_chapters`, `academy_lessons`). L'arborescence unique est écartée. Conséquence déduite, à porter dans la migration de l'étape 2 : le rattachement d'un module à une matière est facultatif, pour les formations indépendantes. *(⚠️ Déduction retirée le même jour : voir l'entrée « module rattaché obligatoirement à une matière » ci-dessus.)*
- **Suppression physique propre à Academy** : suppression logique par défaut ; suppression physique sur le schéma de « Vider l'historique » de Personnel (DEC-012, DEC-013), avec un journal d'effacement dédié. Personnel n'est pas modifié.
- **Historique du Professeur IA** : stocké dans le service commun IA, avec les appels, coûts et limites, et séparé de l'historique de l'Assistant, sans aucun mélange.

Fichiers liés :

- `knowledge/Documentation-Technique-Code/03_Decisions.md` — notes datées sous DEC-014 et DEC-015, texte d'origine conservé
- `suivi-chantiers-edifice.md` — chantier 8 : lignes des étapes 2 et 8, questions ouvertes closes

Impact : aucun sur le code. L'étape 2 dispose de son modèle de hiérarchie ; elle reste à lancer sur demande explicite, après l'étape 1.

## 2026-11-22 (Academy : création d'un cours à partir d'un sujet demandé, inscrite au plan)

Type : produit, documentation

Résumé : la fonctionnalité « créer un cours à partir d'un sujet demandé » est inscrite au plan d'EDIFICE ACADEMY, **à l'étape 7** (service commun IA, puis Professeur IA), dont elle est un usage. **Documentation uniquement** : aucun code, aucune route, aucune table.

Trois arbitrages du porteur du projet :

- **validation humaine obligatoire** : l'IA produit un brouillon de cours proposé, et rien n'est enregistré en base sans validation explicite ;
- **sources** : recherche sur le web, avec comparaison de plusieurs sources avant de retenir une information ; chaque affirmation du brouillon est rattachée à ses sources, consultables lors de la validation ;
- **coûts et limites** : reportés à la création de la fonctionnalité, sous le principe de centralisation de DEC-015, sans plafond chiffré pour l'instant.

Le plan d'étapes d'Academy ne vit pas dans `knowledge/` mais au chantier 8 de `suivi-chantiers-edifice.md`, à la racine du dépôt ; les entités envisagées sont dans DEC-014. C'est là que la fonctionnalité est inscrite.

Fichiers liés :

- `suivi-chantiers-edifice.md` — chantier 8, ligne de l'étape 7 et paragraphe dédié
- `knowledge/Documentation-Technique-Code/03_Decisions.md` — note datée sous DEC-015

Impact : aucun sur le code. Deux préalables nouveaux pour l'étape 7 : la structure pédagogique de l'étape 2, où le cours validé sera rangé, et le choix d'un fournisseur de recherche web, intégration tierce à documenter.

## 2026-11-22 (audit de sécurité déclaré clos)

Type : sécurité

Résumé : **le porteur du projet déclare l'audit de sécurité clos au 2026-11-22, sous réserve de l'exception TikTok**, à réexaminer à la fin de la revue TikTok. Déclaration reportée mot pour mot au chantier 2 de `suivi-chantiers-edifice.md`, avec son critère, ses contrôles et le sort des cinq points résiduels.

Ce qui la fonde, tracé dans les entrées précédentes du même jour : les contrôles SQL en lecture seule, la migration `20261122100000` appliquée en base, et la comparaison du `CRON_SECRET` à temps constant.

**Limite de portée** : `91cbfda`, `d3a6427` et `3e2047e` sont des commits locaux, non poussés. Le correctif du `CRON_SECRET` n'est donc pas en production tant que `3e2047e` n'est pas déployé.

Fichiers liés :

- `suivi-chantiers-edifice.md` — chantier 2 (déclaration), chantier 8 et priorités
- `MANUAL_ACTIONS.md` — entrée « Décider de la clôture de l'audit de sécurité » passée en `done`

Impact : le préalable de sécurité au développement fonctionnel ([02-strategie-produit.md](../Documentation-Strategique/Markdown/02-strategie-produit.md)) est levé. L'étape 1 d'Academy reste soumise à une validation explicite.

Action de suivi : pousser les commits de sécurité, sur décision explicite ; réexaminer l'exception TikTok à la fin de la revue.

## 2026-11-22 (CRON_SECRET comparé à temps constant)

Type : sécurité

Résumé : les trois routes cron internes — `calendar-channel-renewal`, `personal-daily-brief`, `process-scheduled-publications` — comparaient le `CRON_SECRET` par `===`. [DEC-007](./03_Decisions.md) admet une route sans session à condition qu'elle valide un secret entrant à temps constant. Écart relevé par les vérifications de clôture de l'audit du même jour.

- **Nouveau helper** `isCronRequestAuthorized` dans `src/lib/auth/cron-auth.ts`, à côté des autres gardes. Il fait une vérification de longueur, puis `timingSafeEqual`, et évalue toujours les deux comparaisons, sans court-circuit.
- **Les trois routes l'appellent.** Leur fonction `isAuthorized` reste en place, exportée là où elle l'était, comme simple délégation au helper.
- **Sémantique inchangée** : `Authorization: Bearer <secret>` ou `x-cron-secret: <secret>`, `CRON_SECRET` trimmé, refus si absent ou vide.
- **Nouveau script** `npm run cron:auth:check` : secret correct par chacun des deux en-têtes, secret faux de même longueur, longueurs différentes sans exception, `CRON_SECRET` absent ou vide, cas limites de l'ancienne sémantique.

Fichiers liés :

- `src/lib/auth/cron-auth.ts` (nouveau), `scripts/cron-auth-check.mjs` (nouveau), `package.json`
- `app/api/internal/cron/calendar-channel-renewal/route.ts`, `app/api/internal/cron/personal-daily-brief/route.ts`, `app/api/internal/cron/process-scheduled-publications/route.ts`
- `knowledge/Documentation-Technique-Code/10_Conventions.md`, `suivi-chantiers-edifice.md` (chantier 2)

Impact : aucun changement pour un appelant légitime. Seule la durée de la comparaison change : elle ne dépend plus du contenu du secret proposé.

Action de suivi : décision séparée de clôture de l'audit, une fois ce commit vérifié. Push sur demande explicite seulement : code de `app/api/internal/**`.

## 2026-11-22 (migration pinterest_pins / content_drafts appliquée en base)

Type : sécurité, base de données

Résumé : **la migration `20261122100000` est appliquée en base et vérifiée**, le jour même de son écriture, par le mainteneur dans le SQL Editor. L'agent n'a exécuté aucune requête ; il a comparé les résultats transmis aux valeurs attendues.

- **Témoin avant** : 9 policies, conformes aux contrôles du même jour.
- **Après** : `content_drafts` ne porte plus que ses quatre policies versionnées `content_drafts_*_own` ; `pinterest_pins` n'en porte plus aucune ; aucun privilège `anon`, `authenticated` ni `PUBLIC` sur `pinterest_pins`.
- **Test de fumée** : bibliothèque Pinterest et Publisher Pinterest affichés sans erreur. La lecture par la clé service-role est exercée ; l'écriture ne l'est pas, déduite non concernée puisque la clé service-role n'est pas touchée.

Correction au passage : la requête de privilèges de l'étape 4 de l'entrée `MANUAL_ACTIONS.md` omettait `group by 1, 2` et aurait été refusée par Postgres. Le mainteneur a exécuté la version corrigée ; l'entrée archivée est corrigée.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée « Appliquer la migration 20261122100000 » passée en `done` avec ses résultats ; nouvelle entrée `pending` « Décider de la clôture de l'audit de sécurité »
- `suivi-chantiers-edifice.md` — chantiers 2, 7 et 8
- `knowledge/Documentation-Technique-Code/05_Database.md`

Impact : `pinterest_pins` n'est plus lisible par un compte connecté hors clé service-role. Aucun changement de comportement de l'application.

Action de suivi : la décision écrite de clôture de l'audit, qui reste le seul préalable de sécurité avant l'étape 1 d'Academy.

## 2026-11-22 (contrôles SQL de clôture de l'audit, et migration pinterest_pins / content_drafts)

Type : sécurité, base de données

Résumé : les quatre contrôles en lecture seule de l'entrée `MANUAL_ACTIONS.md` du même jour ont été **exécutés par le mainteneur** dans le SQL Editor, puis **comparés par l'agent** aux migrations du dépôt. L'agent n'a exécuté aucune requête.

- **Privilèges : conformes.** Dix-huit lignes `authenticated`, chacune identique au dernier `grant` de sa migration ; aucune ligne `anon` ni `PUBLIC` ; aucune table sans RLS.
- **Écart de décompte du chantier 7 : clos.** Les deux tables non identifiées sont `project_memory` et `project_memory_audit_log`.
- **Quatre policies `{public}` de `content_drafts` : lues.** Restreintes au propriétaire et inatteignables, donc pas une fuite ; mais créées hors migrations.
- **`pinterest_pins` : seul écart réel.** Policy `using (true)` et `SELECT` accordé à `authenticated`, versionnés mais contraires à `13-securite-gouvernance.md` : tout compte connecté, reviewer compris, lit toutes les épingles. Aucun code n'utilise ce privilège.

Migration écrite : `20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql`. Elle supprime la policy ouverte et révoque `anon` et `authenticated` sur `pinterest_pins`, sans re-grant. Elle supprime aussi les quatre policies non versionnées de `content_drafts`. **Non appliquée.** Retour arrière en commentaire du fichier.

Fichiers liés :

- `supabase/migrations/20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql`
- `MANUAL_ACTIONS.md` — contrôles passés en `done` avec leurs résultats ; nouvelle entrée `pending` pour appliquer la migration et décider de la clôture
- `suivi-chantiers-edifice.md` — chantiers 2 et 7
- `knowledge/Documentation-Technique-Code/05_Database.md`

Impact : aucun tant que la migration n'est pas appliquée. Une fois appliquée, aucun effet attendu sur l'application : `pinterest_pins` n'est accédée que par la clé service-role.

Action de suivi : appliquer la migration, faire le test de fumée Pinterest, puis décision écrite de clôture de l'audit. Commit local seulement : la migration contient `REVOKE` et `DROP POLICY`, la règle permanente de `CLAUDE.md` s'applique.

## 2026-11-22 (EDIFICE ACADEMY : étape 0, décisions et documentation)

Type : architecture, produit, documentation, sécurité

Résumé : **EDIFICE ACADEMY devient le troisième espace de L'Édifice et la priorité de développement ; le pôle Personnel est mis en pause.** Arbitrage du porteur du projet, formalisé en deux décisions. **Aucun code, aucune migration, aucune table** : Academy n'existe ni dans le code ni en base.

- **DEC-014** : Academy est un espace singleton, avec sa propre navigation intérieure ; il devient la priorité ; Personnel est en pause ; la hiérarchie pédagogique est un curriculum à six niveaux, avec formations indépendantes et parcours libres. La décision liste les contradictions avec l'existant, les entités envisagées — non définitives, `academy_courses` remplacée par `academy_programs` pour éviter la collision avec le niveau « cours » — et ce qu'elle ne fait pas.
- **DEC-015** : le service commun IA est multi-fournisseurs et multi-modèles. Un consommateur nomme un usage, jamais un modèle ; coûts, limites et journalisation centralisés ; Claude premier fournisseur envisageable, pas dépendance structurelle. **Révise DEC-011**, sans effacer son texte.
- **Règle « finir Personnel avant tout le reste » suspendue, pas abrogée** : son texte est conservé et daté dans `02-strategie-produit.md` et `30-trajectoire.md`. La seconde règle — l'audit de sécurité avant toute nouvelle fonctionnalité — **reste en vigueur**.
- **Statut de l'audit de sécurité re-vérifié** : clôture **non établie**. Les lots du chantier 2 et le re-audit `2cf9316` sont dans `origin/main`, et 87 des 88 routes API suivies portent un motif de garde, le seul manquant étant `/api/health`, exception documentée. Mais aucun critère de clôture n'existe, et des objets de sécurité de la base restent au contenu inconnu. Le développement fonctionnel reste donc bloqué. Constat au passage : `be07b02` est déjà dans `origin/main`, alors que le chantier 7 en réservait le push à une demande explicite.

Fichiers liés :

- `knowledge/Documentation-Technique-Code/03_Decisions.md` — DEC-014, DEC-015 ; notes de révision sur DEC-009 et DEC-011
- `knowledge/Documentation-Technique-Code/05_Database.md` — domaine Academy, sans table
- `knowledge/Documentation-Technique-Code/06_Modules.md` — section « Espace Academy — décidé, non construit » ; Personnel marqué en pause ; renvoi à DEC-015 dans la section Assistant
- `knowledge/Documentation-Strategique/Markdown/` : `02-strategie-produit.md`, `10-architecture-systeme.md`, `20-catalogue-services.md`, `22-espaces-et-marques.md`, `30-trajectoire.md`, `90-glossaire.md`, et leurs six PDF régénérés
- `suivi-chantiers-edifice.md` — chantier 8, priorités réordonnées, re-vérification du chantier 2
- `MANUAL_ACTIONS.md` — entrée `pending` du 2026-11-22, contrôles de clôture de l'audit

Impact : aucun changement de comportement. La navigation, les registres, Personnel, Contenu et Trajectoire sont inchangés.

Action de suivi :

- contrôles en lecture seule de l'entrée `MANUAL_ACTIONS.md` du 2026-11-22, puis décision écrite du porteur du projet sur la clôture de l'audit ;
- validation explicite de l'étape 1 du chantier 8, une fois l'audit clos ;
- points de cohérence laissés ouverts : `12-modele-de-donnees.md` ne cite pas encore le programme d'apprentissage parmi les entités primaires, à faire avec la première migration ; `14-integrations.md` décrit Claude comme « moteur IA principal de l'Assistant », compatible avec DEC-015 mais à relire au premier branchement ; `CLAUDE.md` affirme qu'aucun outil de rendu PDF n'existe, alors que `npm run docs:pdf` existe depuis le 2026-08-01.

## 2026-10-04 (chantier 7 : migration appliquée en base)

Type : sécurité, base de données

Résumé : **la migration `20260928100000` est appliquée en base et vérifiée** — compte rendu du mainteneur du 2026-10-04. `anon`, `authenticated` et `PUBLIC` n'ont plus aucun privilège sur les neuf tables. Aucun code ne change dans cette entrée : c'est la fin de vie de l'action manuelle ouverte le 2026-09-28.

**La date d'application n'est pas établie.** Un `revoke` exécuté dans le SQL Editor ne laisse aucun horodatage lisible depuis cette machine. Les bornes sont vérifiées par commande : après le 2026-09-29 (jour de l'écriture du commit `be07b02`, 10:15, et de l'affichage de l'entrée pour exécution), au plus tard le 2026-10-04. Cette entrée porte la date du compte rendu, pas celle de l'application.

**Résultats relevés en base par le mainteneur** (l'agent n'a exécuté aucune de ces requêtes) : les neuf tables présentes ; plus aucun privilège pour `anon`, `authenticated` ni `PUBLIC` ; `postgres` et `service_role` intacts sur les neuf ; aucun privilège de colonne ; les neuf empreintes de policies identiques avant et après ; aucun résidu `[TEST-ACL]`. **Test de fumée passé** : carte « Agenda du jour » sans erreur, Atelier de contenu en lecture sans erreur, cycle complet projet, objectif, action puis suppressions sur Trajectoire avec `test-erase@edificeia.com` — le seul parcours qui exerce `select`, `insert`, `update` et `delete`, dont le `delete` à nom de table dynamique.

**Deux limites, qui ne sont pas des échecs** :

- **l'effet de bord sur cinq tables n'a pas été testé** — `content_assets`, `video_render_jobs`, `short_video_schedules`, `short_video_publications`, `publication_performance_snapshots`, dont les policies lisent `content_drafts`. Leur refus attendu en « permission denied » pour un appelant `authenticated` reste déduit du fonctionnement des policies ;
- **les écritures de l'Atelier de contenu n'ont pas été exercées par le test de fumée.** Aucune écriture sur `content_drafts` ni sur les trois tables liées n'a été observée après la révocation ; le témoin des privilèges de `service_role` ne les couvre qu'indirectement.

Fichiers liés :

- `MANUAL_ACTIONS.md` — entrée du 2026-09-28 passée en `done` et déplacée dans l'archive
- `suivi-chantiers-edifice.md` — chantier 7
- `knowledge/Documentation-Technique-Code/05_Database.md`, `11_Changelog.md`

Impact : aucun changement de comportement observé. Les points ouverts du chantier 7 restent ouverts : quatre policies `{public}` sur `content_drafts`, gardes en `403` des routes Calendrier, revue de moindre privilège des autres tables, correction des migrations Vitals avant leur application.

Action de suivi :

- **push de `be07b02`**, sur demande explicite : la migration contient `REVOKE`, la règle permanente s'applique ;
- décider s'il faut lever les deux limites (tester le refus attendu sur les cinq tables ; exercer une écriture de l'Atelier de contenu).

## 2026-09-28 (chantier 7 : privilèges des neuf tables service-role, migration écrite)

> ⚠️ **État devenu faux depuis la rédaction de cette entrée** : la migration y est décrite comme « non appliquée ». Elle est **appliquée en base**, compte rendu du 2026-10-04 — voir l'entrée du 2026-10-04 ci-dessus. Le reste de l'entrée est inchangé et décrit l'état du 2026-09-28.

Type : sécurité, base de données

Résumé : **une migration retire à `anon` et `authenticated` tout privilège sur neuf tables qui ne sont accédées que par la clé service-role** — `20260928100000_revoke_client_privileges_on_service_role_only_tables.sql`. **Écrite, vérifiée en isolation, non appliquée** : l'application en base est une action manuelle (entrée `MANUAL_ACTIONS.md` du 2026-09-28). Les neuf tables : `personal_calendar_events`, `personal_calendar_sync_state`, `content_drafts`, `content_draft_asset_links`, `content_draft_media_plans`, `content_draft_visual_scenes`, `trajectoire_projects`, `trajectoire_objectives`, `trajectoire_actions`.

**Origine** : le contrôle de sécurité des deux tables Calendrier demandé le 2026-09-25, étendu aux tables qui ne passent que par la clé service-role. Cause : celle du chantier 6 — `revoke all … from anon` puis `grant … to authenticated`, sans révoquer côté `authenticated`, et un `grant` est additif. Les résultats bruts du contrôle sont dans le SQL Editor, non versionnés.

**Décisions portées par ce commit** :

- **aucun re-grant.** Le chantier 6 terminait par un `grant` parce que ses stores utilisent le client de session. Ces tables n'ont aucun accès par un client de session ni navigateur — recherche faite le 2026-09-28, **noms de table dynamiques compris** ;
- **le `DELETE` des trois tables `trajectoire_*` n'est visible que par la recherche dynamique** : `deleteTrajectoireEntity` (`lib/server/trajectoire.ts`) écrit `.from(table).delete()` avec un nom choisi à l'exécution, et une recherche par nom littéral ne le voit pas. C'est le seul `DELETE` sur ces trois tables ;
- **RLS et policies inchangées**, retour arrière en commentaire à la fin du fichier, non appliqué, et qui ne restaure que les quatre privilèges annoncés par les migrations d'origine ;
- **deux tables laissées hors du périmètre** — `personal_daily_briefs` et `personal_garmin_daily_stats` — qui présentent le même défaut. Elles n'étaient pas dans la demande.

**Effet à connaître, déduit et non testé** : cinq autres tables — `content_assets`, `video_render_jobs`, `short_video_schedules`, `short_video_publications`, `publication_performance_snapshots` — ont des policies `to authenticated` dont une sous-requête lit `content_drafts`. Une requête `authenticated` sur elles échouera en « permission denied » au lieu de renvoyer des lignes filtrées. Aucun code ne l'émet.

**Corrigé au passage, directement et sans encart** : `suivi-chantiers-edifice.md`, chantier 6, affirmait que les cinq tables du pôle Personnel étaient « les seules du dépôt » à ne pas révoquer `from authenticated`, et que « les seize autres tables » le faisaient toutes. **C'était faux dès l'écriture.** D'après les migrations, sur les vingt-six autres tables existant alors, quinze révoquaient et onze ne le faisaient pas. La phrase est réécrite à cet endroit. **Non corrigés, volontairement** : les mêmes affirmations vivent en commentaire dans deux migrations déjà appliquées, `20260824110000` (« seules à ne l'avoir jamais fait ») et `20260824120000` (« seize autres tables du dépôt »). Modifier un fichier de migration appliqué n'est pas anodin même pour un commentaire ; la migration de ce chantier porte la rectification.

**Attribution imprécise relevée, non corrigée pour la même raison** : le commentaire du chantier 6 (`suivi-chantiers-edifice.md`, et les commentaires de `20260824110000`/`20260824120000`) attribue le défaut aux deux `ALTER DEFAULT PRIVILEGES` indifféremment, « posés par `postgres` et `supabase_admin` ». Le commentaire de la migration `personal_goals` (`20260917100000`) fait de même — « le défaut de schéma posé par `supabase_admin` ». Or un `ALTER DEFAULT PRIVILEGES` ne s'applique qu'aux objets créés **par le rôle qui l'a posé** : les migrations du dépôt s'exécutent en `postgres` dans le SQL Editor, c'est donc le défaut de `postgres` qui les concerne, celui vidé le 2026-08-30. Celui de `supabase_admin` ne concerne que les tables créées par l'outillage interne de Supabase, hors du flux de migrations — le résidu que `20260824120000` documente déjà comme hors de portée. La confusion n'a pas d'effet pratique connu : aucune table du dépôt n'est créée par `supabase_admin`. Ni `suivi-chantiers-edifice.md` (hors la section de ce chantier) ni les trois migrations citées ne sont modifiés pour cette imprécision.

**Points ouverts, consignés sans être corrigés** :

- quatre policies `{public}` sur `content_drafts`, relevé en base par le mainteneur le 2026-09-28, absentes des migrations ;
- gardes en `403` écrits à la main sur les routes Calendrier, au lieu de `authorizeCockpitApiAccess()` ;
- revue de moindre privilège des autres tables : 18 selon le contrôle SQL relevé en base par le mainteneur le 2026-09-28, 25 selon une lecture des migrations. 5 des 7 d'écart expliqués (`oauth_tokens`, `personal_data_erasure_log`, `personal_item_erasure_log`, et les deux tables Vitals non appliquées en base — voir l'entrée du 2026-09-28 dans `suivi-chantiers-edifice.md`), 2 non identifiés.

Fichiers liés :

- `supabase/migrations/20260928100000_revoke_client_privileges_on_service_role_only_tables.sql`
- `MANUAL_ACTIONS.md`
- `suivi-chantiers-edifice.md`, `knowledge/Documentation-Technique-Code/05_Database.md`, `11_Changelog.md`

Impact : aucun tant que la migration n'est pas appliquée. Une fois appliquée, `anon` et `authenticated` n'ont plus aucun privilège sur ces neuf tables, et aucun écran ne doit changer : les accès passent par la clé service-role, qu'elle ne touche pas.

Action de suivi :

- **appliquer la migration** selon `MANUAL_ACTIONS.md`, avec les contrôles avant/après et le test de fumée ;
- **push du commit, sur demande explicite** : la migration contient `REVOKE`, la règle permanente s'applique ;
- **décider du sort** de `personal_daily_briefs` et `personal_garmin_daily_stats`.

## 2026-09-20 (validation UUID des routes /permanent)

Type : sécurité

Résumé : **l'écart de validation UUID est fermé sur les quatre routes `/permanent` plus anciennes** — Notes, Journal, Habitudes et Tâches. Chacune valide désormais le format de l'identifiant **en première étape après `authorizeCockpitApiAccess()`**, avant tout appel au store, et répond `404` sur un identifiant malformé. Elles se comportent comme la route Objectifs, écrite ainsi dès sa conception. Aucune migration, aucun changement de base.

**Constat avant correction, mesuré le 2026-09-20 sur le code non modifié** : les quatre routes répondaient **`500`**, et renvoyaient au client **le message d'erreur brut de Postgres** — `invalid input syntax for type uuid: "pas-un-uuid"`. C'est plus qu'un mauvais code d'état : le message de la base traversait la route. Il ne contient que la valeur envoyée par le client, mais la route n'a pas à laisser passer un message de base de données. La route Objectifs, elle, répondait `404`.

**Décisions portées par ce commit** :

- **un helper partagé, `isPersonalItemId`, dans `lib/personal/data-erasure.ts`**, module commun aux gestes d'effacement du pôle, sans I/O. Il évite de faire dépendre Notes de `goals.ts` ou de `journal-categories.ts` ;
- **c'est une troisième copie de la même expression** : `isUuid` existe dans `goals.ts` et dans `journal-categories.ts`. La route Objectifs garde la sienne, pour ne pas toucher à une route déjà validée de bout en bout. **Consolider les trois est un nettoyage à part** ;
- **`404` avec le message que chaque route renvoyait déjà** — « Note introuvable. », « Entree introuvable. », « Habitude introuvable. », « Tache introuvable. » —, pour qu'un identifiant malformé, inexistant, actif ou d'un autre compte reste indistinguable : la route n'est pas un oracle d'existence ;
- **la casse est indifférente**, comme pour Postgres : un UUID valide en majuscules passe la validation, et répond `404` s'il n'existe pas ;
- **portée limitée aux `/permanent`**. Les autres routes `[id]` de ces quatre modules — modification, archivage, restauration, réalisations d'Habitudes — **n'ont pas de validation UUID** (recherche dans le code) et restent à reprendre. Elles passent par le client de session, donc par RLS ; leur comportement sur un identifiant malformé n'a **pas été re-mesuré** ce jour.

**Commentaires corrigés au passage**, sur des affirmations devenues fausses dans les fichiers touchés : « Quatre gardes » devient « Cinq gardes » dans les quatre routes ; celle d'Habitudes disait « le seul des trois à porter une table dépendante », alors que Journal en porte une depuis les catégories ; celle de la route Objectifs disait que les quatre autres routes « restent à reprendre ».

**Test de contrat passé le 2026-09-20, 72 vérifications sur 72**, session réelle sur `test-erase@edificeia.com` avec des éléments `[TEST-UUID]` créés pour l'occasion, et un instantané des comptes avant et après :

- `401` sans session sur les quatre routes ;
- **identifiant malformé → `404`, et non `500`**, pour trois formes — `pas-un-uuid`, `123`, et un UUID à un caractère invalide — sur chacune des quatre routes ;
- UUID valide inexistant, en minuscules comme en majuscules → `404` ;
- **le reste, inchangé** : élément actif → `404` sans écriture ni audit ; élément archivé → `200`, ligne disparue, **une seule entrée d'audit** au bon module, à la bonne table et au bon volume ; second appel → `404` sans nouvelle entrée ;
- **les dépendantes partent toujours avec l'élément** : une habitude avec une réalisation renvoie `relatedDeletedCount` à 1 et la réalisation disparaît ; une entrée de journal avec une catégorie liée renvoie 1 et la liaison disparaît, la catégorie elle-même étant conservée puis supprimée par la route de gestion ;
- témoin : la route Objectifs répond toujours `404` ;
- **huit tables du compte identiques avant et après** : tout ce qui avait été créé a été supprimé.

**Limites.** Le test se limite au compte de test : la validation du format ne dépend pas du compte, mais **l'isolation entre comptes n'est pas concernée et n'a pas été re-testée**. Elle reste établie par construction — le filtre `user_id` est une fonction unique du store —, non par un test à deux comptes. **La validation accepte tout UUID de forme**, sans contrôle de version : c'est ce qu'accepte Postgres.

Fichiers liés :

- `lib/personal/data-erasure.ts`
- `app/api/personal/notes/[id]/permanent/route.ts`, `app/api/personal/journal/[id]/permanent/route.ts`, `app/api/personal/habits/[id]/permanent/route.ts`, `app/api/personal/tasks/[id]/permanent/route.ts`
- `app/api/personal/goals/[id]/permanent/route.ts` (commentaire seul)
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `11_Changelog.md`

Impact : une requête `DELETE /api/personal/{notes,journal,habits,tasks}/<identifiant malformé>/permanent` répond `404` au lieu de `500`, et **ne transmet plus de message de base de données**. Aucun autre comportement ne change.

Action de suivi :

- **push du commit**, sur demande explicite : ces routes passent par la clé service-role, la règle permanente s'applique ;
- **valider le format des identifiants dans les autres routes plus anciennes du pôle** — `[id]`, `restore`, `completions` de Notes, Journal, Habitudes et Tâches. Mesurer d'abord leur comportement actuel ;
- **consolider les trois copies de `isUuid`** en un seul module.

## 2026-09-19 (module Objectifs : suppression physique)

Type : produit, sécurité

Résumé : quatrième et dernier checkpoint du **module Objectifs**. Il rejoint les deux gestes de suppression physique du pôle : « Vider l'historique » dans Réglages, et « Supprimer définitivement » un objectif archivé dans sa carte Archives. **Aucune migration** : les deux tables d'audit n'ont pas de liste de valeurs autorisées pour `module`.

**Décisions portées par ce commit** :

- **`goals` en dernière position de `ERASABLE_MODULES`**, sans `cascadeLabel` ni note : une table, aucune dépendante, rien à nommer hors compte ;
- **une route `DELETE /api/personal/goals/[id]/permanent` qui valide le format UUID.** Elle passe par la clé service-role, où un identifiant malformé remonterait en `22P02` puis en `500`. **Les quatre routes `/permanent` plus anciennes ne le font pas** et restent à reprendre ;
- **la confirmation de suppression définitive nomme intitulé, valeurs et date d'archivage**, deux objectifs archivés se ressemblant facilement ;
- **fermer les archives remet la confirmation à zéro**, pour qu'une confirmation destructrice ne se rouvre pas d'elle-même ;
- **le commentaire d'en-tête de `data-erasure-store.ts` est corrigé.** Il affirmait qu'« une seule table du pôle » accorde `DELETE` à `authenticated` et comptait « les quatre modules » : trois tables l'accordent, et les modules sont cinq. Corrigé au moment d'y ajouter `personal_goals`, faute de quoi le commentaire aurait été retouché sur une phrase fausse ;
- **DEC-012 dit désormais « trois écrans » — sélection, confirmation, résultat —, et non « quatre ».** Erreur relevée en relisant la règle 1 : un reliquat de l'ancienne interface à sélection multiple, alors que `06_Modules.md` décrit le flux à trois écrans — liste, confirmation, résultat ;
- **`CLAUDE.md` gagne une règle de vérification isolée** : ne laisser tourner aucun serveur de développement pendant l'isolation. Tirée de l'incident ci-dessous.

> ⚠️ **« Les quatre routes `/permanent` plus anciennes ne le font pas » est dépassé depuis le 2026-09-20.** Les quatre routes de Notes, Journal, Habitudes et Tâches valident désormais le format UUID, et répondent `404` au lieu de `500` — voir l'entrée « validation UUID des routes /permanent ». Les autres routes plus anciennes du pôle n'ont toujours pas cette validation.

**Incident pendant la vérification isolée de ce commit.** Le `git stash push --include-untracked` a échoué en partie — `File exists` sur un fichier de route nouvellement stagé, `Permission denied` sur un dossier non suivi — pendant qu'un serveur de développement tournait, et l'a fait planter. L'arbre est resté incohérent, un fichier stagé absent du disque et le travail de l'utilisateur dans le stash. Rien n'a été perdu : copie de sécurité hors de git, fichier remis sur disque depuis l'index, `stash pop` sans conflit, contenu vérifié identique. La vérification a été refaite sans serveur, et elle passe. **La cause est probable, non prouvée.**

**Vérifié en pratique, une seconde fois** : brancher un module sur « Vider l'historique » demande deux entrées, une dans chaque liste. Le compilateur refuse l'état intermédiaire. Voir [Décisions](./03_Decisions.md) DEC-012.

**Test de contrat passé le 2026-09-19, 30 vérifications sur 30**, session réelle sur `test-erase@edificeia.com` avec des objectifs `[TEST-CP4]` créés pour l'occasion :

- `401` sans session ; `404` sur un objectif actif, un identifiant malformé et un identifiant inexistant, sans écriture ni audit ;
- suppression d'un objectif archivé en `200` ; ligne disparue en base ; autre archive et objectif actif intacts ;
- **une seule entrée d'audit** — `goals`, `personal_goals`, `related_deleted_count` à 0, aux seules colonnes techniques, sans intitulé ni unité ; un second appel répond `404` et n'en écrit pas ;
- `GET` de « Vider l'historique » : cinq modules, Objectifs en dernier, compte égal aux lignes en base archivées comprises, aucun `cascadeLabel` ;
- les quatre objectifs déjà présents sur le compte — les trois du checkpoint 2 et « [TEST] Virgule », créé par le test de bout en bout du checkpoint précédent — sont restés identiques, `updated_at` compris.

**Le `POST` de « Vider l'historique » n'a pas été exercé.** Le test s'est aussi limité à un seul compte : **l'isolation entre comptes n'est pas couverte**. Le filtre `.eq("user_id", …)` est le seul garde de ce chemin, la clé service-role contournant RLS — le même code que pour les quatre autres modules, sans qu'un second compte l'ait mis en défaut.

> ⚠️ **« Le `POST` de « Vider l'historique » n'a pas été exercé » est dépassé depuis le 2026-09-19** — vrai du test de contrat, plus du module. Le test de bout en bout par pilotage navigateur humain a exercé les deux gestes sur `test-erase@edificeia.com` : « Supprimer définitivement » sur l'objectif archivé `[TEST-CP4]`, puis « Vider Objectifs ». **La date est établie par les horodatages de la base**, non par celle du message qui l'a rapporté : 13:35:14 UTC pour la suppression individuelle, 13:35:53 UTC pour « Vider Objectifs », 39 secondes plus tard.
>
> **Relecture en base, en lecture seule, le 2026-09-20 : 13 contrôles sur 13.** `personal_goals` ne compte plus aucune ligne pour ce compte, archivées comprises, et l'objectif supprimé individuellement est absent. `personal_item_erasure_log` porte une entrée pour lui — `goals`, `personal_goals`, `related_deleted_count` à 0, `archives_panel`, bon compte, colonnes techniques seulement. `personal_data_erasure_log` porte une entrée `goals` / `personal_goals` / `deleted_count` à 4 / `settings_personal`, au bon compte, sans aucune entrée d'un autre module au même moment. Les 4 lignes supprimées sont les 4 objectifs du compte avant le test — Épargne, Poids, Lectures, Virgule —, et les deux autres entrées individuelles du journal sont celles du test de contrat.
>
> **Limites de cette relecture.** (1) Le volume de 4 est cohérent avec l'état relevé avant le test, mais aucun relevé n'a été pris juste avant le geste. (2) **L'isolation entre comptes n'a pas été re-testée** : la relecture est limitée au compte de test. Elle reste établie par construction — le filtre `user_id` est une fonction unique du store, le même code que pour les quatre autres modules —, non par un test à deux comptes ; le paragraphe précédent le dit toujours. (3) **`personal_data_erasure_log` ne compte qu'une seule entrée pour ce compte**, toutes dates confondues. L'explication vraisemblable est que les gestes « Vider » validés plus tôt l'ont été sous d'anciens identifiants du compte, recréé plusieurs fois — **non vérifiée**.

Fichiers liés :

- `lib/personal/data-erasure.ts`, `lib/server/personal/data-erasure-store.ts`
- `app/api/personal/goals/[id]/permanent/route.ts` (nouveau)
- `app/interface/personnel/PersonalGoalsPanel.tsx`
- `knowledge/Documentation-Technique-Code/03_Decisions.md`, `05_Database.md`, `06_Modules.md`
- `CLAUDE.md`

Impact : Objectifs est effaçable. Le module est complet côté code : table, store, routes, interface, archivage, restauration et les deux gestes de suppression physique.

Action de suivi :

- **test de bout en bout par pilotage navigateur humain** — validé le 2026-09-19 —, sur `test-erase@edificeia.com` : « Supprimer définitivement » un objectif archivé depuis la carte Archives — un objectif `[TEST-CP4]` y est laissé archivé —, puis « Vider Objectifs » depuis Réglages. **Ce second geste détruit tous les objectifs du compte de test.** À contrôler ensuite en base : lignes disparues, une entrée de `personal_data_erasure_log` au bon compte, une de `personal_item_erasure_log` pour la suppression individuelle — contrôlé le 2026-09-20, voir l'encart ⚠️ plus haut ;
- **push des commits d'Objectifs**, sur demande explicite : ce commit touche à la suppression physique et à la clé service-role, la règle permanente s'applique ;
- restent ouvertes : valider le format des identifiants dans les quatre routes `/permanent` plus anciennes — fait le 2026-09-20, voir l'entrée « validation UUID des routes /permanent » — et dans les autres routes plus anciennes du pôle ; trancher `restrict` ou `no action` avant tout geste de suppression de compte ; rassembler les helpers de date copiés dans le pôle.

## 2026-09-19 (module Objectifs : interface)

Type : produit

Résumé : troisième checkpoint du **module Objectifs**. `PersonalGoalsPanel.tsx`, sur le patron de Tâches : création, mise à jour de la valeur actuelle, modification complète, statut déclaré, archivage et restauration. L'onglet Objectifs sort de `tabCards` — **cinq des onze onglets** du pôle portent désormais de la donnée saisie. Aucun changement serveur ni base.

**Décisions portées par ce commit** :

- **la virgule décimale est acceptée et normalisée** avant l'envoi, un clavier français en produisant une ; le refus au-delà de trois décimales reste celui du parser ;
- **la mise à jour de la valeur actuelle passe par un champ dédié**, séparé de l'édition complète — le geste répété du module, comme cocher une tâche ;
- **le statut ne se déduit jamais à l'écran** : cible atteinte et statut « actif » peuvent coexister, l'écran le signale et propose de déclarer l'atteinte sans le faire à la place ;
- **une seule liste**, dans l'ordre du serveur, les objectifs atteints y restant avec un badge — pas de section séparée ;
- **aucune suppression définitive** dans la carte Archives : `personal_goals` n'accorde de toute façon ni `DELETE` ni policy, et le geste viendra au checkpoint 4 ;
- **les quatre points du branchement d'onglet bougent ensemble** : cartes retirées de `tabCards`, identifiant sorti du `Exclude<…>`, `sourceForActiveTab` mis à jour, branche générique exclue.

**Trois helpers sont copiés de `PersonalTasksPanel.tsx`** — `formatDueOn`, `formatArchivedAt`, `todayInParis` —, à l'identique. Troisième duplication du genre dans le pôle, avec `formatJournalTimestamp` : les rassembler mérite un commit dédié, pas un passage clandestin dans celui-ci.

Fichiers liés :

- `app/interface/personnel/PersonalGoalsPanel.tsx` (nouveau)
- `app/interface/personnel/PersonalDashboardClient.tsx`
- `lib/personal/goals.ts` (message d'erreur de `parseGoalValue`, neutre en genre pour un appel depuis l'interface)
- `knowledge/Documentation-Technique-Code/05_Database.md`, `06_Modules.md`

Impact : les objectifs sont visibles et modifiables à l'écran. **Aucun test de bout en bout** n'a encore été mené sur ce module.

> ⚠️ **« Aucun test de bout en bout n'a encore été mené » est dépassé depuis le 2026-09-19.** Le test de bout en bout de cette interface a été mené par pilotage navigateur humain sur `test-erase@edificeia.com`, et validé : affichage des trois cas de progression, création avec virgule décimale normalisée, refus propre à quatre décimales, mise à jour de la valeur actuelle sans effet de bord, cycle d'archivage et de restauration préservant les données. **Date établie par la base** : « [TEST] Virgule », créé pendant ce test, portait `created_at` au 2026-09-19 à 11:44 UTC, relevé en base avant sa suppression. Les autres étapes n'ont pas d'horodatage propre. Voir l'entrée « module Objectifs : suppression physique » pour les deux gestes de suppression, testés le même jour.

Action de suivi :

- **test de bout en bout par pilotage navigateur humain** — validé le 2026-09-19 —, sur `test-erase@edificeia.com`, avec les trois objectifs `[TEST]` du checkpoint précédent — Épargne (montant, atteint), Poids (descendant, en recul), Lectures (à zéro) — plus une création avec une valeur à virgule, un refus à quatre décimales, une mise à jour de valeur, un archivage puis une restauration ;
- checkpoint 4 : `goals` dans `ERASABLE_MODULES` et `MODULE_TABLES`, plus la suppression définitive d'un objectif archivé — fait le 2026-09-19, voir l'entrée « module Objectifs : suppression physique » ;
- nettoyage possible, hors de ce commit : rassembler `formatDueOn`, `formatArchivedAt`, `todayInParis` et `formatJournalTimestamp`, chacun copié entre deux à quatre fichiers du pôle.

## 2026-09-18 (module Objectifs : store et API)

Type : produit, sécurité

Résumé : deuxième checkpoint du **module Objectifs**, écrit le même jour que l'application de sa table. Validation, store et trois routes ; **aucune interface**, l'onglet Objectifs rendant toujours ses cartes statiques. Aucun changement de base.

**Décisions portées par ce commit** :

- **le parser refuse plus de trois décimales** — `numeric(15,3)` arrondirait sans le dire, et la valeur affichée ne serait pas celle saisie. Arrondir côté application reproduirait le défaut dont ce code protège ;
- **la progression n'est ni stockée ni renvoyée par l'API** : `goalProgress` est une fonction pure de `lib/personal/goals.ts`, que l'interface appellera. Une seule implémentation, l'inverse de `retainedObjectiveProgress` de Trajectoire, écrite en double ;
- **`percent` est arrondi vers le bas** et borné à 0-100, et un `state` nommé — `behind`, `inProgress`, `reached`, `exceeded` — distingue ce qu'un pourcentage seul confond ;
- **« cible ≠ départ » est vérifiée des deux côtés** : par le parser quand les deux valeurs sont envoyées, par la base sinon, le `23514` étant traduit en `400` au lieu d'une `500` ;
- **`DELETE` archive**, et `POST /[id]/restore` restaure, comme les quatre autres modules du pôle ;
- **le statut ne change jamais tout seul** ; les valeurs transitent en nombres JSON, converties par `Number()` à la lecture.

**Le garde DEC-007 est posé dès l'écriture**, sur les cinq handlers. Les routes valident le format UUID : `404` pour un identifiant malformé, jamais un `22P02` remonté en `500`.

Fichiers liés :

- `lib/personal/goals.ts`, `lib/server/personal/goals-store.ts` (nouveaux)
- `app/api/personal/goals/route.ts`, `app/api/personal/goals/[id]/route.ts`, `app/api/personal/goals/[id]/restore/route.ts` (nouveaux)
- `knowledge/Documentation-Technique-Code/05_Database.md`, `06_Modules.md`

Impact : les objectifs deviennent créables, modifiables, archivables et restaurables **par l'API**. Rien n'est visible à l'écran : aucun appel n'est encore émis par l'interface.

Action de suivi :

- checkpoint 3 : l'interface, `PersonalGoalsPanel.tsx`, avec l'archivage et la restauration ; l'onglet sort alors de `tabCards`, en changeant les quatre points ensemble — fait le 2026-09-19, voir l'entrée « module Objectifs : interface » ;
- checkpoint 4 : `goals` dans `ERASABLE_MODULES` et `MODULE_TABLES`, plus la suppression définitive d'un objectif archivé — fait le 2026-09-19, voir l'entrée « module Objectifs : suppression physique » ;
- **aucun test de bout en bout** n'a encore été mené sur ce module : le premier viendra avec l'interface.

> ⚠️ **La dernière ligne de cette liste est dépassée depuis le 2026-09-19.** Le premier test de bout en bout, celui de l'interface, a eu lieu ce jour-là et a exercé à travers l'écran la création, la lecture, la mise à jour, l'archivage et la restauration de cette entrée — voir « module Objectifs : interface ». Les deux gestes de suppression physique ont été testés de bout en bout le même jour — voir « module Objectifs : suppression physique ».

## 2026-09-18 (module Objectifs : migration)

Type : produit, base de données, sécurité

Résumé : premier checkpoint du **module Objectifs**, cinquième module à saisie manuelle du pôle Personnel. Ajout de la table `personal_goals`. Migration **écrite le 2026-09-17** — c'est l'horodatage de son nom, `20260917100000` —, **committée et appliquée le 2026-09-18**, dans cet ordre inverse de l'habitude : elle a été appliquée avant d'être committée, le commit ayant attendu la validation humaine. Ni store, ni route, ni interface : aucun code du dépôt ne référence encore la table.

**Contrôles post-application validés le 2026-09-18**, selon l'entrée `MANUAL_ACTIONS.md` du 2026-09-17, désormais archivée : RLS active ; grants exacts, lus par `aclexplode` — `INSERT`, `SELECT`, `UPDATE` pour `authenticated` seul, rien pour `anon` ni `PUBLIC`, aucun `DELETE` ni `MAINTAIN` ; trois policies alignées ; six contraintes présentes ; quatre tests de comportement conformes, dont **l'arrondi silencieux constaté — `80.12345` enregistré en `80.123`** ; aucun résidu.

**Module autonome, sur le patron de Tâches** : une seule table, une ligne par objectif, aucune dépendante. Il n'est relié ni à Trajectoire, ni au « moteur Objectifs » de `20-catalogue-services.md` : pas de généralisation anticipée, même raisonnement que DEC-013.

**Champs** : intitulé ; valeur de départ, actuelle et cible, en `numeric(15,3)` ; unité libre (`unit_label`, sur le modèle de `context_label`) ; échéance facultative (`due_on`, un jour) ; statut ; `deleted_at` pour l'archivage.

**Décisions portées par cette migration** :

- **la progression n'est pas stockée** : `(actuelle − départ) / (cible − départ)`, calculée à la lecture. Une seule formule couvre l'objectif qui monte et celui qui descend ; **le sens n'est pas stocké non plus**, il se déduit du signe de `cible − départ` ;
- **la cible doit différer du départ**, contrainte en base : la formule diviserait sinon par zéro ;
- **`start_value not null default 0`**, et non nullable : « absente » et « 0 » seraient deux écritures du même état. Conséquence connue : un objectif de poids créé sans départ se lit comme un objectif qui monte ;
- **deux statuts, `active` et `achieved`**, déclarés par l'utilisateur et jamais recalculés. Pas de `abandoned` : renoncer, c'est archiver ;
- **`numeric(15,3)`** : exact, borné sous 1e12 par le type, qui refuse un dépassement en `22003`. **Au-delà de trois décimales, Postgres arrondit sans erreur** : le parser du checkpoint 2 devra le refuser ;
- **aucun historique des valeurs** : une courbe demanderait une table dépendante.

**Droits** : `revoke all … from anon, authenticated` avant le `grant` de `SELECT`, `INSERT`, `UPDATE` à `authenticated`. **Aucun `DELETE`**, ni en privilège ni en policy : la suppression physique passera par la clé service-role au checkpoint 4. Trois policies scopées au propriétaire.

**Écart au plan, signalé** : le plan prévoyait une contrainte `abs(valeur) < 1e12`. Elle n'est pas écrite : `numeric(15,3)` ne peut pas représenter de valeur de 1e12 ou plus, la contrainte n'aurait jamais pu échouer.

Fichiers liés :

- `supabase/migrations/20260917100000_create_personal_goals.sql` (nouveau)
- `MANUAL_ACTIONS.md`
- `knowledge/Documentation-Technique-Code/05_Database.md`, `06_Modules.md`

Impact : la table existe en base, et rien ne la lit encore. `05_Database.md` décrit son schéma et ses droits ; `06_Modules.md` ouvre une section Objectifs qui dit l'état réel — table seule, l'onglet rendant toujours ses cartes statiques.

Action de suivi :

- checkpoint 2 : `lib/personal/goals.ts`, store et routes, `authorizeCockpitApiAccess()` sur chaque handler dès l'écriture — fait le 2026-09-18, voir l'entrée « module Objectifs : store et API ».

## 2026-09-16 (réassignation depuis l'écran de blocage des catégories de Journal)

Type : produit, documentation

Résumé : quatrième et dernier checkpoint du chantier des catégories de Journal, **interface seule**, sans changement serveur. L'écran de refus d'une suppression de catégorie n'est plus en lecture seule : chaque entrée qui n'a que cette catégorie peut en recevoir d'autres, puis la suppression peut être réessayée. **L'interface du chantier est complète.**

**Décisions portées par ce commit** :

- **le sélecteur des entrées est déplacé dans `JournalCategoryControls.tsx`**, pour être partagé sans cycle d'import ; il gagne un paramètre `emptySelectionNote`, que la réassignation met à `null` ;
- **« Attribuer » ajoute les catégories cochées à celle qu'on veut supprimer**, sans la retirer : fermer sans réessayer ne fait rien perdre ;
- **course acceptée** : le `PUT` remplace l'ensemble, et écraserait une catégorie ajoutée par une autre session entre le refus et l'attribution ;
- **« Réessayer la suppression » n'apparaît qu'une fois toutes les entrées réassignées**, et envoie le `DELETE` sans seconde confirmation ; un nouveau `409` remplace la liste ;
- **laisser une entrée sans catégorie n'est pas proposé** ;
- **attribution entrée par entrée**, sans raccourci « attribuer à toutes ».

Fichiers liés :

- `app/interface/personnel/JournalCategoryControls.tsx` (nouveau)
- `app/interface/personnel/PersonalJournalCategoriesPanel.tsx`
- `app/interface/personnel/PersonalJournalPanel.tsx`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `11_Changelog.md`

Impact : une catégorie portée seule par des entrées, archivées comprises, peut désormais être supprimée depuis l'écran, sans jamais laisser une entrée perdre sa dernière catégorie en silence. Une entrée archivée peut être reclassée, par ce seul chemin. Aucun changement serveur, aucune migration.

Action de suivi :

- **test de bout en bout par pilotage navigateur humain** — validé le 2026-09-17 —, sur `test-erase@edificeia.com`, en supprimant « [TEST] Beta renommée ». Le plan n'attendait qu'une entrée bloquante, l'entrée archivée E1 ; **le refus en a listé deux** : E1, et une seconde entrée, probablement issue des tests de « sélecteur et affichage des catégories de Journal » — hypothèse non vérifiée en base. Résultat constaté : refus initial avec ces deux entrées, réassignation réussie sur les deux, suppression finale réussie avec le compte exact renvoyé par le serveur. **Ce test a consommé le cas de refus** ;
- nettoyage possible, hors de ce commit : `formatJournalTimestamp` reste copié dans `PersonalJournalPanel.tsx` et `PersonalJournalCategoriesPanel.tsx`, et pourrait rejoindre `JournalCategoryControls.tsx`, qui supprime la raison de la copie ;
- restent ouvertes, sans changement : trancher `restrict` ou `no action` avant tout geste de suppression de compte — voir l'entrée « clés étrangères composites » — et valider le format des identifiants dans les routes plus anciennes du pôle — voir l'entrée « socle serveur » ; **fait le 2026-09-20 pour les quatre routes `/permanent`**, voir l'entrée « validation UUID des routes /permanent », les autres restant à reprendre.

## 2026-09-16 (sélecteur et affichage des catégories de Journal)

Type : produit, documentation

Résumé : troisième checkpoint du chantier des catégories de Journal, **interface seule**, sans changement serveur. Un sélecteur de catégories à la création et à la modification d'une entrée, l'affichage des catégories sur les entrées actives et archivées, et le `cascadeLabel` de Journal dans « Vider l'historique ». **C'est le premier écran qui crée des liaisons.**

**Décisions portées par ce commit** :

- **les catégories sont chargées une fois, par `PersonalJournalPanel`**, et partagées avec la carte de gestion, qui ne les charge plus elle-même ;
- **deux écritures, l'entrée puis ses catégories**. À la création, un échec de la seconde garde l'entrée et vide le formulaire, pour ne pas inviter à la recréer en double ; à la modification, il laisse l'édition ouverte ;
- **un identifiant de catégorie absent de la liste chargée n'est pas affiché**, sans message ; un échec de chargement de la liste, lui, est signalé ;
- **`cascadeLabel` de Journal : « attributions de catégories »** ;
- **l'avertissement de « Vider l'historique » devient neutre sur le volume** : « et elles sont bien plus nombreuses », jusqu'ici écrit en dur dans `SettingsPersonalPanel.tsx` et donc appliqué à tout module ayant un `cascadeLabel`, devient le champ `cascadeVolumeNote`, renseigné pour Habitudes seul ;
- **nouveau champ `cascadeSurvivalNote`, renseigné pour Journal seul** : « Les catégories elles-mêmes sont conservées. », à la confirmation de « Vider l'historique ». La même précision figure dans la confirmation de suppression définitive d'une entrée archivée.

**Constat inscrit en commentaire** : `cascadeLabel` doit être un **nom féminin pluriel**, les phrases de l'écran l'accordant ainsi — « toutes les … associées », « elles sont supprimées ». Vrai pour les deux libellés actuels ; un futur libellé masculin produirait une phrase fausse.

Fichiers liés :

- `app/interface/personnel/PersonalJournalPanel.tsx`
- `app/interface/personnel/PersonalJournalCategoriesPanel.tsx`
- `lib/personal/data-erasure.ts`
- `app/interface/settings/SettingsPersonalPanel.tsx`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `11_Changelog.md`

Impact : les entrées de journal peuvent être classées. Les liaisons créées sont nommées à la confirmation et chiffrées au résultat de « Vider l'historique », comme DEC-012 l'exige. Aucun changement serveur, aucune migration.

Action de suivi :

- **test de bout en bout par pilotage navigateur humain** — validé le 2026-09-16 —, sur `test-erase@edificeia.com` : créer une entrée avec deux catégories, puis une sans ; en modifier une ; voir les étiquettes sur une entrée archivée ; renommer une catégorie et voir le nouveau nom sur les entrées ; lire les libellés de Journal dans « Vider l'historique » **sans valider le vidage**, qui supprimerait l'entrée archivée E1, cas de refus dont l'écran de réassignation aura besoin ;
- l'écran suivant : la réassignation depuis l'écran de blocage — faite le 2026-09-16, voir l'entrée « réassignation depuis l'écran de blocage des catégories de Journal ».

## 2026-09-16 (écran de gestion des catégories de Journal)

Type : produit, documentation

Résumé : deuxième checkpoint du chantier des catégories de Journal, **interface seule**, sans changement serveur. Une carte de gestion — créer, renommer, supprimer — ouverte par un bouton « Gérer les catégories » en tête de l'onglet Journal. Elle consomme les routes du socle serveur du 2026-09-15.

**Décisions portées par ce commit** :

- **le bouton est en tête de l'onglet**, avant « Nouvelle entrée », et non à côté de « Voir les archives » ;
- **tout se fait sur place**, sans fenêtre modale ;
- **le compte de la confirmation est présenté comme datant du dernier chargement**, et le message de fin reprend le compte **renvoyé par le serveur** ;
- **un refus `409 CATEGORY_IN_USE` affiche les entrées bloquantes en lecture seule**, en disant que la réassignation n'est pas encore construite ;
- **la carte charge ses catégories elle-même**, à l'ouverture ; ce chargement remontera dans `PersonalJournalPanel` quand le sélecteur en aura besoin ;
- **après chaque écriture, la liste est rechargée** depuis le serveur, qui calcule les comptes.

Fichiers liés :

- `app/interface/personnel/PersonalJournalCategoriesPanel.tsx` (nouveau)
- `app/interface/personnel/PersonalJournalPanel.tsx`
- `knowledge/Documentation-Technique-Code/06_Modules.md`, `11_Changelog.md`

Impact : les catégories deviennent gérables à l'écran. **Aucune liaison ne peut encore être créée depuis l'interface** : le sélecteur sur une entrée n'existe pas. Le `cascadeLabel` de Journal n'est donc toujours pas nécessaire.

> ⚠️ **Dépassé depuis le 2026-09-16, jour même de cette entrée** : le sélecteur sur une entrée crée des liaisons depuis l'interface, et Journal a son `cascadeLabel`. Le chargement des catégories est aussi remonté dans `PersonalJournalPanel`, comme l'annonçait la cinquième décision. Voir l'entrée « sélecteur et affichage des catégories de Journal ». La quatrième décision est dépassée le même jour : le refus `409 CATEGORY_IN_USE` n'est plus en lecture seule et permet de réassigner les entrées bloquantes — voir l'entrée « réassignation depuis l'écran de blocage des catégories de Journal ».

Action de suivi :

- **test de bout en bout par pilotage navigateur humain** — validé le 2026-09-16 —, sur `test-erase@edificeia.com`. Le compte porte déjà le cas de refus : « [TEST] Beta renommée » est la seule catégorie de l'entrée E1, archivée, donc sa suppression doit être refusée ;
- les deux écrans suivants : sélecteur et affichage des catégories sur les entrées, avec le `cascadeLabel` de Journal — faits le 2026-09-16, voir l'entrée « sélecteur et affichage des catégories de Journal » —, puis la réassignation depuis l'écran de blocage — faite le 2026-09-16, voir l'entrée « réassignation depuis l'écran de blocage des catégories de Journal ».

## 2026-09-15 (socle serveur des catégories de Journal)

Type : produit, sécurité, architecture, documentation

Résumé : store et routes des **catégories de Journal**, sans aucune interface. C'est le premier des quatre checkpoints du chantier ; l'écran de gestion, le sélecteur et l'écran de blocage suivront. Toutes les routes passent par `authorizeCockpitApiAccess()` dès leur écriture.

**Contrat.** `GET` et `POST /api/personal/journal/categories` ; `PATCH` et `DELETE /api/personal/journal/categories/[id]` ; `PUT /api/personal/journal/[id]/categories`, qui remplace l'ensemble des catégories d'une entrée. Les entrées de journal, actives comme archivées, portent désormais `categoryIds`.

**Décisions portées par ce commit** :

- les catégories d'une entrée s'écrivent par une **route à part**, jamais avec la création de l'entrée : les deux écritures ne peuvent pas être atomiques, et un échec sur les liaisons ferait recréer l'entrée en double au nouvel essai ;
- la **règle de blocage compte les entrées archivées**, et le compte par catégorie les inclut en le disant (`entryCount`, dont `archivedEntryCount`) ;
- la **suppression est séquentielle**, pas atomique : la clé composite en `restrict` sert de filet, et un `23503` tardif devient un `409`, jamais une `500` ;
- les nouvelles routes **valident le format UUID** avant Postgres ; les routes plus anciennes du pôle ne le font pas.

> ⚠️ **La fin de cette ligne est en partie dépassée depuis le 2026-09-20** : les quatre routes `/permanent` de Notes, Journal, Habitudes et Tâches valident désormais le format UUID — voir l'entrée « validation UUID des routes /permanent ». Les autres routes plus anciennes ne le font toujours pas.

Supprimer une catégorie est une suppression physique, hors de `data-erasure-store.ts` : ce fichier porte les gestes d'effacement de contenu, et une étiquette n'en est pas.

Fichiers liés :

- `lib/personal/journal-categories.ts`, `lib/server/personal/journal-categories-store.ts` (nouveaux)
- `app/api/personal/journal/categories/route.ts`, `app/api/personal/journal/categories/[id]/route.ts`, `app/api/personal/journal/[id]/categories/route.ts` (nouveaux)
- `lib/personal/journal.ts`, `lib/server/personal/journal-store.ts`
- `knowledge/Documentation-Technique-Code/05_Database.md`, `06_Modules.md`, `11_Changelog.md`

Impact : aucun à l'écran. Les liaisons deviennent possibles par l'API, et seulement entre une entrée et une catégorie du même compte, la clé composite l'imposant en base.

Action de suivi :

- les écrans du chantier, dans l'ordre : gestion des catégories — faite le 2026-09-16, voir l'entrée « écran de gestion des catégories de Journal » —, puis sélecteur et affichage avec le `cascadeLabel` de Journal — faits le 2026-09-16, voir l'entrée « sélecteur et affichage des catégories de Journal » —, puis écran de blocage et de réassignation — fait le 2026-09-16, voir l'entrée « réassignation depuis l'écran de blocage des catégories de Journal » ;
- valider le format des identifiants dans les routes plus anciennes du pôle, qui laissent un identifiant malformé finir en `500` — fait le 2026-09-20 pour les quatre routes `/permanent`, voir l'entrée « validation UUID des routes /permanent » ; reste ouvert pour les autres.

## 2026-09-15 (clés étrangères composites sur la liaison des catégories de Journal)

Type : sécurité, base de données

Résumé : correctif d'une **faille d'isolation entre comptes** dans `personal_journal_entry_categories`, découverte en cadrant l'interface des catégories, avant qu'aucune liaison n'existe. **Migration écrite le 2026-09-14** — c'est l'horodatage de son nom, `20260914100000` —, committée le 2026-09-15, et **pas encore appliquée en base**.

> ⚠️ **« Pas encore appliquée en base » est dépassé depuis le 2026-09-15, jour même de cette entrée.** La migration a été appliquée et vérifiée en suivant l'entrée `MANUAL_ACTIONS.md` du 2026-09-14 : noms des clés conformes avant application, deux clés composites à deux colonnes après, règles `restrict` et `cascade` inchangées, cibles `unique (id, user_id)` présentes, test de comportement concluant — A accepté, B et C refusés en `23503` —, aucun résidu. **La faille est fermée en base.** Les deux premières actions de suivi ci-dessous sont faites, `05_Database.md` ayant été corrigé à l'application.

**La faille.** Les deux clés étrangères posées par `20260909110000` étaient simples : `entry_id` vers `personal_journal_entries(id)`, `category_id` vers `personal_journal_categories(id)`. Or Postgres vérifie une clé étrangère **sans appliquer RLS**. La policy `insert` de la liaison ne contrôlait que `user_id = auth.uid()`, jamais le propriétaire de l'entrée ni de la catégorie référencées. Un compte authentifié pouvait donc, par un appel direct à l'API, lier sa propre entrée à la catégorie d'un autre compte — à condition d'en connaître l'UUID, que RLS l'empêche de lire. Le `on delete restrict` aurait alors bloqué le propriétaire légitime au moment de supprimer **sa** catégorie, et son contrôle applicatif, qui passe par RLS, n'aurait pas vu ce lien : l'application aurait conclu que rien ne bloquait, la base aurait refusé, et le geste aurait fini en `500`.

**Rien n'a été exploité** : la table de liaison compte **0 ligne** au 2026-09-15, mesuré en base au moment de cette entrée. Aucune route ni aucun écran ne crée encore de liaison.

> ⚠️ **« Aucune route ni aucun écran ne crée encore de liaison » est dépassé depuis le 2026-09-15, jour même de cette entrée.** Le socle serveur des catégories — voir l'entrée « socle serveur des catégories de Journal » du même jour — expose `PUT /api/personal/journal/[id]/categories`, qui crée des liaisons, et son test de contrat en a créé sur le compte de test. La mesure « 0 ligne » reste exacte à son heure : la faille était fermée en base avant qu'aucune liaison n'existe. Aucun écran n'en créait encore ; le sélecteur sur une entrée en crée depuis le 2026-09-16 — voir l'entrée « sélecteur et affichage des catégories de Journal ».

**Le correctif**, repris d'Habitudes (`personal_habit_completions_habit_fk`) : `unique (id, user_id)` sur les deux tables parentes, et deux clés **composites** qui remplacent les simples — `(entry_id, user_id)` vers `personal_journal_entries (id, user_id)`, `(category_id, user_id)` vers `personal_journal_categories (id, user_id)`. Une liaison ne peut plus référencer qu'une entrée et une catégorie du même compte qu'elle, et la policy `insert` impose déjà que ce compte soit l'appelant. Retrait et ajout tiennent dans une transaction : il n'existe aucun instant où la liaison serait sans clé étrangère.

**Ce qui ne change pas** : les règles de suppression — `restrict` vers les catégories, moitié structurelle de la règle de blocage, et `cascade` vers les entrées. Ni grant, ni policy, ni RLS ne sont touchés.

**Effet de bord** : la « limite assumée » documentée dans `20260909110000` — rien en base ne garantissait que le `user_id` de la liaison égale celui de l'entrée et celui de la catégorie — est levée par les clés composites, sans trigger.

Fichiers liés :

- `supabase/migrations/20260914100000_journal_categories_composite_fk.sql` (nouveau)
- `MANUAL_ACTIONS.md` (entrée du 2026-09-14)

Impact : **aucun tant que la migration n'est pas appliquée** — la faille reste ouverte en base jusque-là. Une fois appliquée, une liaison inter-comptes est refusée en `23503`, ce que le contrôle de comportement de l'entrée `MANUAL_ACTIONS.md` vérifie sur trois cas, dont un témoin qui doit passer.

Action de suivi :

- **Appliquer la migration** dans le SQL Editor, en suivant l'entrée `MANUAL_ACTIONS.md` du 2026-09-14. Son contrôle préalable est bloquant : la migration retire les clés simples par leur **nom par défaut**, et un nom différent les laisserait en place, faille ouverte, sans erreur.
- À l'application, corriger `05_Database.md`, qui affirme encore qu'« aucune clé étrangère composite n'en garantit la cohérence avec les deux parents ».
- Le commentaire de `20260909110000` qui décrit la limite assumée restera tel quel : la migration est appliquée, la modifier désalignerait le fichier du dépôt de ce qui a tourné en base.
- **Point ouvert, non bloquant : `restrict` face à une future suppression de compte.** Supprimer un compte dans `auth.users` déclenche plusieurs cascades dans une même instruction — vers ses catégories, ses entrées et ses liaisons. `on delete restrict` vérifie immédiatement, sans attendre la fin de l'instruction : si la cascade des catégories passait avant celles qui effacent les liaisons, la suppression du compte **pourrait échouer**. L'ordre dépend du nom interne des triggers et n'est pas garanti. **Non vérifié** : aucun compte n'a encore été supprimé en portant des liaisons. `on delete no action` offrirait la même garantie à l'application, avec une vérification en fin d'instruction. Non bloquant tant que le geste « supprimer le compte » n'existe pas dans le dépôt ; **à trancher avant de l'écrire**.

## 2026-09-09 (catégories de Journal, et DEC-013 passée en actif)

Type : base de données, sécurité, architecture, documentation

Résumé : pose du socle des **catégories de Journal**, créées par l'utilisateur, et passage de **DEC-013 en `actif`** (`3b36515`). Deux migrations : `personal_journal_categories`, et la table de liaison `personal_journal_entry_categories` — une entrée peut porter plusieurs catégories, relation N-N, donc table de liaison explicite. Périmètre Journal uniquement : aucune abstraction commune pour Notes ou Tâches.

**Deux écarts délibérés au patron du pôle.** Pas de `deleted_at` sur les catégories : une étiquette n'est pas du contenu, sa suppression est physique, et la protection contre la perte est la règle de blocage plutôt qu'une corbeille. Et `DELETE` accordé à `authenticated` sur les deux tables, sous policies scopées au propriétaire — ce qui porte à **trois** les tables du pôle dans ce cas, avec `personal_habit_completions`.

**La règle « bloqué si seule catégorie restante » a deux moitiés, et une seule existe.** La moitié structurelle est posée : la clé étrangère de la liaison vers les catégories est en `on delete restrict`. La moitié applicative — la requête qui repère les entrées mono-catégorie et répond `409` — viendra avec le store. L'unicité des noms par utilisateur, insensible à la casse et aux blancs de bord, est portée par un index unique sur `(user_id, lower(btrim(name)))`.

**Révocation explicite avant tout grant**, bien que `pg_default_acl` ait été vérifié propre avant l'écriture : ce qui a manqué au chantier 6 n'était pas le défaut, c'était la discipline.

**DEC-013 passe de `proposé` à `actif`.** Journal est le deuxième module effaçable à porter une table dépendante, après Habitudes, et le critère de sortie a été vérifié point par point plutôt que déclaré rempli : `user_id` dénormalisé sur la dépendante, un seul niveau de dépendance, un `parentKey` unique suffisant. La suppression explicite des dépendantes avant la principale devient une règle du dépôt, avec un corollaire : toute nouvelle table dépendante doit porter `user_id`.

**Le store d'effacement déclare la nouvelle dépendante** : `MODULE_TABLES.journal.dependents` porte `personal_journal_entry_categories`, avec `parentKey: "entry_id"`. Effets sur Journal, pour les deux gestes :

- les liaisons sont supprimées **explicitement**, avant les entrées ;
- « Vider l'historique » écrit désormais **deux** entrées dans `personal_data_erasure_log`, une par table vidée, au lieu d'une ;
- la suppression d'une entrée archivée fait la **vérification d'éligibilité préalable**, jusque-là réservée à Habitudes, et son `related_deleted_count` compte désormais les liaisons emportées ;
- les catégories elles-mêmes **survivent** à un « Vider l'historique » du Journal : ce sont des tables sœurs, pas des dépendantes.

Fichiers liés :

- `supabase/migrations/20260909100000_create_personal_journal_categories.sql`, `supabase/migrations/20260909110000_create_personal_journal_entry_categories.sql` (nouveaux)
- `lib/server/personal/data-erasure-store.ts`
- `knowledge/Documentation-Technique-Code/03_Decisions.md`, `06_Modules.md`
- `MANUAL_ACTIONS.md`

Impact : déclarée **avant** que la table n'existe, la dépendante imposait d'appliquer les migrations avant de pousser — sans quoi les deux gestes de suppression de Journal échouaient en `500`, erreur `PGRST205` vérifiée. Migrations appliquées le **2026-09-10**, avant tout push, contrôles post-application validés ; les appels du store sur la liaison ont ensuite été rejoués en base, sans erreur. Dix catégories amorcées le même jour sur `contact.edificeia@gmail.com`, par une action ponctuelle de `MANUAL_ACTIONS.md` et non par un mécanisme de seed. `05_Database.md` a été aligné le 2026-09-10, dans `ff87d18`.

Action de suivi :

- **Défaut introduit par ce commit, corrigé le 2026-09-14, avant tout push.** L'écran de résultat de « Vider l'historique » (`SettingsPersonalPanel.tsx`) écrivait en dur le mot « réalisation » dès que `relatedDeletedCount` était défini — ce qu'il est désormais pour Journal, qui aurait affiché « et 0 réalisation ». Établi par lecture du code, jamais observé à l'écran. Le libellé vient maintenant du `cascadeLabel` du module, sous la forme « — réalisations : 8 », et rien n'est affiché sans lui.
- **Reste ouvert, différé à l'interface des catégories** : `ERASABLE_MODULES` ne donne à Journal aucun `cascadeLabel`. Sans lui, les liaisons emportées ne sont ni nommées à la confirmation ni chiffrées au résultat, ce que DEC-012 exige de tout volume que le compte affiché n'inclut pas. Sans conséquence tant qu'aucun écran ne crée de liaison ; cette interface devra l'ajouter.
- Le store, les routes et la moitié applicative de la règle de blocage sont écrits le 2026-09-15 — voir l'entrée « socle serveur des catégories de Journal ». L'interface ne l'est pas : ni sélecteur sur une entrée, ni écran de gestion.

> ⚠️ **Les deux derniers points de cette liste sont dépassés depuis le 2026-09-16.** Journal a son `cascadeLabel`, « attributions de catégories » : les liaisons emportées sont nommées à la confirmation et chiffrées au résultat. L'interface existe : écran de gestion, sélecteur et affichage sur les entrées. Voir les entrées « écran de gestion des catégories de Journal » et « sélecteur et affichage des catégories de Journal ».

Entrée rédigée le 2026-09-14 : un changement structurant appelle une entrée dans le commit même, et elle avait été omise dans `3b36515`.

## 2026-09-05 (suppression définitive d'une tâche archivée)

Type : produit, sécurité, documentation

Résumé : Tâches reçoit le **troisième geste canonique**, la suppression physique d'un élément archivé, déjà en place sur Notes, Journal et Habitudes depuis le 2026-08-18. Nouvelle route `DELETE /api/personal/tasks/[id]/permanent`, gardée par `authorizeCockpitApiAccess()` **dès son écriture** et non en correctif après coup. Bouton « Supprimer définitivement » à côté de « Restaurer » dans la carte Archives, avec confirmation binaire et aperçu de l'intitulé tronqué à 80 caractères par `erasurePreview`.

**Aucune fonction de store n'a été écrite.** `permanentlyDeletePersonalItem` est générique sur `ErasableModuleId`, où Tâches est déclaré depuis l'entrée du 2026-09-03 : elle filtre déjà sur `id` + `user_id` + `deleted_at is not null` et renvoie `null` — donc `404` uniforme — dans les trois cas d'inéligibilité. Écrire une fonction propre à Tâches aurait rompu l'invariant tenu depuis le 2026-08-13, un seul fichier du dépôt supprimant physiquement des données Personnel. `related_deleted_count` vaut 0, `personal_tasks` n'ayant pas de table dépendante.

Corrigé au passage : quatre affirmations « trois modules » devenues fausses, dont deux qui auraient dû tomber avec l'entrée du 2026-09-03, et la ligne de `06_Modules.md` qui annonçait la suppression par élément comme « une absence assumée et signalée dans le code ».

Fichiers liés :

- `app/api/personal/tasks/[id]/permanent/route.ts` (nouveau)
- `app/interface/personnel/PersonalTasksPanel.tsx`
- `knowledge/Documentation-Technique-Code/03_Decisions.md`, `06_Modules.md`, `11_Changelog.md`

Impact : une tâche archivée peut être détruite individuellement depuis sa carte Archives. **Le troisième geste canonique couvre désormais tout le pôle Personnel** — plus aucun module à saisie manuelle n'y fait exception. Aucune migration, aucune policy nouvelle, aucun changement de contrat sur les routes existantes. Clôt l'action de suivi ouverte par l'entrée du 2026-09-03.

**Code écrit le 2026-09-05, test de bout en bout validé le 2026-09-09** — deux dates distinctes, laissées lisibles séparément comme pour le chantier 6 du suivi. Validé par pilotage navigateur humain sur `test-erase@edificeia.com`, avec un jeu de trois tâches préfixées `[TEST]` créé le 2026-09-05 : troncature de l'aperçu à 80 caractères suivie de `…` vérifiée visuellement sur un intitulé de 151 caractères, disparition de la ligne confirmée en base, et entrée `personal_item_erasure_log` cohérente — `related_deleted_count` à 0 et `item_id` correct.

Action de suivi : aucune.

## 2026-09-03 (Tâches dans « Vider l'historique », et correction de dates)

Type : produit, documentation

Résumé : le module **Tâches** entre dans le geste « Vider l'historique », quatrième module couvert par la seule suppression physique du dépôt. Extension conforme à ce que DEC-012 annonçait : deux entrées ajoutées, une dans `ERASABLE_MODULES` et une dans `MODULE_TABLES`, sans toucher ni à la route, ni au validateur, ni à l'écran. `personal_tasks` étant une table unique, `dependents` reste vide.

Corrigé au passage : **cinq dates fausses** dans la documentation déjà poussée, qui attribuaient au 2026-08-24 un travail réalisé le 2026-08-30 — module Tâches hors migration, et correctif de privilèges du chantier 6. L'erreur venait de l'horodatage de nom des migrations `20260824110000` et `20260824120000`, repris comme date d'application alors qu'il porte le jour de la découverte. Ces noms de fichiers ne sont pas renommés : les migrations sont appliquées en base, et l'écart est désormais signalé à l'endroit où il induisait en erreur.

Fichiers liés :

- `lib/personal/data-erasure.ts`, `lib/server/personal/data-erasure-store.ts`
- `knowledge/Documentation-Technique-Code/03_Decisions.md`, `05_Database.md`, `06_Modules.md`, `11_Changelog.md`
- `suivi-chantiers-edifice.md`

Impact : vider l'historique de Tâches devient possible depuis Réglages > Personnel, avec le même mot de confirmation et le même écran que les trois autres modules. Aucun changement de contrat de route, aucune migration.

Action de suivi : la suppression définitive **par élément** ne couvre pas encore Tâches — la route `DELETE /api/personal/tasks/[id]/permanent` n'existe pas.

## 2026-08-30 (module Tâches, et privilèges hérités du défaut de schéma)

Type : produit, sécurité, base de données, documentation  
Résumé : ajout du **module Tâches**, quatrième module à saisie manuelle du pôle Personnel. Ajout de la table `personal_tasks`. Et, découvert en vérifiant cette migration, correction d'un **défaut de privilèges présent depuis le 2026-08-04** sur les cinq tables du pôle.

Fichiers liés :

- `lib/personal/tasks.ts`, `lib/server/personal/tasks-store.ts`
- `app/api/personal/tasks/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`
- `app/interface/personnel/PersonalTasksPanel.tsx`, `PersonalDashboardClient.tsx`
- `supabase/migrations/20260824100000_create_personal_tasks.sql`
- `supabase/migrations/20260824110000_revoke_inherited_privileges_on_personal_tables.sql`
- `supabase/migrations/20260824120000_restrict_default_privileges_public_schema.sql`

Impact : les trois migrations sont **appliquées et vérifiées en base**. Le module Tâches n'a **pas encore été testé de bout en bout** dans le navigateur.

### Module Tâches

Champs repris de `23-modules.md` : intitulé, échéance, statut, contexte. Une seule table — une tâche est une ligne, retour au patron simple après les deux tables d'Habitudes. **Tâches ne fournit donc pas** le deuxième module à table dépendante que DEC-013 attend pour passer en `actif`.

**Le garde DEC-007 est posé dès le premier commit**, sur les cinq handlers, via `authorizeCockpitApiAccess()`. Aucun `getCurrentUser()` dans le module. C'est la leçon combinée de la route d'effacement et du chantier 5.

**`context_label`, et non `context`.** Le champ est un texte libre descriptif de la tâche. Ce n'est pas le « Rattachement contexte » de `12-modele-de-donnees.md`, qui est une table de liaison vers une Marque ou un Projet. Le commentaire de la migration interdit explicitement d'étendre ce champ en `marque_id`/`projet_id`.

**Aucune valeur dérivée n'est persistée** : ni la charge de tâches en attente, ni « en retard », ni « aujourd'hui ». Toutes se recalculent à la lecture ou au rendu. Même décision que pour la série et le taux de constance d'Habitudes.

**Cocher une tâche n'envoie que `status`**, ce qui rend utile la distinction entre « champ absent » et « champ à `null` » de `parseTaskUpdatePayload` : sans elle, chaque cochage aurait effacé l'échéance et le contexte.

L'onglet Tâches existait déjà mais rendait deux cartes statiques vides. Il rejoint Notes, Journal et Habitudes : cartes retirées de `tabCards`, identifiant sorti du `Exclude<…>`, `sourceForActiveTab` mis à jour, branche générique exclue. **Quatre des onze onglets** du pôle portent désormais de la donnée saisie.

### Privilèges hérités du défaut de schéma

**Découvert par le contrôle post-application de `personal_tasks`**, qui a montré `authenticated` en possession de tous les privilèges — `DELETE` et `TRUNCATE` compris — alors que la migration n'en accordait que trois. Sans ce contrôle, la table serait passée pour conforme.

**Cause** : le projet Supabase porte deux `ALTER DEFAULT PRIVILEGES`, posés par `postgres` et `supabase_admin`, accordant `arwdDxtm` à tous les rôles sur toute nouvelle table du schéma `public`. Les cinq migrations du pôle écrivaient `revoke all … from anon` puis `grant … to authenticated`, **sans jamais révoquer côté `authenticated`**. Un `grant` étant additif, il n'a rien retiré. Le défaut remonte à `personal_notes` (2026-08-04) ; les quatre migrations suivantes l'ont recopié. Les cinq tables du pôle étaient les seules du dépôt dans ce cas.

**Ce qui n'était pas cassé** : aucune suppression physique n'a jamais été possible. Vérifié par **test négatif réel** avec un vrai JWT `authenticated` — un `DELETE` sur sa propre ligne renvoie **0 ligne supprimée sans erreur de privilège**, signature exacte d'un privilège accordé et d'une policy absente. La protection tenait, mais par **une seule couche** au lieu des deux annoncées dans cette documentation. C'est la configuration qui a rendu l'incident `content_assets` du 2026-07-28 exploitable le jour où sa couche unique est tombée.

**Correctif** : `20260824110000` applique `revoke all` puis re-grant sur les cinq tables — méthode exhaustive par construction, préférée à une énumération qui aurait oublié `MAINTAIN`, privilège introduit en PostgreSQL 17 et cette base tournant en 17.6. `personal_habit_completions` **conserve `DELETE`**, intentionnel et doublé d'une policy scopée, mais perd `UPDATE` qu'elle n'aurait jamais dû avoir. `20260824120000` vide le défaut du schéma pour `postgres`.

**Limite connue** : le second défaut, posé par `supabase_admin`, reste hors de portée — le modifier exige d'être superutilisateur. Une table créée par l'outillage interne de Supabase hérite donc encore du blanc-seing.

**Ce que cet épisode apprend** : un commentaire de migration qui énonce une garantie ne la produit pas. Ceux du pôle décrivaient correctement la règle — « il faudrait ajouter à la fois le privilège et une policy » — tout en omettant l'instruction qui l'aurait rendue vraie. Seul un contrôle exécuté contre la base l'a montré, vingt jours plus tard. Le contrôle des grants doit rester dans les entrées `MANUAL_ACTIONS.md` des futures migrations.

## 2026-08-18 (suppression définitive d'un élément archivé)

Type : produit, sécurité, base de données, documentation  
Résumé : ajout d'un geste **« Supprimer définitivement »** dans la carte Archives de Notes, Journal et Humeur, et Habitudes. Il supprime physiquement **un élément**, là où « Vider l'historique » vide un module entier. Ajoute la table d'audit `personal_item_erasure_log` et le helper d'autorisation partagé `authorizeCockpitApiAccess`.

Fichiers liés :

- `src/lib/auth/api-guards.ts` (nouveau)
- `app/api/personal/{notes,journal,habits}/[id]/permanent/route.ts` (nouveaux)
- `lib/server/personal/data-erasure-store.ts`, `lib/personal/data-erasure.ts`
- `lib/personal/habits.ts`, `lib/server/personal/habits-store.ts`
- `app/interface/personnel/Personal{Notes,Journal,Habits}Panel.tsx`
- `supabase/migrations/20260818100000_create_personal_item_erasure_log.sql`

Impact : migration appliquée **au plus tard le 2026-08-20, date exacte non établie** — `cc76f38` (2026-08-20, 10:11) l'affirme appliquée et vérifiée le 2026-08-18, mais `5951773`, dix-neuf minutes plus tôt, ouvrait l'entrée `MANUAL_ACTIONS.md` correspondante au statut `pending`, et « 2026-08-18 » peut n'être que l'horodatage du nom de fichier. **Le geste n'a pas encore été testé de bout en bout dans le navigateur** — le socle serveur et l'interface compilent, la vérification isolée passe, mais aucun test réel n'a été mené.

> ⚠️ **L'affirmation « le geste n'a pas encore été testé de bout en bout » est dépassée depuis le 2026-08-24.** Le test a été mené ce jour-là par pilotage navigateur humain sur `test-erase@edificeia.com`, les trois modules séparément : troncature de l'aperçu à 80 caractères, désambiguïsation de deux entrées de journal commençant à l'identique, compte de réalisations propre à l'habitude visée. Corroboré en base par trois entrées de `personal_item_erasure_log` à cette date. Voir le chantier 4, volet 2, dans `suivi-chantiers-edifice.md`.

**Le geste n'existe que dans les archives, et le serveur le revalide.** La fonction de store filtre sur `id` + `user_id` + `deleted_at is not null` : l'identifiant d'un élément **actif** posté à la route renvoie `404` sans rien détruire. L'interface n'expose le bouton que dans la carte Archives, mais l'interface n'est pas un garde.

**La friction est une confirmation binaire, sans mot à taper**, contrairement au geste module. Ce n'est pas un relâchement : l'archivage préalable impose déjà deux gestes séparés par un retour à la liste. La confirmation affiche en revanche un **aperçu identifiable** — début du contenu pour une note, contenu plus date et humeur pour une entrée de journal, nom pour une habitude. Une confirmation générique ne protégerait de rien entre deux éléments archivés qui se ressemblent.

**Habitudes annonce ses réalisations.** `ArchivedPersonalHabit` gagne `completionCount`, alimenté par une seconde requête dans `listArchivedPersonalHabits` — le patron déjà en place pour la liste active, une requête pour les habitudes et une pour leurs réalisations. La jointure imbriquée PostgREST a été écartée : la clé étrangère est composite, et faire dépendre l'affichage de la résolution de cette relation ajouterait une dépendance à la contrainte que DEC-013 refuse déjà de présumer appliquée. `buildHabitStats` n'est toujours pas appelé sur ce chemin — un volume brut n'est ni une série ni un taux de constance, et ne se périme pas.

**Les gestes d'effacement passent par un seul fichier.** « Vider l'historique » et la suppression d'un élément archivé — les deux gestes par lesquels l'utilisateur efface des données Personnel à sa demande — vivent dans `data-erasure-store.ts`, sous la clé service-role : `permanentlyDeletePersonalItem` y rejoint `erasePersonalModule` plutôt que les stores de module, l'invariant annoncé en tête de ce fichier ne survivant pas à l'éparpillement. Les stores de module utilisent le client de session, qui n'a pas le privilège `DELETE` sur les tables de contenu. **Une exception distincte, et voulue** : décocher un jour d'habitude (`unmarkHabitCompletion`, dans `habits-store.ts`) supprime physiquement la réalisation par le client de session. `personal_habit_completions` accorde `DELETE` à `authenticated` sous une policy scopée au propriétaire, intentionnellement depuis la migration `20260806100000` et confirmé au chantier 6 : une réalisation est un booléen sur un jour et non du contenu, et la retirer est un geste de saisie, pas un effacement.

**Vérification d'éligibilité préalable pour Habitudes seulement.** Supprimer les réalisations puis découvrir que l'habitude n'était pas archivée détruirait des données sur un geste qui aurait dû répondre `404` sans rien faire. Pour Notes et Journal cette lecture serait inutile : le filtre triple du `DELETE` fait office de contrôle.

> ⚠️ **L'affirmation « pour Habitudes seulement » est dépassée depuis le 2026-09-09.** Depuis `3b36515`, Journal porte lui aussi une table dépendante, `personal_journal_entry_categories`, et `permanentlyDeletePersonalItem` fait la vérification d'éligibilité préalable pour tout module qui en déclare une (`dependents.length > 0` dans `MODULE_TABLES`). Elle vaut donc désormais pour Habitudes **et** Journal ; Notes s'en passe toujours, comme Tâches, ajouté depuis. La raison donnée ci-dessus est inchangée : ne rien détruire des dépendantes avant d'avoir vérifié que l'élément est archivé. Voir [Décisions](./03_Decisions.md) DEC-013.

**Le journal d'audit est une table distincte**, `personal_item_erasure_log`. Granularité différente de `personal_data_erasure_log` : celle-ci compte des lignes par table, celle-là désigne une ligne précise. Les fusionner aurait rendu `deleted_count` et `item_id` tous deux nullables, chacun dépendant de la valeur de l'autre. **Une** entrée par élément, y compris pour un module à plusieurs tables — asymétrie assumée avec l'autre journal, qui écrit une entrée par table vidée. Aucun contenu n'y est stocké : `item_id` est un uuid technique qui ne reconstitue rien, et il ne porte aucune clé étrangère, la ligne référencée n'existant plus à l'écriture.

**Le garde d'autorisation est posé dès la conception**, pas en correctif : `authorizeCockpitApiAccess` applique `getCurrentUser()` **et** `canAccessPrivateCockpit`, avec `401` et `403` distingués. C'est la leçon de `d6d0108`, où `/api/personal/settings/erase` avait vécu sans filtre de rôle parce que le contrôle avait été réécrit inline. Le helper vit dans un fichier neuf, séparé de `guards.ts` qui garde les **pages** par `redirect()`. Il est nommé « cockpit » et non « personal » : il servira tel quel à la mise en conformité DEC-007 des onze routes `/api/personal` restantes.

**Piège de nommage relevé, non corrigé.** Les trois panneaux portaient déjà un état `confirmingDeleteId` qui désigne la confirmation d'**archivage** — nom hérité du renommage « Supprimer » → « Archiver » du 2026-08-09, où seuls les libellés affichés avaient changé. Le nouvel état s'appelle donc `confirmingPermanentId`, et un commentaire signale le piège dans chaque fichier. Deux états voisins dont l'un s'appelle « delete » sans rien supprimer restent une ambiguïté à traiter : `PersonalHabitsPanel` utilise déjà `confirmingArchiveId`, donc l'incohérence est aussi **entre** les fichiers.

**Limites connues, non corrigées.** L'échec partiel intra-élément subsiste : si le `DELETE` de l'habitude échoue après celui de ses réalisations, la fonction renvoie `null` et la route répond `404` — trompeur, puisque des données ont été détruites. L'audit est par ailleurs écrit **après** la suppression, donc une panne entre les deux laisse la suppression sans trace. Les deux demanderaient une fonction Postgres `security definer` ; c'est le même arbitrage non pris que pour le geste module.

Suivi : tester le geste de bout en bout dans le navigateur, sur un compte jetable dont les éléments auront été archivés au préalable — le bouton n'apparaît pas ailleurs.

## 2026-08-16 (un module à la fois, et révision de DEC-012)

Type : produit, sécurité, documentation  
Résumé : le geste « Vider l'historique » passe d'une sélection multiple à **un module à la fois, avec confirmation dédiée**. `POST /api/personal/settings/erase` accepte désormais `module` et non `modules`. DEC-012 est par ailleurs scindée : la suppression explicite des tables dépendantes en sort et devient DEC-013, au statut `proposé`.

Fichiers liés :

- `app/interface/settings/SettingsPersonalPanel.tsx`
- `app/api/personal/settings/erase/route.ts`, `lib/personal/data-erasure.ts`
- `lib/server/personal/data-erasure-store.ts`
- `03_Decisions.md` (DEC-012 révisée, DEC-013 nouvelle)

Impact : **la migration `personal_data_erasure_log` n'est toujours pas appliquée en base**, et le geste n'a donc jamais été exercé de bout en bout. Voir `MANUAL_ACTIONS.md`.

**Ce qui disparaît.** Le flux précédent partageait une seule saisie de `SUPPRIMER` entre tous les modules cochés : trois cases et le mot tapé une fois vidaient les trois. Cases à cocher, bouton « Continuer » commun, totaux agrégés et déduplication de liste sont retirés. Il n'existe plus aucun geste, ni aucune requête, capable d'emporter deux modules.

**Ce qui le remplace.** Une ligne et un bouton nommé par module (« Vider Habitudes »), puis une confirmation dédiée où le nom du module est sorti du corps du texte — sur-titre « Module ciblé », libellé en `text-xl`, puis repris dans la phrase de conséquence, le libellé du champ et le bouton final. Le mot à taper reste `SUPPRIMER`, générique : c'est le nom affiché qui désigne la cible, pas le mot tapé. La confirmation et l'écran de résultat disent aussi ce qui **reste** — « Les autres modules du pôle ne sont pas touchés ».

**L'échec partiel entre modules disparaît par construction**, et non par précaution : une requête ne pouvant décrire qu'un seul effacement, il n'existe plus d'état où un module serait supprimé et un autre non. Un appelant resté sur `{ modules: [...] }` reçoit une erreur de validation, jamais un effacement partiel. **L'échec partiel à l'intérieur d'un module subsiste** : les tables dépendantes partent avant la principale, et une erreur entre les deux laisse la principale intacte pour des dépendantes déjà supprimées. Rendre l'ensemble atomique demanderait une fonction Postgres `security definer` — non fait.

Deux détails de sûreté hérités du passage à la cible unique : le champ de confirmation est **vidé à chaque ouverture**, sans quoi confirmer un module puis en viser un autre trouverait la saisie déjà faite ; et le bouton « Vider » n'est **jamais désactivé, même à zéro élément**, un module annoncé à 0 pouvant conserver des dépendantes orphelines si la cascade a manqué en base.

`deleteOwnedRows` a par ailleurs été contraint au type `ErasableTableName`, dérivé des littéraux de `MODULE_TABLES` via `as const satisfies`. Le paramètre était une `string` libre depuis l'extension à Habitudes : la liste blanche ne tenait plus que par convention sur la seule fonction du dépôt qui supprime physiquement. Rejet vérifié par test négatif — `deleteOwnedRows(userId, "auth.users")` ne compile pas.

**Révision de DEC-012.** L'entrée avait été rédigée et actée en session autonome, sans validation humaine, et présentait quatre règles comme non négociables séparément. La suppression explicite des tables dépendantes n'était pas une règle mais un choix d'implémentation généralisé depuis un unique module : elle devient DEC-013, statut `proposé`, avec ses arguments contre et son critère de sortie — un deuxième module effaçable doté d'une table dépendante. La formule « ne jamais dépendre d'une contrainte… », qui figurait en gras dans `06_Modules.md` comme principe du dépôt, y est requalifiée en argument rattaché à cette décision proposée.

## 2026-08-13 (« Vider l'historique », Réglages > Personnel)

Type : produit, sécurité, base de données, documentation  
Résumé : ajout du geste « Vider l'historique » dans un nouvel onglet Personnel de Réglages, **seule suppression physique de données du dépôt**. Couvre les trois modules à saisie manuelle du pôle : Notes, Journal et Humeur, Habitudes. Ajoute la table d'audit `personal_data_erasure_log`. Voir [Décisions](./03_Decisions.md) DEC-012.

> ⚠️ **Le flux de confirmation décrit dans cette entrée est dépassé depuis le 2026-08-16.** Il reposait sur une sélection multiple par cases à cocher et un mot `SUPPRIMER` tapé une fois pour tous les modules cochés. Il est remplacé par un module à la fois avec confirmation dédiée — voir l'entrée du 2026-08-16. Le reste de cette entrée (gardes, service-role, journal d'audit, tables) reste exact.

Fichiers liés :

- `lib/personal/data-erasure.ts`, `lib/server/personal/data-erasure-store.ts`
- `app/api/personal/settings/erase/route.ts`
- `app/interface/settings/SettingsPersonalPanel.tsx`, `app/interface/settings/SettingsWorkspaceClient.tsx`, `lib/settings-preferences.ts`
- `supabase/migrations/20260806200000_create_personal_data_erasure_log.sql`

Impact : **la migration n'est pas appliquée en base.** Tant qu'elle ne l'est pas, l'écriture du journal d'audit échoue et la route renvoie une erreur — voir `MANUAL_ACTIONS.md`. Le geste ne doit pas être exercé avant application.

Quatre gardes sur la route : session obligatoire ; mot de confirmation `SUPPRIMER` revalidé côté serveur, la confirmation de l'interface ne suffisant pas si la route est court-circuitée ; identifiants de module passés par liste blanche, aucun nom de table ne venant du client ; exécution par la clé service-role avec le filtre `.eq("user_id", …)` centralisé dans une fonction unique du store. **La service-role contourne RLS** : ce filtre est le seul garde d'isolation de ce chemin, d'où sa centralisation.

**Habitudes, premier module effaçable à deux tables, ne s'appuie pas sur la cascade.** Ses réalisations sont supprimées explicitement avant ses habitudes, bien qu'une clé étrangère composite `on delete cascade` existe dans la migration du module. Ce module a précisément connu une migration appliquée partiellement en base (incident RLS du 2026-08-10) : une contrainte absente en production ne produirait aucune erreur, seulement des réalisations orphelines qu'aucun écran ne montre plus, après un geste qui promettait de tout effacer. **Choix ouvert et non érigé en règle** — voir DEC-013, statut `proposé`, révisé le 2026-08-16.

**Le compte affiché ne dit pas tout, et le dit.** Il reste exprimé en habitudes et non en lignes, parce que c'est l'unité que l'utilisateur reconnaît ; mais annoncer « 3 éléments » pour une suppression qui en détruit des centaines serait un écart de sincérité. L'écran de confirmation nomme donc séparément les réalisations, et l'écran de résultat affiche le volume réellement supprimé par table, renvoyé par le serveur — pas les comptes annoncés à l'étape précédente, ce qui rend tout écart visible.

Le journal d'audit suit le patron de `project_memory_audit_log`, opposé à celui des tables du pôle : `anon` et `authenticated` révoqués, aucune policy, accès service-role seul. Il ne porte **aucune clé étrangère vers `auth.users`** — une suppression de compte cascaderait et effacerait la preuve que l'effacement a eu lieu — et ne stocke **aucun contenu supprimé**, seulement des volumes. Une entrée par table vidée et non par module, sans quoi le volume des réalisations ne serait consigné nulle part.

Point de conception traité explicitement : cet onglet agit réellement dans un écran où **rien d'autre n'agit**. Le bandeau « réglages enregistrés, pas encore appliqués » et le récapitulatif de bas de page y sont masqués — ils seraient faux, et faux au pire endroit. L'onglet est en dernière position et n'est jamais l'onglet par défaut.

Suivi : appliquer la migration, puis tester le geste de bout en bout. La **suppression totale** (compte, autres pôles) et l'**export complet des données** restent absents — les deux capacités de souveraineté que la vision rattache à Réglages ne sont donc que partiellement couvertes.

## 2026-08-10 (archives et restauration, Habitudes)

Type : produit, documentation  
Résumé : la fonctionnalité Archives est étendue à Habitudes, sur le patron exact de Notes et Journal. **Les trois modules à saisie manuelle du pôle ont désormais le même contrat** — `?archived=true` sur la liste, `archivedCount` sur la liste active, `POST /[id]/restore` pour restaurer. Comble la lacune signalée au commit précédent du module.

Fichiers liés :

- `lib/personal/habits.ts` (type `ArchivedPersonalHabit`)
- `lib/server/personal/habits-store.ts` (liste, compte, restauration)
- `app/api/personal/habits/route.ts`, `app/api/personal/habits/[id]/restore/route.ts`
- `app/interface/personnel/PersonalHabitsPanel.tsx`

Impact : vérifié en conditions réelles — bouton conditionnel au compteur, restauration correcte, aucun chiffre dans les archives. Aucune policy RLS nouvelle : restaurer est un `UPDATE` de `deleted_at`, déjà couvert par la policy `update` scopée au propriétaire.

**Les archives d'Habitudes n'affichent ni série ni taux de constance**, contrairement à la liste active — ces valeurs n'ont pas de sens pour une habitude qu'on ne suit plus, et les figer produirait un chiffre périmé qui ne se signalerait pas. Ce n'est pas une omission de la vue : le type `ArchivedPersonalHabit` est construit sur `PersonalHabit` et non sur `PersonalHabitWithStats`, donc les champs n'existent pas et les lire ne compile pas ; et `listArchivedPersonalHabits` n'appelle jamais `buildHabitStats`. Deux des trois barrières sont tenues par le compilateur.

**Restaurer retrouve l'historique intact** : l'archivage n'a jamais touché `personal_habit_completions`, les réalisations n'étant supprimées que par le geste décocher. Série et constance sont recalculées sur des données complètes, jamais reprises d'un instantané.

Une différence d'implémentation avec Notes et Journal, dans le sens du mieux : le panneau Habitudes rechargeant déjà après chaque mutation — choix fait à sa construction pour que série et constance restent justes — le compteur d'archives vient de la même réponse et se met à jour tout seul. Pas d'incrément local à maintenir, donc pas de dérive possible entre le compteur affiché et la réalité.

## 2026-08-10 (module Habitudes)

Type : produit, sécurité, documentation  
Résumé : troisième module à saisie manuelle du pôle Personnel, et le premier à **deux tables** — une définition d'habitude et un historique de réalisations au jour le jour. L'onglet « Routines » devient « Habitudes » et cesse d'afficher des cartes statiques. **Trois des onze onglets du pôle portent désormais de la donnée saisie.**

Fichiers liés :

- `supabase/migrations/20260806100000_create_personal_habits.sql`
- `lib/personal/habits.ts`, `lib/server/personal/habits-store.ts`
- `app/api/personal/habits/` (trois fichiers de route)
- `app/interface/personnel/PersonalHabitsPanel.tsx`, `PersonalDashboardClient.tsx`

Impact : série en cours et taux de constance sont calculés **en lecture**, sans colonne persistée, par une fonction pure prenant `today` en paramètre — donc testable sur des dates fixes. Vérifié en conditions réelles : création, marquage d'une réalisation, série et constance affichés.

**Le seul `DELETE` accordé à `authenticated` du pôle** est sur `personal_habit_completions`. Une réalisation est un booléen sur un jour, pas du contenu : décocher retire la ligne. Un soft delete aurait obligé à rendre partielle la contrainte d'unicité `(habit_id, completed_on)` et à ressusciter la ligne au lieu d'insérer. La policy `DELETE` reste scopée au propriétaire — c'est la différence entière avec l'incident `content_assets` du 2026-07-28. `user_id` est dénormalisé sur les réalisations, la dérive étant fermée par une clé étrangère composite plutôt que par une convention de code.

**Incident RLS résolu** : la création d'habitude échouait sur `new row violates row-level security policy`. Le code étant prouvé identique à celui de Notes et Journal — mêmes imports, même ordre d'instanciation, même transmission de `user.id` — la cause a été cherchée en base : la migration n'avait été appliquée que partiellement, les policies n'ayant jamais été créées. Le message de Postgres ne distingue pas « `WITH CHECK` faux » de « aucune policy `INSERT` applicable », ce qui rendait la première lecture trompeuse. Le rejeu de la migration a résolu le problème.

### Trois bugs de calcul, corrigés avant le premier commit

Aucun n'était visible à la lecture ; les trois auraient produit des chiffres faux mais plausibles. Ils sont détaillés dans [`06_Modules.md`](./06_Modules.md).

1. **La semaine de création était comptée** — une habitude créée jeudi affichait `0 %` dès le lundi suivant, jugée sur l'objectif complet d'une semaine où elle n'avait existé que quatre jours. Le calcul démarre désormais au lundi suivant la création. Exclure plutôt que proratiser, pour appliquer la règle déjà retenue pour la série : une période incomplète ne compte pas.
2. **`createdOn` était lu en UTC** — `slice(0, 10)` sur un `timestamptz` donne le jour UTC, pas le jour vécu. Une habitude créée à 00 h 30 heure de Paris était datée de la veille. Remplacé par `parisDayOf()`.
3. **Le compte de semaines était surévalué d'une unité** — l'intervalle lundi→dimanche étant inclusif des deux côtés, la formule comptait 2 semaines pour une et 5 pour la fenêtre pleine de 4. **Tous les taux étaient sous-estimés**, d'un facteur 5/4 dans le cas courant. Trouvé en vérifiant le correctif précédent, sur un cas où 3 réalisations sur 3 affichaient 50 %.

Actions de suivi, non traitées : le **graphique par habitude** reste hors périmètre, et **Habitudes n'a ni archives ni restauration** contrairement à Notes et Journal — l'archivage existe côté base et API, mais aucune vue ne les liste.

## 2026-08-09 (libellé « Archiver », et un incident de cache Turbopack)

Type : produit, documentation  
Résumé : sur Notes et Journal, le bouton « Supprimer » de la liste active devient **« Archiver »**, et sa confirmation « Confirmer l'archivage ? ». Le geste n'a jamais rien supprimé physiquement — il écrit `deleted_at` depuis l'origine. Tant que les archives n'existaient pas, l'écart de vocabulaire était discutable ; depuis que l'écran montre où va l'élément et permet de le récupérer, appeler « Supprimer » une action réversible serait un mensonge de l'interface. Les messages d'erreur affichés sont alignés (« Archivage de la note indisponible »).

Fichiers liés :

- `app/interface/personnel/PersonalNotesPanel.tsx`, `PersonalJournalPanel.tsx`
- `app/api/personal/notes/[id]/route.ts`, `app/api/personal/journal/[id]/route.ts` (message d'erreur uniquement)

Impact : **textes affichés uniquement**. Le message de repli des deux routes `DELETE` disait encore « Suppression… » ; il est aligné, car il s'affiche à l'utilisateur quand le serveur échoue et aurait rétabli la confusion que le renommage supprime. **Aucun identifiant ne change** — `confirmDelete`, `softDeletePersonalNote`, `DELETE /[id]`, `confirmingDeleteId` gardent leurs noms, et `lib/server/` n'est pas touché.

### Incident : un bouton qui ne répond plus, sans bug dans le code

À retenir pour un symptôme futur du même genre — **une commande qui cesse de répondre juste après l'ajout d'une fonctionnalité, sans erreur affichée**.

Après la livraison des archives, le bouton de confirmation d'archivage de Notes affichait bien son état « Confirmer / Annuler » mais ne réagissait plus au clic. L'hypothèse naturelle — une collision d'état entre la logique de confirmation et celle des archives — **était fausse**, et l'audit du code l'a établi avant toute modification :

- `confirmingDeleteId` n'a que quatre écritures, toutes dans le flux de confirmation ; aucune ne vient du code des archives, et aucun effet ne le réinitialise ;
- le bouton étant `disabled={isSubmitting}`, un `isSubmitting` bloqué produirait exactement ce symptôme — mais les huit écritures sont appariées, chaque `setIsSubmitting(true)` ayant son `setIsSubmitting(false)` dans un `finally` ;
- l'arbre de travail était identique au code commité.

La cause était **environnementale** : un serveur de dev orphelin, resté sur le port 3000 hors du gestionnaire qui l'avait lancé, avec un cache Turbopack corrompu de 346 Mo qui journalisait en boucle `Persisting failed / Compaction failed: Another write batch or compaction is already active`. Il servait un bundle client désynchronisé — le balisage à jour, les gestionnaires d'événements périmés.

Tuer le processus, supprimer `.next`, relancer : le bug a disparu, sans une ligne de code modifiée.

**Origine de l'orphelin, et la règle qui en découle** : les vérifications isolées font un `git stash --include-untracked`, qui fait disparaître puis réapparaître des fichiers sous un serveur en cours d'exécution. Répété, cela corrompt le cache. **Arrêter le serveur de dev avant chaque vérification isolée**, ce qui n'avait pas été fait pour les chantiers Habitudes et Archives.

Deux réflexes que cet incident justifie : devant un symptôme d'interface inexplicable, vérifier `preview_list` contre le port réellement occupé — un écart signale un orphelin ; et lire les logs du serveur, où la corruption s'annonçait depuis des heures.

## 2026-08-06 (archives et restauration, Notes et Journal)

Type : produit, documentation  
Résumé : les éléments archivés deviennent consultables et restaurables sur Notes et Journal. Jusqu'ici, archiver rendait une note ou une entrée définitivement invisible depuis l'interface, alors que la ligne existait toujours en base — un soft delete sans porte de sortie. `GET ?archived=true` liste les archives, `POST /[id]/restore` restaure, et la liste active renvoie `archivedCount` pour afficher « Voir les archives (N) » sans second appel.

Fichiers liés :

- `lib/personal/notes.ts`, `lib/personal/journal.ts` (types `Archived*`)
- `lib/server/personal/notes-store.ts`, `journal-store.ts` (liste, compte, restauration)
- `app/api/personal/notes/route.ts`, `journal/route.ts`
- `app/api/personal/notes/[id]/restore/route.ts`, `journal/[id]/restore/route.ts`
- `app/interface/personnel/PersonalNotesPanel.tsx`, `PersonalJournalPanel.tsx`

Impact : le soft delete cesse d'être une impasse. Une note archivée par erreur se récupère, ce qui rend l'archivage moins coûteux à déclencher — et donc plus honnête comme geste par défaut.

**Restaurer et supprimer définitivement ne partagent rien.** [11-modularite-configuration.md](../Documentation-Strategique/Markdown/11-modularite-configuration.md) pose qu'éteindre une capacité et supprimer une donnée « ne doivent jamais partager un seul bouton ni une seule confirmation ». La séparation implémentée dépasse le bouton : deux fichiers de route, deux fonctions de store sans ligne commune, et **aucune suppression physique nulle part dans ces deux modules** — ni route, ni fonction, ni privilège. Vérifié à l'exécution : un `DELETE` sur une route de restauration renvoie `405`. À l'écran, les archives forment une carte séparée en bordure pointillée où le seul geste possible est « Restaurer ».

> ⚠️ **Deux affirmations de ce paragraphe sont dépassées depuis le 2026-08-18** : les archives portent désormais un second geste, « Supprimer définitivement », et la suppression physique existe — route `DELETE /[id]/permanent` et fonction `permanentlyDeletePersonalItem`. Le **privilège**, lui, n'a pas changé : `authenticated` ne peut toujours rien supprimer, la suppression passant par la clé service-role. Voir l'entrée du 2026-08-18. Le reste de cette entrée reste exact.

Aucune policy RLS nouvelle : la restauration est un `UPDATE` de `deleted_at` et emprunte la policy `update` déjà scopée au propriétaire — exactement celle qui couvrait déjà l'archivage, dans l'autre sens.

Deux choix de contrat qui méritent d'être connus. Il **n'existe pas de valeur `?archived=all`** : mélanger les deux états dans une liste laisserait croire qu'un élément archivé est actif. Et la restauration **recharge la liste active** au lieu de la reconstruire localement, pour que l'élément reprenne sa place exacte dans le tri par date de création.

Non traité : **Habitudes**, dont le socle RLS n'est pas confirmé réparé — le bug de création (`new row violates row-level security policy`) reste ouvert, l'hypothèse principale étant que les policies de `personal_habits` n'ont jamais été créées en base. Construire des archives par-dessus un socle non vérifié aurait ajouté du code non testable.

Action de suivi, non traitée : le cycle authentifié n'a pas été exercé — lister des archives, restaurer, voir le compteur bouger demande une session que l'agent ne peut pas ouvrir.

## 2026-08-05 (module Journal et Humeur)

Type : produit, sécurité, documentation  
Résumé : deuxième module à saisie manuelle du pôle Personnel, construit sur le patron de Notes — table, route API, UI. Les deux cartes statiques de l'onglet Journal (« Entrée du jour », « Décisions du quotidien ») sont remplacées par une liste réelle, un formulaire d'ajout avec sélecteur d'humeur, l'édition en place et la suppression avec confirmation légère. **Deux des onze onglets du pôle portent désormais de la donnée saisie**, contre un seul la veille.

Fichiers liés :

- `supabase/migrations/20260805100000_create_personal_journal_entries.sql`
- `lib/personal/journal.ts`, `lib/server/personal/journal-store.ts`
- `app/api/personal/journal/route.ts`, `app/api/personal/journal/[id]/route.ts`
- `app/interface/personnel/PersonalJournalPanel.tsx`, `PersonalDashboardClient.tsx`

Impact : l'extraction de `PersonalPrimitives.tsx` faite pour Notes a servi exactement comme prévu — **aucun refactor n'a été nécessaire cette fois**. Le panneau vit dans son propre fichier et importe les deux primitives, sans cycle d'import. C'est la première confirmation que le patron tient pour les modules Personnel suivants.

Sécurité identique à Notes, et vérifiée contre le réel : store sur le client de session plutôt que la clé service-role, donc **RLS est le garde réel**. La table n'accorde pas le privilège `DELETE` à `authenticated` et ne porte aucune policy `DELETE` — la suppression est logique. Contrôlé le 2026-08-05 : un appel PostgREST anonyme en `SELECT`, `INSERT` (avec `user_id` forgé) et `DELETE` est refusé avec `42501`, et les quatre routes répondent `401` sans session.

Deux écarts assumés avec Notes. **`mood`** est un entier nullable contraint entre 1 et 5, où le nullable porte l'information « non renseignée » et non la valeur neutre du milieu de l'échelle ; le `PATCH` distingue « champ absent » de « `mood: null` » par un test d'appartenance de clé, `undefined` disparaissant à la sérialisation JSON. Et le **contenu est plafonné à 20 000 caractères** contre 10 000 pour Notes, parce que [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) oppose les deux modules par le poids de ce qu'ils portent.

**Tendance d'humeur : hors périmètre, différée et non oubliée.** La donnée dérivée décrite par `23-modules.md` n'est pas construite — le module de base passait d'abord. Elle se calculera en lecture depuis `mood` et `created_at`, sans migration, et devra exclure les entrées sans humeur plutôt que les compter comme moyennes. L'index partiel existant couvre déjà son chemin d'accès.

Corrigé au passage, omission de la session Notes : `personal_notes` n'avait jamais été ajoutée à [`05_Database.md`](./05_Database.md). Les deux tables y figurent désormais, avec la note qu'elles sont les seules du dépôt dont RLS est le garde réel.

Action de suivi, non traitée : le cycle CRUD complet n'a pas été exercé — il demande une session authentifiée, que l'agent ne peut pas ouvrir.

## 2026-08-04 (pôle Assistant)

Type : produit, documentation  
Résumé : audit du pôle Assistant, en préparation d'un accès en lecture aux données Personnel. Le constat rend la question de départ caduque : **l'Assistant n'appelle aucun LLM**. `answerConversation` est une cascade de correspondance de mots-clés — `includes("memoire")`, `includes("module")`, `includes("brouillon")` — qui assemble des chaînes de caractères à partir d'un `ProjectContext` pré-calculé. Le choix entre modes Conversation et Workflow repose sur une liste de dix-neuf verbes d'action. Il n'existe ni prompt système, ni modèle, ni paramètre d'inférence, ni `tools`. Vérifié de trois façons : aucun SDK LLM dans `package.json`, aucune URL d'API de modèle sur ce chemin, et les occurrences de « openai » dans le moteur de workflow sont des estimations de coût, pas des appels. Les seuls appels LLM réels du dépôt visent OpenAI depuis l'atelier de contenu.

Fichiers liés :

- `app/api/assistant/global/route.ts`, `lib/server/assistant/global-assistant.ts`
- `lib/server/assistant/build-project-context.ts`
- `knowledge/Documentation-Technique-Code/06_Modules.md` (section Assistant de L'Édifice)

Impact : aucun code modifié. La documentation cesse de laisser croire à une capacité IA sur ce pôle, alors que [21-poles.md](../Documentation-Strategique/Markdown/21-poles.md) le décrit comme la surface transversale au-dessus de la capacité IA en portée large. L'écart entre la cible et le code est désormais écrit là où un audit du module le trouvera.

Deux constats structurants relevés au passage. **Aucun historique de conversation n'existe** : le client garde un seul échange en mémoire React et chaque requête ne transmet que le message courant, si bien qu'un modèle branché en l'état répondrait à chaque message comme au premier. Et **`buildProjectContext()` ne prend aucun `userId`** — le contexte est entièrement projet, sans rien de Personnel ni de Trajectoire, alors que la route dispose pourtant de `user.id`. Le seul patron existant de lecture d'une donnée vivant ailleurs est `project_memory`, table sans colonne `user_id`, lue par clé service-role : inutilisable tel quel pour une donnée scopée par utilisateur comme `personal_notes`.

**DEC-011** consigne la décision produit : le LLM sera branché plus tard, comme chantier à part entière — coût par appel, gestion d'erreur, et l'historique de conversation à construire de zéro. Quand ce sera fait, l'intégration visera d'emblée **tous les modules Personnel** via un registre générique sur le modèle de `lib/personal/connectors/registry.ts`, et non le seul module Notes : le point d'entrée étant déjà centralisé dans `buildProjectContext()`, le générique n'y coûte pas significativement plus que le spécifique. C'est ce qui distingue ce cas de `DEC-010`, où différer évitait du scaffolding autour d'entités inexistantes.

Conséquence immédiate consignée dans la décision : **ne pas étendre la cascade de mots-clés** pour y brancher la lecture de Notes ou d'un autre module. Ce travail serait entièrement à refaire une fois le LLM branché, et donnerait l'illusion d'un assistant qui comprend. L'effort va donc à la construction des autres modules Personnel — stores et UI sur le patron de Notes — qui formeront la base de lecture du futur LLM.

Action de suivi, non traitée : le champ optionnel `trajectoire` de `GlobalAssistantInput` n'est fourni par aucun appelant. Il reste en l'état, le câbler avant le LLM relevant du même travail jetable.

## 2026-08-04 (module Notes)

Type : produit, sécurité, documentation  
Résumé : premier module à saisie manuelle du pôle Personnel construit de bout en bout — table, route API, UI. Les deux cartes statiques de l'onglet Notes (« Notes rapides », « Repères personnels ») sont remplacées par une liste réelle, un formulaire d'ajout, l'édition en place et la suppression avec confirmation légère. Onze onglets du pôle en portaient ; il en reste neuf.

Fichiers liés :

- `supabase/migrations/20260804100000_create_personal_notes.sql`
- `lib/personal/notes.ts`, `lib/server/personal/notes-store.ts`
- `app/api/personal/notes/route.ts`, `app/api/personal/notes/[id]/route.ts`
- `app/interface/personnel/PersonalNotesPanel.tsx`, `PersonalPrimitives.tsx`, `PersonalDashboardClient.tsx`

Impact : Notes est le premier onglet du pôle à porter de la donnée saisie par l'utilisateur — Calendrier affichait déjà du réel, mais en lecture seule depuis Google.

**Point de sécurité structurant** : ce store est le seul du pôle à utiliser le client de session plutôt que la clé service-role. Les deux autres stores Personnel contournent RLS, non par choix mais parce qu'ils tournent sans session (webhook, cron). Notes n'a pas cette contrainte, donc **RLS est ici le garde réel et non une défense en profondeur**. La table n'accorde pas le privilège `DELETE` à `authenticated` et ne porte aucune policy `DELETE` : la suppression est logique (`deleted_at`), et il faudrait ajouter les deux couches pour qu'une suppression physique redevienne possible — leçon directe de l'audit `content_assets` du 2026-07-28. Vérifié contre la base réelle : un appel PostgREST anonyme en `SELECT`, `INSERT` et `DELETE` est refusé avec `42501`.

Deux décisions consignées dans [`03_Decisions.md`](./03_Decisions.md). **DEC-010** pose qu'aucun rattachement Marque/Projet n'est construit tant que le concept n'existe pas en code — commune à Notes et à Tâches, sans dette de migration puisque le modèle prévoit une table de liaison. La validation du contenu vit dans `lib/personal/notes.ts`, importée à la fois par les routes et par le composant client, pour que le retour visuel avant appel et le 400 du serveur ne puissent pas diverger.

**Correction d'un bug antérieur, trouvé en testant Notes** : l'onglet actif était lu dans l'initialiseur de `useState` depuis `sessionStorage`. Le rendu serveur (sans `window`) rendait Résumé actif, le premier rendu client rendait l'onglet mémorisé — divergence de `className` sur les boutons d'onglet et de texte sur le titre de section, donc erreur d'hydratation React à chaque rechargement suivant la visite d'un onglet autre que Résumé. Le bug est **antérieur au module Notes** — code identique dans l'historique — et se reproduisait aussi bien via l'onglet Calendrier ; la suppression d'une note n'y était pour rien, elle obligeait seulement à passer par l'onglet Notes. Corrigé par `useSyncExternalStore`, dont l'instantané serveur rend les deux premiers rendus identiques par construction. Aucun `suppressHydrationWarning`.

Action de suivi, non traitée : l'onglet actif pourrait vivre dans l'URL plutôt que dans `sessionStorage`, ce qui supprimerait le bref affichage de Résumé avant bascule. C'est un changement de comportement, pas une correction.

## 2026-08-01 (réévaluation du garde TikTok status)

Type : sécurité, documentation  
Résumé : réévaluation de l'exception de `/api/oauth/tiktok/status`, seul cas particulier laissé ouvert par `DEC-007`. **Aucun changement de comportement** — la mesure a montré que le durcissement aurait cassé la review qu'il devait sécuriser, et que le défaut réel était ailleurs.

Ce que la route expose réellement : `{ present, storageEnabled, storageMode, expiresAt, updatedAt }`. Ni token, ni identifiant de compte, ni scope. Et surtout, **aucun accès anonyme** : sans session la route répond `403`, le middleware redirigeant déjà vers `/login`. Le compromis ne portait que sur le filtre de rôle. Comme `canAccessPrivateCockpit(user)` vaut `getUserRole(user) !== "reviewer"`, l'écart avec le garde strict est exactement un rôle — celui de `reviewer@edificeia.com`, compte créé et contrôlé par le projet, qui dispose déjà du flux OAuth complet et de l'upload sandbox.

Deux durcissements écartés, avec leur raison : ajouter `canAccessPrivateCockpit` ferait répondre `403` au reviewer sur `/tiktok-sandbox-test`, page qui rend `<TikTokConnectionControls />` et dont la vérification du token stocké est la fonction annoncée ; réduire la charge utile à `present` seul viderait les trois autres champs que cette même page affiche, pendant son examen.

Fichiers liés :

- `app/api/oauth/tiktok/status/route.ts` (commentaire uniquement)
- `knowledge/Documentation-Technique-Code/03_Decisions.md` (`DEC-007`)
- `MANUAL_ACTIONS.md`

Impact : le commentaire du fichier et `DEC-007` énoncent désormais la portée mesurée de l'écart, au lieu d'un « cas particulier assumé » qui pouvait se relire comme une route non gardée. Le défaut trouvé n'est pas le garde mais l'**absence de condition de sortie** : rien dans le dépôt n'indiquait où en était la review — aucun ticket, aucune date, aucun statut, ni en code, ni dans `knowledge/`, ni dans l'historique git. Une entrée `pending` de `MANUAL_ACTIONS.md` porte désormais la vérification et les étapes exactes du durcissement, l'état de la review n'étant lisible que dans le portail développeur TikTok.

Action de suivi, non traitée : `getOAuthTokenStatus` est appelée sans `userId` par les trois routes de statut (`tiktok`, `youtube`, `calendar`), donc renvoie la ligne `oauth_tokens` du propriétaire quel que soit l'appelant authentifié. Conséquence assumée d'un cockpit mono-utilisateur, à revoir quand plusieurs comptes réels coexisteront.

## 2026-08-01 (alignement des libellés sur la doc stratégique)

Type : produit, documentation  
Résumé : premier alignement du code sur la refonte stratégique du 2026-08-01, limité aux libellés et aux vestiges. Deux renommages d'affichage — « Accueil Cockpit » devient « Accueil », « Espace intérieur » devient « Personnel », conformément à la règle des noms nus de [`10-architecture-systeme.md`](../Documentation-Strategique/Markdown/10-architecture-systeme.md). Les deux libellés ont été corrigés partout où ils apparaissaient, pas seulement dans `navigation.ts` : titres de page, métadonnées, en-têtes de section, texte de bouton et commentaires de code.

Suppression de l'alias partiel `/interface/reglages/connexions`. Il n'était pas décoratif : les callbacks OAuth YouTube et Meta y renvoyaient en dur après autorisation, alors que tous les autres providers et tous les liens d'interface passaient par `/interface/settings/connections`. Le supprimer sans plus aurait cassé le retour d'autorisation de ces deux providers. Les deux callbacks lisent désormais `OAUTH_CONNECTIONS_RETURN_PATH` (`lib/server/oauth/oauth-redirects.ts`), ce qui supprime du même coup la divergence de chemin de retour entre providers.

Fichiers liés :

- `lib/cockpit/navigation.ts`, `lib/cockpit/modules.ts`, `lib/cockpit/constants.ts`
- `app/interface/overview/page.tsx`, `app/interface/overview/OverviewDashboardClient.tsx`
- `app/interface/personnel/page.tsx`, `app/interface/personnel/PersonalDashboardClient.tsx`
- `app/api/oauth/youtube/callback/route.ts`, `app/api/oauth/meta/callback/route.ts`
- `app/interface/reglages/connexions/page.tsx` (supprimé)

Impact : l'interface ne porte plus les deux noms que la refonte abandonne, et il n'existe plus deux chemins de retour OAuth pour la même page. Aucune fonctionnalité ajoutée ni retirée.

Trois décisions consignées dans [`03_Decisions.md`](./03_Decisions.md) : **DEC-008** reporte le renommage de route `/interface/settings` → `/interface/reglages`, qui touche des URL de production et les chemins de retour OAuth, et n'avait pas sa place dans un alignement de libellés. **DEC-009** inscrit trois absences structurelles comme dette assumée jusqu'à l'achèvement du pôle Personnel : le pôle Finances (aucune occurrence dans le code), la notion de marque (l'atelier de contenu est organisé par outil, pas par marque), et la couche de configuration unique (deux registres statiques aux identifiants divergents, aucune table `ACTIVATION_MODULE`). L'entrée précise la portée que cette couche devra couvrir — modules, pôles, espaces **et instances individuelles** — pour qu'une implémentation future ne la sous-dimensionne pas.

Deux points de documentation clos au passage. La **mémoire projet** (`/interface/resources/memory`) est décrite comme sous-surface de Ressources, lue par l'Assistant en portée large. Et **Bibliothèque (v1.0)** cesse d'être un point ouvert : son repreneur est Ressources, confirmé par Vincent, avec la précision que l'ambition documentaire de la v1.0 — indexation par entité du graphe, notes liées — n'a pas été reprise. La note correspondante de [`../Archive/v1.0-2026-07/README.md`](../Archive/v1.0-2026-07/README.md) est corrigée en conséquence ; seul Paramètres y reste un point ouvert, sur ses deux capacités de souveraineté.

Non fait délibérément : les surfaces que la cible range en services communs (Publications, les deux Publishers, Pilotage IA, Réglages › Connexions) restent des destinations visibles, faute de marque pour les consommer — divergence désormais écrite en tête des modules de publication dans [`06_Modules.md`](./06_Modules.md). Le nettoyage du vestige « Cockpit » dans les noms de fichiers, composants et dossiers reste un refactor à part.

## 2026-08-01 (module Paramètres)

Type : produit, documentation  
Résumé : cadrage du module Paramètres, jusque-là totalement absent de la base de connaissances — aucune occurrence de « paramètre », « réglage » ni « settings » dans les treize fichiers, alors que le module existe en code et dans la navigation. La comparaison doc/code a révélé un écart de sincérité de grande ampleur : **les 18 préférences globales et les overrides par compte sont enregistrés dans `user_preferences`, mais aucun module ne les relit**. Vérifié champ par champ : zéro consommateur hors du module lui-même, aucun import de `settings-preferences`, aucun appel à `readSettingsPreferences`, aucune requête sur `user_preferences`. L'unique correspondance trouvée pour `defaultVoiceId` est une fonction locale homonyme de `lib/server/voice-pipeline.ts` qui lit `ELEVENLABS_VOICE_ID`.  
Fichiers liés :

- `app/interface/settings/SettingsWorkspaceClient.tsx`
- `Documentation-Technique-Code/06_Modules.md`

Impact : l'écran annonce désormais ce qu'il fait réellement. Un bandeau en tête indique que les réglages sont stockés et non appliqués, en excluant l'onglet Connexions qui agit réellement. L'onglet Sécurité — le point le plus dangereux, puisque ses quatre bascules pouvaient passer pour des garde-fous configurables — précise qu'elles ne pilotent rien et que les confirmations réelles sont codées dans les workflows. La priorité compte/global/défaut est requalifiée en « prévue ». Le récapitulatif de bas de page ne dit plus « réglages actifs ». La bascule « Génération manuelle obligatoire active », inerte (toujours cochée, `onChange` vide, jamais enregistrée), devient une mention en lecture seule.

Aucun réglage n'a été câblé : brancher 18 préférences dans l'atelier Shorts, la voix, la programmation et les garde-fous est une refonte, pas une correction, et elle demande des arbitrages produit. Le module n'apparaît d'ailleurs à aucun horizon de la [Roadmap](./02_Roadmap.md).

Second écart, trouvé en vérifiant l'affirmation ci-dessus : le badge de statut des cartes de l'onglet Connexions ne mesure pas la connexion mais la présence des variables d'environnement, et `getOAuthStatus` contenait un `if (provider.key === "youtube") return "Connecte"` renvoyant une connexion en dur, sans lire ni token ni configuration — même motif que la sonde cassée de l'Observatoire. Supprimé ; YouTube suit la logique commune, un commentaire interdit d'y remettre une valeur affirmative, et le panneau annonce ce que le badge mesure réellement. Pinterest reste le seul provider dont le badge repose sur un token réellement lu.

Action de suivi : étendre à tous les providers la lecture réelle du token, sur le modèle de Pinterest, pour que le badge signifie « connecté » plutôt que « configuré ». Et écarts de couverture avec la documentation stratégique (section 17) non traités — identité et profil, notifications, sessions actives, journaux d'accès. Et surtout les deux capacités de souveraineté que la vision rattache explicitement à ce module : export complet des données et suppression ciblée ou totale.

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
