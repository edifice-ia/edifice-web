# Conventions

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Documentation](#documentation)
- [Code](#code)
- [Next.js](#nextjs)
- [Données](#données)
- [Sécurité](#sécurité)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier rassemble les conventions transverses. Il doit aider les humains et IA à produire des changements cohérents avec le dépôt.

## Documentation

- `/knowledge` contient la source de vérité documentaire.
- Chaque fichier doit garder un sommaire.
- Les liens croisés doivent être ajoutés dès qu'un concept dépend d'un autre fichier.
- Toute information incertaine doit aller dans une section "À mettre à jour" plutôt que dans une affirmation fragile.
- Les décisions durables doivent être ajoutées dans [Décisions](./03_Decisions.md).
- Les changements structurants doivent être ajoutés dans [Changelog](./11_Changelog.md).

## Code

- Respecter les patterns existants du dépôt.
- Préférer les services serveur dans `lib/server` pour les opérations sensibles.
- Ne pas exposer de secrets côté client.
- Garder les routes API comme couche d'entrée, pas comme dépôt de logique métier volumineuse.
- Ajouter des tests ou scripts de vérification lorsque le risque augmente.

## Next.js

Cette version de Next.js est explicitement signalée comme différente des connaissances générales. Avant toute modification de code Next.js, lire la documentation locale pertinente dans `node_modules/next/dist/docs/`.

Conventions observées :

- App Router dans `app`.
- Routes API dans `app/api`.
- Composants cockpit dans `components/cockpit`.
- Accès Supabase client/serveur séparés dans `src/lib/supabase`.

## Données

- Tout changement de schéma passe par `supabase/migrations`.
- Les tables doivent être ajoutées à [Base de données](./05_Database.md).
- Les statuts métier doivent être documentés lorsqu'ils pilotent un workflow.
- Les écritures sensibles doivent être auditables.

## Sécurité

- Aucune publication réelle sans confirmation explicite.
- Aucune programmation définitive sans confirmation explicite.
- Aucune suppression automatique non demandée.
- Aucun token OAuth ni secret Supabase côté client.
- Les services internes doivent utiliser un secret partagé ou une authentification serveur.

## Liens utiles

- [Stack](./04_Stack.md)
- [Base de données](./05_Database.md)
- [Workflows](./08_Workflows.md)
- [Prompts](./09_Prompts.md)

## À mettre à jour

- Ajouter une convention de nommage complète des statuts.
- Ajouter les règles de tests par type de changement.
- Ajouter les conventions UI détaillées.
- Ajouter la politique de versioning documentaire.
