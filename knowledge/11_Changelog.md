# Changelog

Statut : journal initial  
Dernière mise à jour : 2026-07-11

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Format](#format)
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
