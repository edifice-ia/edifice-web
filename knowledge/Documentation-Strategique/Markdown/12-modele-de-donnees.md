# Modèle de données

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Le principe du graphe unique](#le-principe-du-graphe-unique)
- [Entités primaires](#entités-primaires)
- [Entités de liaison](#entités-de-liaison)
- [L'entité transversale Événement](#lentité-transversale-événement)
- [Règles de modélisation](#règles-de-modélisation)
- [Schéma relationnel simplifié](#schéma-relationnel-simplifié)

## Rôle du document

Ce document décrit comment les données de L'Édifice sont modélisées : quelles entités existent, comment elles se rattachent les unes aux autres, et selon quelles règles. Il ne redécrit pas l'architecture événementielle — voir [10-architecture-systeme.md](./10-architecture-systeme.md) — ni les gestes de suppression et leurs conséquences — voir [11-modularite-configuration.md](./11-modularite-configuration.md). Ici, l'événement et la suppression n'apparaissent que comme des éléments du graphe.

## Le principe du graphe unique

Toutes les données de L'Édifice vivent dans une seule base relationnelle. Il n'existe pas de silo de stockage parallèle par module ou par pôle : chaque entité est une table, chaque relation est une clé étrangère, et chaque relation plus complexe qu'un simple lien parent-enfant passe par une table de liaison explicite plutôt que par un champ implicite ou une convention de nommage. Un graphe unique, navigable par clés étrangères, est ce qui permet à une surface de synthèse de lire à travers plusieurs modules sans dupliquer la donnée — la condition technique de la première règle d'or (voir [01-principes.md](./01-principes.md)).

## Entités primaires

**Utilisateur.** La racine de tout le graphe. Toute autre entité remonte jusqu'à un utilisateur, directement ou par la chaîne de ses relations parentes.

**Marque.** Instance concrète de l'espace Contenu. Porte son propre nom, son propre statut, et sert de point de rattachement à toute donnée métier qui lui est propre.

**Projet.** Instance concrète de l'espace Trajectoire. Racine d'une sous-hiérarchie propre à ce projet.

**Objectif.** Rattaché à un Projet. Un projet peut porter plusieurs objectifs.

**Action.** Rattachée à un Objectif. La feuille de la hiérarchie Projet → Objectif → Action.

**Donnée de module.** Entité générique pour désigner toute donnée métier produite par un module — une nuit de sommeil, une tâche, une entrée de journal. Chaque module possède ses propres tables et son propre schéma, mais toutes partagent le même principe de rattachement : un identifiant utilisateur systématique, et, quand la donnée sert un contexte précis, un rattachement optionnel à une Marque ou à un Projet.

## Entités de liaison

**Activation module.** Rattache un Utilisateur à un module avec son état courant. C'est la table que lit et écrit la couche de configuration décrite dans [11-modularite-configuration.md](./11-modularite-configuration.md) — ce document n'en reprend pas le fonctionnement, seulement sa place dans le graphe.

**Rattachement contexte.** Table de liaison optionnelle entre une donnée de module et une Marque ou un Projet, pour les cas où une même donnée sert plusieurs contextes à la fois — une dépense qui concerne à la fois la vie personnelle et une marque, par exemple.

**Connexion source externe.** Rattache une donnée ou un utilisateur à la source tierce dont elle provient — un fournisseur, un compte, un jeton. Voir les règles de modélisation ci-dessous pour ce que cette table impose à toute donnée synchronisée.

## L'entité transversale Événement

Chaque événement publié sur le bus décrit dans [10-architecture-systeme.md](./10-architecture-systeme.md) laisse une trace dans le graphe : une ligne dans la table Événement, portant son type, le module ou service qui l'a émis, l'utilisateur concerné et un horodatage. Cette entité est transversale — elle n'appartient à aucun module en particulier — et sert de point de passage commun pour tout ce qui doit pouvoir être relu après coup : un historique d'activité, un audit, ou une réponse de l'Assistant à une question sur ce qui s'est passé.

## Règles de modélisation

**Horodatage systématique.** Chaque table porte au minimum sa date de création. Les données dont la valeur dépend du temps — une nuit de sommeil, une action réalisée — portent en plus une date ou une période métier distincte de l'horodatage technique.

**Référence à la source externe.** Toute donnée qui provient d'une synchronisation tierce porte une référence explicite à sa provenance — fournisseur, identifiant externe, charge brute reçue. Une donnée synchronisée sans cette référence est une donnée dont on ne peut plus prouver l'origine ; ce n'est pas un raccourci acceptable.

**Soft delete par défaut.** Une suppression n'efface pas physiquement une ligne par défaut : elle la marque comme retirée, en préservant l'intégrité référentielle et l'historique. La suppression physique reste possible, mais elle est l'exception délibérée réservée aux gestes qui l'exigent explicitement — voir [11-modularite-configuration.md](./11-modularite-configuration.md) pour ce que chaque geste implique réellement.

**Rattachement systématique à un identifiant utilisateur.** Aucune table n'est globale ou sans propriétaire, même une table qui ne semble concerner qu'un seul utilisateur aujourd'hui. Chaque ligne remonte à un utilisateur, directement ou par sa chaîne de clés étrangères. C'est ce qui rend la plateforme prête pour le multi-utilisateur dès l'origine, sans migration de schéma le jour où un deuxième utilisateur rejoint L'Édifice.

## Schéma relationnel simplifié

```text
UTILISATEUR (id)
  |
  +--< ACTIVATION_MODULE (utilisateur_id, module, etat)
  |
  +--< CONNEXION_SOURCE_EXTERNE (utilisateur_id, fournisseur, id_externe)
  |
  +--< DONNEE_MODULE (utilisateur_id, module, ..., marque_id?, projet_id?)
  |        |
  |        +--< RATTACHEMENT_CONTEXTE (donnee_id, marque_id?, projet_id?)
  |
  +--< MARQUE (utilisateur_id, nom, statut)
  |        |
  |        +--< DONNEE_MODULE (via marque_id)
  |
  +--< PROJET (utilisateur_id, nom, statut)
  |        |
  |        +--< OBJECTIF (projet_id, nom, progress)
  |                 |
  |                 +--< ACTION (objectif_id, effort_level, statut)
  |
  +--< EVENEMENT (utilisateur_id, type, source, horodatage, payload)
```
