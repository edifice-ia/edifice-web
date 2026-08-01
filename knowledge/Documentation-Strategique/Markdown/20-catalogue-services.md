# Catalogue des services communs

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Ce qui dissout l'ancien monolithe](#ce-qui-dissout-lancien-monolithe)
- [Auth](#auth)
- [OAuth et Connexions](#oauth-et-connexions)
- [Stockage](#stockage)
- [Event bus](#event-bus)
- [Notifications](#notifications)
- [IA](#ia)
- [Automatisations](#automatisations)
- [Météo](#météo)
- [Publication](#publication)
- [CRM (moteur)](#crm-moteur)
- [Emailing](#emailing)
- [Tunnels et Pages](#tunnels-et-pages)
- [Domaines et Infra](#domaines-et-infra)
- [Objectifs (moteur)](#objectifs-moteur)

## Rôle du document

Ce document décrit chacun des services communs de L'Édifice : son rôle, qui le consomme, ce qu'il mutualise. Il ne décrit ni les pôles ni les espaces eux-mêmes — voir [21-poles.md](./21-poles.md) et [22-espaces-et-marques.md](./22-espaces-et-marques.md) — seulement la plomberie qu'ils partagent tous.

## Ce qui dissout l'ancien monolithe

Il existait une version de L'Édifice où « Contenu » était un module unique censé tout faire pour une marque : ses contacts, ses campagnes d'email, ses pages, sa publication, ses objectifs. Cette version n'existe plus. Chacune de ces capacités est désormais un service commun autonome, et une marque ne les recode jamais — elle les **instancie** avec ses propres données.

C'est la différence entre construire un CRM pour chaque marque et brancher chaque marque sur le même moteur de CRM avec ses propres contacts. La seconde option est celle que L'Édifice retient partout dans ce catalogue.

## Auth

**Rôle.** Authentifier l'utilisateur et garantir que chaque action retombe sur un identifiant utilisateur unique, base du modèle de données — voir [12-modele-de-donnees.md](./12-modele-de-donnees.md).

**Consommé par.** Toutes les surfaces sans exception. Aucun pôle, espace ou marque n'implémente sa propre authentification.

**Ce qu'il mutualise.** La vérification d'identité et la session — une fois pour toute la plateforme, jamais reconstruite ailleurs.

## OAuth et Connexions

**Rôle.** Gérer le cycle de connexion à un service tiers — autorisation, jeton, rafraîchissement, révocation — de façon uniforme, quel que soit le fournisseur.

**Consommé par.** Personnel (Garmin, Google Calendar), les marques de Contenu (YouTube, TikTok, Instagram, Pinterest...), Finances (Stripe).

**Ce qu'il mutualise.** Le protocole de connexion lui-même. Chaque nouvelle intégration — voir [14-integrations.md](./14-integrations.md) — branche un fournisseur sur ce mécanisme plutôt que d'écrire son propre flux d'autorisation.

## Stockage

**Rôle.** Conserver fichiers, médias et documents, avec leurs métadonnées de provenance.

**Consommé par.** Contenu (assets de marque), Ressources (documents), Personnel (exports).

**Ce qu'il mutualise.** L'espace de stockage et ses règles d'accès. Un fichier n'est jamais dupliqué pour deux surfaces qui doivent y accéder.

## Event bus

**Rôle.** Faire circuler les événements produits par un composant vers tout composant abonné, sans lien direct entre le producteur et le consommateur — voir l'architecture événementielle dans [10-architecture-systeme.md](./10-architecture-systeme.md), que ce document ne redécrit pas.

**Consommé par.** Tous les pôles, espaces et modules qui publient ou écoutent un changement d'état.

**Ce qu'il mutualise.** Le canal de communication interne. Aucun composant ne possède sa propre file d'événements privée.

## Notifications

**Rôle.** Livrer une alerte ou un rappel à l'utilisateur, quel que soit le canal choisi.

**Consommé par.** Accueil (le brief), Observatoire (les alertes), Assistant (les relances), et toute marque qui doit signaler un événement de performance.

**Ce qu'il mutualise.** La logique d'envoi et le choix du canal — voir [14-integrations.md](./14-integrations.md) pour les canaux disponibles. Un module ne décide jamais lui-même comment un message part ; il demande au service de le livrer.

## IA

**Rôle.** Fournir la capacité de raisonnement et de génération qui alimente aussi bien un brief borné qu'une conversation transversale. Un cerveau, plusieurs portées.

**Consommé par.** Accueil, avec une portée étroite bornée au contexte du jour pour construire le brief ; Assistant, avec une portée large, transversale à toute la plateforme ; et tout module qui a ponctuellement besoin d'une génération.

**Ce qu'il mutualise.** Le moteur lui-même. Il n'existe pas un moteur pour le brief et un autre pour l'Assistant — seulement une portée différente donnée à la même capacité selon le contexte qui l'invoque.

## Automatisations

**Rôle.** Exécuter une chaîne déclencheur → condition → action → journalisation, de façon générique, pour tout module ou toute marque qui a besoin d'automatiser une tâche répétitive — application directe du principe « tout automatiser », voir [01-principes.md](./01-principes.md).

**Consommé par.** Tout pôle, espace ou marque qui définit une règle — par exemple republier un contenu qui performe, ou relancer un contact resté sans réponse.

**Ce qu'il mutualise.** Le moteur de règles. Chaque nouvelle automatisation configure ce moteur ; elle ne code pas sa propre boucle de vérification.

## Météo

**Rôle.** Fournir les conditions et prévisions du jour.

**Consommé par.** Accueil (le brief), Personnel (planification d'une sortie sportive en extérieur).

**Ce qu'il mutualise.** L'appel au fournisseur météo et sa mise en cache — un seul point d'accès, jamais un appel par module qui en aurait besoin.

## Publication

**Rôle.** Pousser un contenu prêt vers un réseau social externe, sous le contrôle de validation humaine requis avant toute publication réelle — voir [01-principes.md](./01-principes.md).

**Consommé par.** Chaque marque de l'espace Contenu, pour ses propres canaux connectés.

**Ce qu'il mutualise.** La mécanique d'envoi vers chaque plateforme — voir [14-integrations.md](./14-integrations.md). Une marque n'écrit jamais sa propre intégration YouTube ; elle utilise celle qui existe déjà pour toutes.

## CRM (moteur)

**Rôle.** Suivre des contacts et des opportunités, génériquement, indépendamment de qui les utilise.

**Consommé par.** Chaque marque qui gère une audience ou des partenariats, et potentiellement Finances pour le suivi d'opportunités commerciales.

**Ce qu'il mutualise.** Le modèle de contact et d'opportunité. Une marque instancie ses propres contacts dans ce moteur ; elle ne construit jamais sa propre base isolée.

## Emailing

**Rôle.** Envoyer des campagnes et des séquences d'emails.

**Consommé par.** Chaque marque qui communique avec une liste d'abonnés.

**Ce qu'il mutualise.** La mécanique d'envoi, de séquençage et de suivi de délivrabilité — commune à toutes les marques, jamais reconstruite par l'une d'elles.

## Tunnels et Pages

**Rôle.** Construire des pages web ou des tunnels de conversion sans développement dédié à chaque fois.

**Consommé par.** Chaque marque qui a besoin d'une page de capture, de vente ou de présentation.

**Ce qu'il mutualise.** Le moteur de construction de page. Une marque compose ses pages avec cet outil ; elle ne fait jamais développer une page sur mesure à part.

## Domaines et Infra

**Rôle.** Gérer les noms de domaine et leur rattachement technique.

**Consommé par.** Chaque marque qui a un nom de domaine propre, et la plateforme elle-même pour son propre domaine.

**Ce qu'il mutualise.** La gestion DNS et le provisionnement — voir Cloudflare dans [14-integrations.md](./14-integrations.md) pour le fournisseur concret ; ici, le service qui l'orchestre.

## Objectifs (moteur)

**Rôle.** Gérer des jalons, calculer une progression, déclencher une alerte quand un objectif dérive de sa trajectoire.

**Consommé par.** Trajectoire (objectifs de projet), Personnel (objectif de course, de sommeil), toute marque qui suit un objectif d'audience ou de revenu.

**Ce qu'il mutualise.** Le mécanisme de suivi lui-même — mais jamais l'objectif : un objectif reste ancré dans son contexte, l'objectif de course près des données Garmin, l'objectif d'abonnés près des statistiques de la marque, conformément à la première règle d'or — voir [01-principes.md](./01-principes.md). Le moteur ne possède aucun objectif ; il sait seulement calculer une progression et déclencher une alerte quand on le lui demande depuis son contexte d'origine.
