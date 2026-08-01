# Ouverture publique

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Un projet à part, pas une prochaine étape](#un-projet-à-part-pas-une-prochaine-étape)
- [Le chantier de commercialisation](#le-chantier-de-commercialisation)
- [Pourquoi l'architecture actuelle rend cette phase possible](#pourquoi-larchitecture-actuelle-rend-cette-phase-possible)

## Rôle du document

Ce document décrit ce qu'implique l'ouverture publique de L'Édifice, comme projet à part entière. Il ne se substitue pas à la roadmap produit actuelle — voir [30-trajectoire.md](./30-trajectoire.md) — et ne la mélange pas : les deux avancent sur des horizons différents, pour des raisons différentes.

## Un projet à part, pas une prochaine étape

L'Édifice reste privé tant que ses modules principaux ne sont pas terminés. Ce n'est pas une précaution provisoire, c'est la conséquence directe du séquencement décrit dans [02-strategie-produit.md](./02-strategie-produit.md) : construire pour un usage réel avant de généraliser. Le chantier décrit ici n'est donc pas une suite logique du développement en cours — c'est un projet distinct, qui commence quand le premier est suffisamment mûr, pas avant.

## Le chantier de commercialisation

**Redesign UX/UI.** Rendre l'interface lisible par quelqu'un qui n'a jamais vu L'Édifice se construire, sans le contexte accumulé par celui qui l'a conçu. Ce qui change, c'est la présentation — pas la logique produit qui la sous-tend.

**Accessibilité.** Rendre L'Édifice utilisable par des personnes aux besoins différents de ceux de son concepteur — contraste, navigation au clavier, lecteurs d'écran. Une exigence qui n'a pas de sens tant qu'il n'existe qu'un seul utilisateur qui connaît déjà l'outil par cœur.

**Onboarding.** Transformer le questionnaire en un parcours guidé qui pré-remplit réellement la configuration. Le mécanisme est déjà décrit — voir [11-modularite-configuration.md](./11-modularite-configuration.md) — cette phase construit le parcours qui l'alimente, pas le mécanisme lui-même.

**Modularisation complète.** Vérifier qu'aucun module ni service ne présume plus, nulle part, de l'existence d'un autre — l'épreuve finale de la deuxième règle d'or avant qu'un utilisateur externe puisse composer sa propre configuration sans jamais tomber sur une dépendance cachée.

**Permissions.** Définir, au-delà du modèle mono-utilisateur actuel, ce qu'un utilisateur peut voir et faire dans son propre Édifice, et poser les bases d'un partage contrôlé si plusieurs personnes accèdent un jour à un même espace — une marque partagée entre associés, par exemple.

**Documentation.** Une documentation utilisateur, distincte de la documentation de conception que constitue cette base stratégique. Celle-ci explique pourquoi le produit est fait ainsi ; l'ouverture publique a besoin d'une documentation qui explique comment s'en servir.

**Pricing.** Définir un modèle de prix. Non tranché ici : c'est un chantier à part entière, avec ses propres arbitrages, pas une conséquence automatique de l'architecture.

**Gestion des abonnements.** Le mécanisme technique et opérationnel qui fait vivre le pricing une fois décidé — facturation, changement de palier, résiliation.

**Performances.** Vérifier que l'architecture tient la charge d'un nombre d'utilisateurs inconnu à l'avance, pas seulement celle d'un utilisateur unique aux habitudes déjà connues.

**Bêta privée.** Ouvrir à un petit nombre de personnes choisies avant l'ouverture générale, pour éprouver l'onboarding et la configuration sur des vies réelles différentes de celle qui a servi de terrain d'essai jusque-là — avant que l'erreur ne coûte plus cher à corriger.

**Ouverture.** Le moment où le questionnaire d'onboarding devient accessible à quiconque, sans invitation. La dernière étape de ce chantier, pas la première.

## Pourquoi l'architecture actuelle rend cette phase possible

Trois décisions prises bien avant que ce chantier ne commence en font une phase de surface plutôt qu'une refonte.

**La couche de configuration** — voir [11-modularite-configuration.md](./11-modularite-configuration.md) — est déjà conçue pour porter aussi bien une saisie manuelle qu'un questionnaire. L'onboarding de cette phase remplit un mécanisme qui existe déjà ; il ne le crée pas.

**Le modèle de données, prêt pour le multi-utilisateur dès l'origine** — voir [12-modele-de-donnees.md](./12-modele-de-donnees.md) — rattache déjà chaque table à un identifiant utilisateur systématique. Ajouter un deuxième utilisateur n'exige aucune migration de schéma, seulement de nouvelles lignes dans les mêmes tables.

**Le socle RGPD par défaut** — voir [11-modularite-configuration.md](./11-modularite-configuration.md) et [13-securite-gouvernance.md](./13-securite-gouvernance.md) — existe déjà pour l'usage personnel : export, suppression physique, propagation aux tiers. L'ouverture publique n'a pas à inventer ces gestes sous la pression d'une obligation légale ; elle n'a qu'à les exposer à plus de monde.

C'est pour cette raison précise qu'aucune refonte du cœur n'est nécessaire le jour de l'ouverture — seulement le chantier décrit dans ce document.
