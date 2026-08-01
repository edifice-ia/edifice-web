# Agents

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Définition](#définition)
- [Agents identifiés](#agents-identifiés)
- [Garde-fous communs](#garde-fous-communs)
- [Mémoire et décisions](#mémoire-et-décisions)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier décrit les agents logiques du projet. Un agent peut être un assistant conversationnel, un orchestrateur de workflow, un publisher contrôlé ou un service automatique.

## Définition

Dans L'Édifice, un agent n'est pas nécessairement un modèle d'IA. C'est une responsabilité opérationnelle capable de lire un état, proposer ou exécuter une action, puis produire un résultat traçable.

## Agents identifiés

### Assistant global

Responsabilité : répondre, analyser, organiser et déclencher un workflow lorsque l'intention d'action est détectée.

Références :

- `lib/server/assistant/global-assistant.ts`
- `lib/server/assistant-workflows/engine.ts`
- `app/api/assistant/global/route.ts`

### Workflow Engine

Responsabilité : construire un plan, estimer coût et durée, vérifier les dépendances, attendre confirmation, exécuter les actions sûres et produire un rapport.

Garde-fou : seules les actions dans la liste sûre sont exécutées automatiquement.

### Orchestrateur Shorts

Responsabilité : analyser les brouillons Shorts et proposer l'étape suivante : visuels, voix, sous-titres, vidéo, planning ou publication.

Références :

- `lib/server/assistant-actions/shorts.ts`
- `app/api/assistant/shorts-orchestrator/route.ts`

### Publishers

Responsabilité : préparer et exécuter les publications contrôlées vers les plateformes externes.

Garde-fou : publication réelle uniquement après validation humaine explicite.

### Observatoire

Responsabilité : lire les signaux projet, détecter les risques et fournir une vue read-only à l'assistant.

### Renderer Shorts

Responsabilité : consommer un job et un manifest vidéo, rendre le MP4, puis mettre à jour le job dans Supabase.

## Garde-fous communs

- Pas de publication réelle automatique.
- Pas de programmation définitive automatique.
- Pas de suppression automatique.
- Pas d'exposition de secrets.
- Pas de modification OAuth non confirmée.
- Journaliser les actions sensibles.
- Séparer proposition, confirmation et exécution.

## Mémoire et décisions

Deux tables structurent la mémoire opérationnelle :

- `project_memory` pour la mémoire projet ;
- `assistant_decision_memory` pour les décisions recommandées et confirmées.

La mémoire ne doit pas devenir une boîte noire. Toute décision structurante doit être répercutée dans [Décisions](./03_Decisions.md).

## Liens utiles

- [Workflows](./08_Workflows.md)
- [Prompts](./09_Prompts.md)
- [Base de données](./05_Database.md)

## À mettre à jour

- Décrire les permissions exactes par agent.
- Ajouter une matrice actions sûres / actions sensibles / actions interdites.
- Ajouter les formats de logs attendus.
- Documenter les futures persistances de workflows.
