# Glossaire

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Glossaire](#glossaire-1)

## Rôle du document

Ce document rassemble les définitions courtes et canoniques du vocabulaire de L'Édifice, par ordre alphabétique. Chaque définition renvoie au document où le concept est développé en profondeur ; en cas de doute sur une nuance, ce document de référence prime toujours sur une reformulation faite ailleurs.

## Glossaire

**Assistant.** Pôle transversal au-dessus de la capacité IA en portée large. Voit tout, en focus : priorise le contexte actif sans cloisonnement dur, sans jamais posséder ce qu'il lit. Voir [21-poles.md](./21-poles.md).

**Brief du jour.** Vue calculée en lecture, montée par Accueil au démarrage, qui s'adapte aux modules activés et affiche les recommandations de l'IA en portée perso. Voir [21-poles.md](./21-poles.md).

**Corrélation.** Le fait de mettre en relation deux données issues de contextes différents pour en tirer une lecture qu'aucune des deux, prise seule, ne donnerait — la capacité de long terme que L'Édifice cherche à développer. Voir [00-manifeste.md](./00-manifeste.md).

**Couche de configuration.** Mécanisme unique qui répond à la question « qu'est-ce qui est allumé pour cet utilisateur, dans ce contexte ? », accessible par trois entrées : le focus de l'Assistant, l'activation des modules dans Réglages, et l'onboarding public. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Désactiver.** Geste qui coupe la synchronisation, les workers et l'affichage d'un module, sans détruire son historique — qui reste lisible par l'IA à la demande. Décision d'économie, jamais de vie privée. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Dette de sommeil.** Écart cumulé entre le sommeil réellement obtenu et le sommeil nécessaire à une récupération complète, mesuré par le module Sommeil pour informer la priorisation par l'énergie. Voir [23-modules.md](./23-modules.md).

**Espace.** Conteneur d'instances duplicables, par opposition au pôle qui est une surface unique. Contenu et Trajectoire sont les deux espaces de L'Édifice. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Espace singleton.** Un espace dont le contenu suit la logique d'instances duplicables, mais dont le conteneur lui-même n'existe qu'en un seul exemplaire. Trajectoire est le seul espace singleton de L'Édifice. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Event bus.** Service commun qui fait circuler les événements d'un composant producteur vers tout composant abonné, sans lien direct entre eux. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Exporter.** Geste qui sort les données de l'utilisateur dans un format exploitable, indépendant des quatre autres gestes et pouvant les précéder tous. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Focus.** Le filtre, porté par la couche de configuration, qui restreint l'ensemble des pôles, espaces et modules considérés comme pertinents dans un contexte donné — par exemple le focus perso ou pro de l'Assistant. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Indice de récupération.** Donnée dérivée du module Sommeil, calculée à partir des métriques brutes de forme physique, utilisée pour prioriser les actions du jour. Voir [23-modules.md](./23-modules.md).

**Marque.** Instance concrète de l'espace Contenu — par exemple Lignes Intérieures ou Tarot & Divination. Compose des services communs avec ses propres données ; ne recode rien. Voir [22-espaces-et-marques.md](./22-espaces-et-marques.md).

**Masquer.** Geste qui retire un module de la navigation sans toucher à sa synchronisation ni à ses workers, qui continuent de tourner. Un geste de rangement, sans conséquence sur le coût ni sur la donnée. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Module.** Domaine de vie qui produit de la donnée métier et se consulte, composé à l'intérieur d'un pôle ou d'un espace plutôt qu'affiché seul. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Niveau de confiance.** Le degré d'autonomie accordé à une action ou une automatisation. Il grandit avec ce que le système prouve, jamais accordé par défaut. Voir [00-manifeste.md](./00-manifeste.md).

**Niveau d'énergie.** L'état réel de la personne — sommeil, charge, récupération — croisé avec ce qui est possible, pour décider ce qui mérite d'être fait aujourd'hui. Voir [01-principes.md](./01-principes.md).

**Plateforme.** L'Édifice lui-même : le niveau qui contient tout ce qui suit, sans valeur métier propre. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Pôle.** Surface unique, non duplicable, qui compose des modules et des services communs. Il en existe cinq : Accueil, Personnel, Assistant, Observatoire, Finances. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Projet.** Instance concrète de l'espace Trajectoire, racine d'une hiérarchie propre faite d'objectifs et d'actions. Voir [12-modele-de-donnees.md](./12-modele-de-donnees.md).

**Service commun.** Capacité technique mutualisée, sans valeur métier propre, consommée par les pôles et les espaces, jamais dupliquée. Ce n'est pas un endroit qu'on visite, c'est de la plomberie que d'autres choses utilisent. Voir [10-architecture-systeme.md](./10-architecture-systeme.md).

**Strate stratégique.** Couche unique posée au-dessus des projets de Trajectoire, qui agrège en lecture la vision, les objectifs de long terme et la stratégie, sans jamais posséder ce qu'elle agrège. Voir [30-trajectoire.md](./30-trajectoire.md).

**Supprimer le compte.** Geste de suppression physique et totale, propagé aux tiers connectés et journalisé. Décision de vie privée, jamais d'économie. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Supprimer l'historique d'un module.** Geste de suppression physique, ciblée à un seul module, volontairement doté de friction. Décision de vie privée, jamais d'économie. Voir [11-modularite-configuration.md](./11-modularite-configuration.md).

**Trajectoire.** Espace singleton qui contient les projets de L'Édifice et porte au-dessus d'eux la strate stratégique. Voir [30-trajectoire.md](./30-trajectoire.md).
