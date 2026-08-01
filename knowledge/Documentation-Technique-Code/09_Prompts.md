# Prompts

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Philosophie](#philosophie)
- [Prompt de contexte projet](#prompt-de-contexte-projet)
- [Prompt de maintenance](#prompt-de-maintenance)
- [Prompt de revue](#prompt-de-revue)
- [Règles anti-dépendance modèle](#règles-anti-dépendance-modèle)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier documente les prompts utiles au projet. Les prompts ne doivent pas contenir de logique métier cachée ; ils doivent pointer vers la documentation et le code.

## Philosophie

Un bon prompt pour L'Édifice doit :

- indiquer le rôle attendu ;
- fournir les fichiers de contexte ;
- rappeler les garde-fous ;
- demander une réponse vérifiable ;
- éviter les dépendances à un fournisseur ou modèle précis.

## Prompt de contexte projet

```text
Tu travailles sur L'Édifice.

Lis d'abord knowledge/Documentation-Technique-Code/README.md, puis les fichiers
knowledge/Documentation-Technique-Code/ pertinents pour la tâche.
Considère knowledge/Documentation-Technique-Code/ comme la source de vérité
documentaire sur l'état réel du code, knowledge/Documentation-Strategique/ comme
la source de vérité sur la vision, et le code comme la source de vérité d'exécution.

Avant toute modification Next.js, lis les guides pertinents dans node_modules/next/dist/docs/.

Respecte les garde-fous :
- aucune publication réelle sans validation humaine explicite ;
- aucun secret exposé ;
- aucune suppression non demandée ;
- toute décision durable doit être documentée dans
  knowledge/Documentation-Technique-Code/03_Decisions.md ;
- tout changement structurant doit mettre à jour
  knowledge/Documentation-Technique-Code/11_Changelog.md.

Réponds avec les fichiers modifiés, les vérifications réalisées et les limites restantes.
```

## Prompt de maintenance

```text
Mets à jour la base de connaissances de L'Édifice après ce changement.

Objectif :
- identifier les fichiers knowledge/Documentation-Technique-Code/ concernés ;
- mettre à jour les sections devenues obsolètes ;
- ajouter une décision si un choix durable a été pris ;
- ajouter une entrée dans knowledge/Documentation-Technique-Code/11_Changelog.md ;
- préserver un Markdown clair, stable et compréhensible par plusieurs IA.
```

## Prompt de revue

```text
Relis ce changement comme une revue technique.

Priorité :
1. risques de régression ;
2. sécurité et secrets ;
3. garde-fous de publication ou d'automatisation ;
4. cohérence avec /knowledge ;
5. tests ou vérifications manquants.

Référence les fichiers et lignes lorsque possible.
```

## Règles anti-dépendance modèle

- Ne pas écrire "selon ChatGPT" ou "selon Claude" dans la documentation.
- Décrire les entrées, sorties, garde-fous et décisions plutôt que des instructions propres à un modèle.
- Éviter les prompts longs qui remplacent la documentation.
- Préférer des documents courts, liés entre eux et maintenus.

## Liens utiles

- [Vision](./00_Vision.md)
- [Agents](./07_Agents.md)
- [Workflows](./08_Workflows.md)
- [Conventions](./10_Conventions.md)

## À mettre à jour

- Ajouter les prompts métier réellement utilisés dans l'application.
- Distinguer prompts développeur, prompts produit et prompts assistant utilisateur.
- Ajouter des exemples de contexte minimal selon tâche.
