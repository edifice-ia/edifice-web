# Vision de L'Édifice

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Vision produit](#vision-produit)
- [Principes directeurs](#principes-directeurs)
- [Indépendance vis-à-vis des IA](#indépendance-vis-à-vis-des-ia)
- [Périmètre actuel](#périmètre-actuel)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier décrit la direction de long terme de L'Édifice. Il doit permettre à une personne ou à un modèle d'IA, quel qu'il soit, de comprendre rapidement le sens du projet avant de lire l'architecture, la base de données ou les workflows.

## Vision produit

L'Édifice est un cockpit personnel et éditorial destiné à organiser, produire, piloter et publier du contenu avec des garde-fous humains. Le projet rassemble plusieurs dimensions :

- un cockpit central pour suivre l'état du système ;
- un atelier de contenu orienté Shorts, visuels, voix, sous-titres et vidéo ;
- des connecteurs et publishers pour YouTube, Pinterest, TikTok, Meta et Instagram ;
- une mémoire projet consultable par l'assistant ;
- un observatoire pour les coûts, les performances et les risques ;
- une trajectoire personnelle/projet pour garder le cap.

## Principes directeurs

1. La documentation prime sur la mémoire implicite d'un assistant.
2. Les décisions importantes doivent être explicites, datées et reliées au code.
3. Les actions sensibles restent contrôlées par validation humaine.
4. Les secrets, tokens et accès externes restent côté serveur.
5. Les workflows doivent être lisibles avant d'être exécutables.
6. Le projet doit pouvoir être compris par ChatGPT, Claude, Gemini ou tout autre LLM sans dépendre d'un prompt propriétaire.

## Indépendance vis-à-vis des IA

L'objectif n'est pas de supprimer l'usage de l'IA, mais de rendre le projet indépendant d'un modèle précis. Pour cela :

- les informations stables vivent dans `/knowledge` ;
- les conventions et décisions sont écrites en Markdown lisible ;
- les prompts sont documentés comme interfaces, pas comme logique métier cachée ;
- les workflows sont décrits par étapes et garde-fous ;
- les modules critiques sont rattachés à des fichiers du dépôt.

## Périmètre actuel

Le dépôt est une application Next.js avec App Router, React, Supabase, TypeScript et Tailwind. Il contient également un service Python FastAPI pour le rendu des Shorts.

Les zones déjà visibles dans le code sont :

- interface et cockpit : `app/interface`, `components/cockpit`, `lib/cockpit` ;
- assistant et workflows : `lib/server/assistant`, `lib/server/assistant-workflows` ;
- atelier Shorts : `app/interface/post-creation/shorts`, `lib/server/*pipeline*` ;
- publication : `app/interface/publishers`, `lib/server/*publication*`, routes OAuth ;
- données : migrations Supabase dans `supabase/migrations` ;
- rendu vidéo : `services/shorts-renderer`.

## Liens utiles

- [Architecture](./01_Architecture.md)
- [Roadmap](./02_Roadmap.md)
- [Décisions](./03_Decisions.md)
- [Modules](./06_Modules.md)
- [Agents](./07_Agents.md)

## À mettre à jour

- Clarifier la promesse produit finale en une phrase publique.
- Ajouter les audiences cibles prioritaires.
- Décrire les indicateurs de succès business, éditoriaux et techniques.
- Ajouter les limites assumées du produit.
