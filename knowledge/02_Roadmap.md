# Roadmap

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Lecture de la roadmap](#lecture-de-la-roadmap)
- [Court terme](#court-terme)
- [Moyen terme](#moyen-terme)
- [Long terme](#long-terme)
- [Principes de priorisation](#principes-de-priorisation)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce document garde la trajectoire fonctionnelle et technique du projet. Il doit rester lisible plusieurs années et éviter de mélanger objectifs, tâches et décisions.

## Lecture de la roadmap

La roadmap est volontairement structurée par horizon plutôt que par dates strictes. Les dates précises doivent être ajoutées lorsque les jalons sont engagés.

## Court terme

- Stabiliser la base de connaissances `/knowledge`.
- Relier chaque module critique à une documentation maintenue.
- Consolider le cockpit et l'observatoire comme lecture fiable de l'état projet.
- Clarifier les garde-fous des workflows assistant.
- Maintenir les tests de cohérence existants pour coûts, scheduling, assets et workflows Shorts.
- Vérifier que le pipeline Shorts reste compréhensible sans connaissance implicite.

## Moyen terme

- Persister les workflows assistant en base.
- Ajouter un journal de confirmation dédié pour les actions sensibles.
- Renforcer le suivi des publications et performances.
- Formaliser le contrat entre application web et service `shorts-renderer`.
- Compléter la documentation des connecteurs OAuth.
- Décrire les règles d'exploitation production.

## Long terme

- Rendre le cockpit capable de piloter plusieurs projets ou marques.
- Industrialiser la génération et publication multicanal avec audit humain.
- Séparer clairement mémoire projet, mémoire assistant et métriques opérationnelles.
- Définir des standards de migration lorsque la stack évolue.
- Conserver une documentation portable entre humains, IA et outils d'automatisation.

## Principes de priorisation

1. Sécurité et garde-fous avant automatisation.
2. Observabilité avant orchestration complexe.
3. Contrats stables avant optimisation.
4. Documentation maintenue avec le code.
5. Dette connue explicitement plutôt que logique implicite.

## Liens utiles

- [Vision](./00_Vision.md)
- [Décisions](./03_Decisions.md)
- [Modules](./06_Modules.md)
- [Changelog](./11_Changelog.md)

## À mettre à jour

- Ajouter les jalons datés.
- Associer les priorités à des issues ou tâches.
- Ajouter les critères de sortie par phase.
- Ajouter les dépendances externes bloquantes.
