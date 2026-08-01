# Architecture système

Statut : source de vérité — document clé de voûte
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [La hiérarchie en cinq niveaux](#la-hiérarchie-en-cinq-niveaux)
- [Carte complète](#carte-complète)
- [Stack technique](#stack-technique)
- [Architecture orientée événements](#architecture-orientée-événements)

## Rôle du document

Ce document définit la structure sur laquelle tous les autres documents s'appuient : la hiérarchie Plateforme → Services communs → Modules → Pôles/Espaces → Marques & Projets. Toute décision de conception qui touche à « où range-t-on cette chose » doit pouvoir se trancher en lisant ce document. Il ne détaille ni la couche de configuration — voir [11-modularite-configuration.md](./11-modularite-configuration.md) — ni le modèle de données entité par entité — voir [12-modele-de-donnees.md](./12-modele-de-donnees.md).

## La hiérarchie en cinq niveaux

### 1. Plateforme

L'Édifice lui-même. Le niveau qui n'a pas de valeur métier propre : c'est le contenant de tout ce qui suit, jamais un objet qu'on manipule directement.

### 2. Services communs

Un service commun est une capacité technique mutualisée, sans valeur métier propre, consommée par les pôles et les espaces, jamais dupliquée. Il en existe un seul exemplaire dans toute la plateforme, quel que soit le nombre de modules ou d'espaces qui s'en servent.

**Test de décision.** Un service commun n'est pas un endroit qu'on « visite » — c'est de la plomberie que d'autres choses utilisent. Si l'utilisateur ouvre une surface pour la consulter directement, ce n'est pas un service commun. Si la capacité travaille en coulisse pour que d'autres surfaces fonctionnent, sans jamais être elle-même une destination, c'est un service commun.

Exemples : Auth, OAuth, Stockage, Event bus, Notifications, IA, Automatisations, Météo, Publication, CRM (moteur), Emailing, Tunnels/Pages, Domaines/Infra, Objectifs (moteur).

### 3. Modules

Un module est un domaine de vie qui produit de la donnée métier et se consulte. Contrairement au service commun, un module a un contenu propre qu'on vient voir pour lui-même : mon sommeil, mes tâches, mon journal.

Exemples : agenda, sport, sommeil, nutrition, habitudes, journal, tâches, notes, santé.

Un module ne s'affiche jamais seul au premier niveau de navigation : il est composé à l'intérieur d'un pôle ou d'un espace. C'est cette composition, et non le module isolé, qui constitue une surface visitable.

### 4. Pôles et Espaces

Ce niveau distingue deux natures de surfaces, toutes deux composées de modules et de services communs, mais selon une logique de cardinalité opposée.

**Pôle : surface unique, non duplicable, qui compose des modules et services.** Il en existe exactement un exemplaire par plateforme. Les 5 pôles : Accueil, Personnel, Assistant, Observatoire, Finances.

**Espace : conteneur d'instances duplicables.** Sa raison d'être n'est pas de composer des modules pour offrir une vue, mais d'accueillir un nombre variable d'instances que l'utilisateur crée, fait vivre et peut multiplier : Contenu (contient N marques) et Trajectoire (contient N projets).

**Test de décision.** Une surface qui compose des modules et services pour donner une vue, sans elle-même contenir d'instances qu'on crée et qu'on duplique, est un pôle. Une surface dont le contenu réel est fait d'instances qu'on crée, duplique et fait vivre indépendamment est un espace — l'espace n'est que le conteneur, l'instance porte la valeur.

**Le cas Trajectoire : espace singleton.** Trajectoire contient des instances duplicables — des projets — ce qui en fait un espace par nature, pas un pôle. Mais il n'existe qu'un seul Trajectoire dans toute la plateforme : sa cardinalité au niveau du conteneur est celle d'un pôle, même si son contenu suit la logique d'un espace. D'où le terme d'espace singleton : espace par nature de son contenu, singleton par cardinalité du conteneur. Trajectoire porte en plus une strate stratégique qui agrège en lecture les projets qu'il contient, sans jamais les posséder — cette strate applique la première règle d'or (voir [01-principes.md](./01-principes.md)) : elle lit, elle ne possède pas.

**Une note de nommage.** « Pôle » et « espace » sont du vocabulaire d'architecture — il sert la documentation et le code. À l'écran, les noms sont nus, sans préfixe : on affiche « Personnel », jamais « Pôle Personnel ».

**Hors taxonomie.** Réglages et Ressources sont deux surfaces uniques supplémentaires de la plateforme. Elles ne sont comptées ni parmi les 5 pôles ni parmi les espaces : ce sont des surfaces système — l'une pour la configuration, l'autre pour la ressource documentaire — dont le détail relève d'autres documents.

### 5. Marques et Projets

Les marques et les projets sont les instances concrètes qui vivent à l'intérieur d'un espace : une marque dans Contenu (par exemple Lignes Intérieures, Tarot & Divination, Future Influenceuse IA), un projet dans Trajectoire. Une instance compose des services communs avec ses propres données ; elle ne recode rien de ce qui existe déjà en dessous.

## Carte complète

```text
  SERVICES COMMUNS  (plomberie mutualisee, jamais visitee)
  Auth . OAuth . Stockage . Event bus . Notifications . IA
  Automatisations . Meteo . Publication . CRM (moteur) . Emailing
  Tunnels/Pages . Domaines/Infra . Objectifs (moteur)
                              |
                              | consommes par
                              v
  MODULES  (domaines de vie, produisent de la donnee metier)
  agenda . sport . sommeil . nutrition . habitudes . journal
  taches . notes . sante . ...
                              |
                              | composes par
                              v
  POLES  (surfaces uniques, non duplicables)
  ┌─────────┬───────────┬───────────┬──────────────┬──────────┐
  │ Accueil │ Personnel │ Assistant │ Observatoire │ Finances │
  └─────────┴───────────┴───────────┴──────────────┴──────────┘

  ESPACES  (conteneurs d'instances duplicables)
  ┌────────────────────────────┬────────────────────────────────┐
  │ Contenu                    │ Trajectoire (espace singleton) │
  │  -> N marques              │  -> N projets                  │
  │     Lignes Interieures     │     + strate strategique       │
  │     Tarot & Divination     │       (lecture agregee,        │
  │     Future Influenceuse IA │       cf. regle d'or n.1)      │
  └────────────────────────────┴────────────────────────────────┘
                              |
                              v
  MARQUES & PROJETS  (instances concretes)
  composent des services communs avec leurs propres donnees ;
  ne recodent rien.

  Hors taxonomie pole/espace, surfaces uniques du systeme :
  Reglages . Ressources
```

## Stack technique

- **Frontend** : Next.js, déployé sur Vercel.
- **Backend** : FastAPI, déployé sur Vercel — pas sur Railway. Railway est réservé au seul traitement vidéo du module Contenu.
- **Données, authentification, stockage** : Supabase.
- **Traitement vidéo** : Railway, exclusivement pour le rendu vidéo du Contenu — aucun autre composant ne dépend de Railway.
- **DNS** : Cloudflare.

Cette répartition est une correction délibérée par rapport à une ancienne hypothèse de déploiement : le backend n'a jamais eu besoin de Railway. Railway existe dans la stack pour une seule raison — le traitement vidéo — et ne doit pas en acquérir d'autres par glissement.

## Architecture orientée événements

L'Édifice communique en interne par un bus d'événements — un des services communs listés plus haut. Un module, un pôle ou un espace qui produit un changement d'état publie un événement ; il n'appelle jamais directement un autre composant pour lui dire quoi faire. Les composants intéressés s'abonnent aux événements qui les concernent, sans que le producteur ait besoin de savoir qui écoute, ni même si quelqu'un écoute.

Cette architecture est la traduction technique directe de la deuxième règle d'or — aucun composant ne présume de l'existence d'un autre, voir [01-principes.md](./01-principes.md). Désactiver un module revient à faire taire ses événements : les composants abonnés n'ont simplement plus rien à recevoir, sans jamais planter faute d'interlocuteur.
