# Architecture

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Vue d'ensemble](#vue-densemble)
- [Couches principales](#couches-principales)
- [Flux applicatifs](#flux-applicatifs)
- [Garde-fous](#garde-fous)
- [Références croisées](#références-croisées)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce document décrit les grandes couches techniques de L'Édifice. Il sert de point d'entrée avant de modifier un module, un workflow ou une table.

## Vue d'ensemble

L'Édifice est structuré autour d'une application web Next.js et d'un backend de données Supabase. Les traitements lourds ou spécialisés, comme le rendu vidéo, peuvent être déportés vers des services dédiés.

Architecture logique :

```text
Utilisateur
  -> Interface Next.js
  -> Routes API Next.js
  -> Services serveur TypeScript
  -> Supabase Database / Storage
  -> Services externes OAuth et publication
  -> Service Shorts Renderer pour rendu vidéo
```

## Couches principales

### Interface

- `app/interface` porte l'interface applicative principale.
- `components/cockpit` contient les composants du cockpit.
- `app/interface/post-creation` porte l'atelier de création.
- `app/interface/publishers` porte les espaces de publication.

### API

- `app/api/assistant/*` expose l'assistant global et les workflows.
- `app/api/content-workshop/*` expose les opérations liées aux brouillons et assets.
- `app/api/oauth/*` et routes spécifiques gèrent les connexions externes.
- `app/api/observatory/*` expose les données de monitoring.

### Services serveur

- `lib/server/assistant-workflows/engine.ts` est le moteur canonique des workflows assistant.
- `lib/server/assistant/build-project-context.ts` construit le contexte projet en lecture seule.
- `lib/server/*pipeline*` porte les étapes de génération et préparation média.
- `lib/server/oauth/*` centralise la logique OAuth côté serveur.

### Données

Supabase porte les brouillons, assets, tokens OAuth, mémoire projet, coûts, scheduling, publications et métriques. Voir [Base de données](./05_Database.md).

### Rendu vidéo

`services/shorts-renderer` est un service FastAPI destiné à rendre les vidéos Shorts à partir des manifests produits par l'application web.

## Flux applicatifs

### Assistant global

```text
Interface Assistant
  -> POST /api/assistant/global
  -> buildProjectContext
  -> planAssistantWorkflow
  -> réponse conversationnelle ou workflow confirmé
```

### Workflow Shorts

```text
Atelier ou Pilotage IA Shorts
  -> routes assistant / content-workshop
  -> analyse du brouillon
  -> génération visuels / voix / sous-titres
  -> préparation manifest vidéo
  -> rendu ou publication après validation
```

### Publication

```text
Publisher UI
  -> statut OAuth
  -> sélection contenu
  -> validation humaine
  -> route de publication contrôlée
  -> suivi Supabase
```

## Garde-fous

- Aucune publication réelle sans validation explicite.
- Aucune programmation définitive sans validation explicite.
- Aucune suppression automatique.
- Aucun secret ni token exposé côté client.
- Les workflows s'arrêtent à la première erreur technique.
- Les données projet lues par l'assistant doivent rester traçables.

## Références croisées

- [Stack](./04_Stack.md)
- [Base de données](./05_Database.md)
- [Workflows](./08_Workflows.md)
- [Conventions](./10_Conventions.md)

## À mettre à jour

- Ajouter un diagramme détaillé par domaine lorsque l'architecture se stabilise.
- Documenter les contrats API publics et internes.
- Ajouter les stratégies de cache, de retry et de monitoring.
- Décrire les environnements local, preview et production.
