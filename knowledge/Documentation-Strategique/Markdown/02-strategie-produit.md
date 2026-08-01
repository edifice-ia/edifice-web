# Stratégie produit

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Construire pour moi, puis généraliser](#construire-pour-moi-puis-généraliser)
- [Le lien avec la couche de config](#le-lien-avec-la-couche-de-config)
- [Priorité actuelle](#priorité-actuelle)

## Rôle du document

Ce document explique dans quel ordre L'Édifice se construit, et pourquoi cet ordre n'est pas négociable. Il ne fixe ni date ni jalon — voir [30-trajectoire.md](./30-trajectoire.md) pour la roadmap datée — et ne traite pas de la mise sur le marché — voir [31-commercialisation.md](./31-commercialisation.md). Il répond à une seule question : dans quel ordre les choses doivent être construites, et pourquoi cet ordre protège le produit final.

## Construire pour moi, puis généraliser

L'Édifice se construit en trois temps, toujours dans le même ordre.

**Premier temps : l'outil idéal pour un usage réel unique.** Pas un outil pensé pour un utilisateur hypothétique, mais pour la vie réelle d'une seule personne, avec ses contraintes exactes, ses données exactes, ses irritants exacts. Aucune fonctionnalité n'est construite parce qu'elle pourrait servir à quelqu'un d'autre un jour.

**Deuxième temps : l'usage quotidien.** Un outil qu'on n'utilise pas soi-même tous les jours ne révèle jamais ses défauts de conception — seulement l'usage réel, répété, sans complaisance, fait apparaître ce qui manque, ce qui gêne, et surtout ce qui est superflu. Cette phase n'est pas une validation finale, c'est une source continue de correction.

**Troisième temps : la généralisation.** Seulement une fois l'outil éprouvé sur un usage réel, on l'ouvre à d'autres. Généraliser avant cette épreuve reviendrait à construire pour un besoin qu'on n'a pas encore vérifié — l'inverse exact de ce que L'Édifice cherche à faire.

Cet ordre a une conséquence stricte : aucune fonctionnalité n'est ajoutée par anticipation d'un besoin public qui n'a pas encore été vécu personnellement. C'est la version stratégique du principe de simplicité avant généricité — voir [01-principes.md](./01-principes.md).

## Le lien avec la couche de config

Cette séquence ne fonctionnerait pas si le passage du premier au troisième temps demandait de reconstruire le moteur. C'est pourquoi l'unique couche de configuration — celle qui gouverne le focus de l'IA, l'activation des modules et l'onboarding — est conçue dès le premier jour pour porter les deux usages avec le même mécanisme.

Aujourd'hui, il n'y a qu'un utilisateur : moi. Ma configuration est saisie manuellement, module par module, pôle par pôle. Le jour où L'Édifice s'ouvre à d'autres personnes, leur configuration ne sera pas saisie à la main — elle sera déduite des réponses à un questionnaire d'onboarding. Mais dans les deux cas, la configuration produite alimente exactement le même moteur.

C'est le pari stratégique central de cette section : en construisant un moteur de configuration suffisamment robuste pour un usage manuel exigeant, la généralisation cesse d'être un chantier d'architecture et devient un chantier d'onboarding. Le jour de l'ouverture au public, aucune refonte n'est nécessaire — seulement un nouveau chemin d'entrée vers un mécanisme qui existe déjà et qui a déjà fait ses preuves sur un usage réel.

## Priorité actuelle

Deux règles de séquencement gouvernent le travail en cours, avant toute autre priorité.

**Finir le pôle Personnel avant tout le reste.** Personnel est le socle sur lequel repose l'usage quotidien réel décrit plus haut — c'est là que vivent l'énergie, le sommeil, les routines, les objectifs personnels, les données qui permettent de vérifier si L'Édifice tient sa promesse au jour le jour. Tant que ce socle n'est pas terminé, le deuxième temps de la séquence — l'épreuve de l'usage quotidien — reste incomplet, et toute généralisation ou extension ailleurs se construirait sur un usage réel encore partiel.

**L'audit de sécurité précède toute nouvelle fonctionnalité.** La souveraineté des données n'est pas une fonctionnalité qu'on ajoute après coup — voir [01-principes.md](./01-principes.md). Construire de nouvelles surfaces sur une base dont les failles connues ne sont pas corrigées reviendrait à agrandir une maison dont les fondations n'ont pas été vérifiées. Aucun nouveau chantier fonctionnel ne démarre tant qu'un audit de sécurité en cours n'est pas clos.
