# Modules

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-08

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Modules cockpit](#modules-cockpit)
- [Modules de création](#modules-de-création)
- [Modules de publication](#modules-de-publication)
- [Modules d'observation](#modules-dobservation)
- [Modules personnels](#modules-personnels)
- [Service renderer](#service-renderer)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier cartographie les modules fonctionnels du produit et leurs responsabilités.

## Modules cockpit

### Assistant de L'Édifice

Point central de conversation, analyse et orchestration. Il s'appuie sur :

- `lib/server/assistant/build-project-context.ts`
- `lib/server/assistant/global-assistant.ts`
- `lib/server/assistant-workflows/engine.ts`
- `components/cockpit/AssistantCommandCenter.tsx`

### Cockpit général

Vue d'ensemble des modules, statuts, risques et ressources. Fichiers principaux :

- `app/interface`
- `components/cockpit`
- `lib/cockpit`
- `types/cockpit.ts`

### Ressources

Espace documentaire et liens utiles dans l'interface. À maintenir avec `/knowledge` sans le remplacer.

## Modules de création

### Atelier de contenu

Zone de création et préparation des contenus. Elle couvre notamment les Shorts et Pinterest.

### Atelier Shorts

Pipeline éditorial pour brouillons, visuels, voix, sous-titres, préparation vidéo, scheduling et publication.

Fichiers importants :

- `app/interface/post-creation/shorts`
- `lib/server/media-pipeline.ts`
- `lib/server/voice-pipeline.ts`
- `lib/server/subtitle-pipeline.ts`
- `lib/server/video-preparation.ts`
- `lib/server/shorts-scheduling.ts`

### Pinterest

Gestion de bibliothèque, suggestions de tableaux, reviews et publication test contrôlée.

Fichiers importants :

- `components/pinterest`
- `lib/server/pinterest-publisher.ts`
- `lib/server/pinterest-reviews.ts`
- `scripts/sync-pinterest-to-supabase.mjs`

## Modules de publication

### YouTube Publisher

Workflow UI pour l'API YouTube, avec publication réelle contrôlée.

### Pinterest Publisher

Sélection des pins prêts, choix du tableau cible et publication d'un pin test confirmé.

### TikTok, Meta et Instagram

Routes de statut, OAuth et tests de publication existent. Les workflows doivent rester sous validation humaine et dépendre des statuts de review externe lorsque nécessaire.

## Modules d'observation

### Observatoire

Regroupe signaux, alertes, coûts et état système. Fichiers clés :

- `lib/server/observatory/read-model.ts`
- `app/interface/monitoring`
- `app/api/observatory`

### Coûts

Le suivi de coût est porté par `cost_events`, `lib/server/cost-tracking.ts` et les scripts de vérification.

### Trajectoire

Module objectifs/projets/actions. Fichiers clés :

- `app/interface/trajectoire`
- `lib/server/trajectoire.ts`
- tables `trajectoire_*`

## Modules personnels

### Personnel (Espace intérieur)

OS personnel distinct du cockpit éditorial : suivi d'énergie, sommeil, sport, objectifs, routines, journal et notes. Sert de surface de lecture pour des connecteurs de données externes et de croisement en lecture seule avec Trajectoire.

Fichiers clés :

- `app/interface/personnel` : `page.tsx` et `PersonalDashboardClient.tsx`, onglets Résumé, Énergie, Sommeil, Sport, Objectifs, Tâches, Routines, Journal, Notes, Calendrier, Sources.
- `lib/personal/connectors` : registre générique de connecteurs (`registry.ts`, `types.ts`, `sync.ts`, `index.ts`) et un fichier par connecteur (`garmin.ts`, `strava.ts`, `notion.ts`, `finance.ts`, `calendar.ts`).

Le style UI de `PersonalDashboardClient.tsx` est volontairement distinct des conventions `components/cockpit` (composants locaux `PersonalModuleCard`, `PersonalSection`, `PersonalEmptyState`, palette propre). Ce n'est pas une dette à corriger : le module Personnel n'est pas un module cockpit et ne doit pas être harmonisé avec lui.

Le registre `lib/personal/connectors/registry.ts` est conçu pour accueillir plusieurs connecteurs sans réécriture : chaque connecteur déclare son statut (`À connecter`, `Préparé`, `Indisponible`), ses capacités et ses variables d'environnement requises. Statut réel par connecteur :

- **Garmin** : connecteur actif en développement. Voir [Décisions](./03_Decisions.md) DEC-005 et DEC-006.
- **Strava, Notion, Finance, Calendrier** : stubs déclarés pour usage futur, non implémentés. `syncPersonalConnector` renvoie `success: false` tant qu'un connecteur n'est pas branché.

Tables associées : `personal_garmin_daily_stats`, `personal_daily_briefs`. Voir [Base de données](./05_Database.md).

## Service renderer

`services/shorts-renderer` est un service FastAPI séparé. Il consomme les manifests vidéo stockés dans Supabase Storage et produit des MP4.

## Liens utiles

- [Architecture](./01_Architecture.md)
- [Agents](./07_Agents.md)
- [Workflows](./08_Workflows.md)

## À mettre à jour

- Ajouter un propriétaire fonctionnel ou technique par module.
- Ajouter le statut réel de chaque module en production.
- Ajouter les dépendances externes par module.
- Ajouter les écrans et routes API par module.
