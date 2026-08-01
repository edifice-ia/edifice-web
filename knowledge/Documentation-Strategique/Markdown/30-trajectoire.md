# Trajectoire

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [La double nature de Trajectoire](#la-double-nature-de-trajectoire)
- [La symétrie avec Personnel et le brief](#la-symétrie-avec-personnel-et-le-brief)
- [Trajectoire agrège les objectifs, ne les déracine pas](#trajectoire-agrège-les-objectifs-ne-les-déracine-pas)
- [Roadmap — court terme](#roadmap--court-terme)
- [Roadmap — moyen terme](#roadmap--moyen-terme)
- [Roadmap — long terme](#roadmap--long-terme)
- [Risques transverses et mitigations](#risques-transverses-et-mitigations)

## Rôle du document

Ce document décrit l'espace Trajectoire et porte la roadmap vivante de L'Édifice. Il ne redéfinit pas la notion d'espace ni le statut d'espace singleton de Trajectoire — voir [10-architecture-systeme.md](./10-architecture-systeme.md) — et ne détaille pas l'anatomie de marque de l'espace Contenu — voir [22-espaces-et-marques.md](./22-espaces-et-marques.md).

## La double nature de Trajectoire

Trajectoire est un espace au sens strict : un conteneur de projets, d'idées, de décisions et d'opportunités, chacun une instance duplicable. Mais Trajectoire porte en plus quelque chose qu'aucun autre espace ne porte : une strate stratégique unique, posée au-dessus de ses projets, qui donne le cap plutôt que le détail — vision, objectifs de long terme, stratégie.

Cette strate organise trois niveaux en hiérarchie stricte : le **pourquoi** (la vision, ce que L'Édifice cherche à devenir), le **quoi** (les objectifs de long terme qui traduisent cette vision en direction concrète), et le **comment** (les projets et leurs actions, qui vivent dans les instances de l'espace). Un projet ne remonte jamais au pourquoi sans passer par le quoi ; un objectif de long terme ne devient jamais une action sans être d'abord décomposé en projet.

## La symétrie avec Personnel et le brief

Cette double nature répond exactement à celle d'Accueil et Personnel, mais sur un autre horizon de temps. Personnel, lu par le brief d'Accueil, donne le présent : ce qui se passe aujourd'hui, dans le corps et dans l'agenda. Trajectoire, lu par sa strate stratégique, donne le futur : où tout cela est censé mener. Les deux sont des surfaces qui lisent sans posséder — la même première règle d'or, voir [01-principes.md](./01-principes.md) — appliquée à deux échelles de temps symétriques : l'instant et le cap.

## Trajectoire agrège les objectifs, ne les déracine pas

La strate stratégique de Trajectoire agrège les objectifs en lecture, mais elle ne les possède pas et ne les déplace pas. Le moteur Objectifs est un service commun, partagé par tous — voir [20-catalogue-services.md](./20-catalogue-services.md), dont ce document ne redécrit pas le fonctionnement — mais chaque objectif reste ancré dans son contexte d'origine : l'objectif de course reste près des données Garmin dans Personnel, l'objectif d'abonnés reste près des statistiques de la marque dans Contenu. Trajectoire les fait apparaître ensemble dans une vue de cap, sans jamais devenir leur propriétaire.

## Roadmap — court terme

**Finir le pôle Personnel.** Priorité numéro un avant tout autre chantier fonctionnel — voir [02-strategie-produit.md](./02-strategie-produit.md). C'est le socle sur lequel repose l'épreuve de l'usage quotidien.

**Clore l'audit de sécurité.** Aucune nouvelle fonctionnalité ne démarre tant qu'il n'est pas clos — voir [13-securite-gouvernance.md](./13-securite-gouvernance.md).

**Google Calendar.** OAuth et synchronisation par webhook en cours de construction — voir [14-integrations.md](./14-integrations.md).

**Déblocage Garmin.** La candidature au programme développeur reste sans issue ; Health Auto Export sert de contournement actif en attendant, voir [14-integrations.md](./14-integrations.md).

## Roadmap — moyen terme

Consolider les pôles de lecture — Observatoire et Finances — une fois que Personnel produit des données fiables sur lesquelles ces synthèses peuvent s'appuyer. Étendre les intégrations de productivité au-delà de l'agenda, selon l'usage réel plutôt que par anticipation. Poursuivre ce qui est déjà natif dans l'espace Contenu — la fonction Présence & contenu — sans ouvrir les fonctions encore marquées futures, voir [22-espaces-et-marques.md](./22-espaces-et-marques.md).

## Roadmap — long terme

Généraliser l'onboarding public par questionnaire, une fois la couche de configuration éprouvée sur l'usage manuel réel — voir [11-modularite-configuration.md](./11-modularite-configuration.md). Compléter l'anatomie de marque — Acquisition, Conversion & relation, Infrastructure de marque — une fois la fonction Présence & contenu validée sur au moins une marque à pleine échelle. Ouvrir Trajectoire à un usage pleinement partagé entre plusieurs contextes, personnel et entrepreneurial, sans que l'un ne prenne le pas sur l'autre.

## Risques transverses et mitigations

**La dette de sécurité retarde indéfiniment les nouvelles fonctionnalités.** Mitigation : le séquencement est strict et borné — l'audit se clôt avant que quoi que ce soit d'autre reprenne, pas de chantier parallèle qui dilue la priorité.

**La dépendance à un fournisseur bloqué gèle une capacité entière.** Le cas Garmin illustre le risque. Mitigation : un contournement indépendant de l'approbation du fournisseur — Health Auto Export — est déjà actif plutôt qu'attendu.

**Construire pour un public qui n'existe pas encore.** Mitigation : simplicité avant généricité — voir [01-principes.md](./01-principes.md) — et séquencement construire-pour-moi-puis-généraliser — voir [02-strategie-produit.md](./02-strategie-produit.md).

**La vision cible de la marque crée une pression à tout construire en parallèle.** Mitigation : des statuts de maturité explicites — voir [22-espaces-et-marques.md](./22-espaces-et-marques.md) — qui rappellent qu'une fonction marquée future n'est pas une fonction en retard.

**La couche de configuration devient un goulot d'étranglement à l'ouverture publique.** Mitigation : elle est conçue et éprouvée dès l'usage manuel actuel, pas ajoutée après coup — voir [11-modularite-configuration.md](./11-modularite-configuration.md).
