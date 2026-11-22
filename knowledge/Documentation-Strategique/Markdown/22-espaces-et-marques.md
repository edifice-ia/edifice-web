# Espaces et marques

Statut : source de vérité
Dernière mise à jour : 2026-11-22

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Espace Contenu](#espace-contenu)
- [Anatomie type d'une marque](#anatomie-type-dune-marque)
- [Statuts de maturité](#statuts-de-maturité)
- [Une cible, pas un chantier court terme](#une-cible-pas-un-chantier-court-terme)
- [Espace Academy](#espace-academy)
  - [La hiérarchie pédagogique](#la-hiérarchie-pédagogique)
  - [Ce qu'Academy compose](#ce-quacademy-compose)
- [Espace Trajectoire](#espace-trajectoire)

## Rôle du document

Ce document décrit les trois espaces de L'Édifice — conteneurs d'instances duplicables au sens défini dans [10-architecture-systeme.md](./10-architecture-systeme.md), que ce document ne redéfinit pas. La première partie détaille l'espace Contenu et l'anatomie type d'une marque. La deuxième décrit l'espace Academy et sa hiérarchie pédagogique. La troisième renvoie à [30-trajectoire.md](./30-trajectoire.md) pour le détail de l'espace Trajectoire.

## Espace Contenu

Contenu est l'espace qui accueille les marques : des instances autonomes comme Lignes Intérieures, Tarot & Divination ou Future Influenceuse IA. Chaque marque compose les services communs décrits dans [20-catalogue-services.md](./20-catalogue-services.md) avec ses propres données ; elle ne recode jamais ce qui existe déjà en dessous — voir la définition de la marque comme instance dans [10-architecture-systeme.md](./10-architecture-systeme.md).

## Anatomie type d'une marque

Une marque se comporte, du point de vue de celui qui la pilote, comme une entité business autonome — au sens où un outil comme système.io la donnerait à voir : présence, acquisition, conversion, infrastructure, chacune pilotable indépendamment. Mais sous le capot, rien de cela n'est reconstruit marque par marque : chaque fonction s'appuie sur un service commun déjà mutualisé.

**Présence & contenu.** Réseaux sociaux, calendrier éditorial, pipeline idée → publication, statistiques de diffusion. S'appuie sur le service Publication et sur Stockage pour les assets — voir [20-catalogue-services.md](./20-catalogue-services.md).

**Acquisition.** Tunnels de vente et pages de capture propres à la marque. S'appuie sur le service Tunnels et Pages.

**Conversion & relation.** Campagnes et séquences d'emailing, contacts et leads qui remontent dans un CRM. S'appuie sur les services Emailing et CRM (moteur).

**Infrastructure de marque.** Nom de domaine propre, adresse mail professionnelle. S'appuie sur le service Domaines et Infra.

À ces quatre fonctions s'ajoutent deux capacités transversales, disponibles à toute marque sans lui être propres : des statistiques boostées par le service IA en portée marque, et des automatisations qui s'appuient sur le moteur générique déclencheur → condition → action → journalisation.

## Statuts de maturité

Chaque fonction ci-dessus porte un statut réel, pas une promesse :

- **Natif** — le service est branché et utilisé aujourd'hui par au moins une marque réelle.
- **Intégré** — une partie de la fonction tourne déjà, mais pas encore à la hauteur de la cible.
- **Futur** — la fonction fait partie de la vision cible ; rien n'est construit aujourd'hui.

| Fonction | Statut |
|---|---|
| Présence & contenu | Natif — le pipeline de contenu est le chantier le plus avancé de l'espace Contenu |
| Statistiques boostées IA | Intégré — synchronisation réelle sur certains canaux, couverture encore partielle |
| Automatisations transversales | Futur — des étapes sont déjà automatisées dans le pipeline, mais pas via un moteur générique partagé entre marques |
| Acquisition (tunnels, pages) | Futur — aucune marque n'a aujourd'hui de tunnel construit via un service commun |
| Conversion & relation (emailing, CRM) | Futur — ni le CRM ni l'emailing ne sont branchés à une marque aujourd'hui |
| Infrastructure de marque (domaine, mail pro) | Futur — le service existe au niveau plateforme, pas encore décliné par marque |

## Une cible, pas un chantier court terme

Cette anatomie complète est la vision cible de ce que doit devenir une marque dans L'Édifice — elle n'est pas la prochaine chose à construire. La priorité actuelle est Academy, le pôle Personnel étant en pause depuis le 2026-11-22 — voir [02-strategie-produit.md](./02-strategie-produit.md) ; la priorité n'est en tout cas pas l'anatomie de marque. Poser cette anatomie maintenant sert à donner une direction claire à ce que chaque brique deviendra, pas à annoncer un calendrier de livraison.

## Espace Academy

Academy est le troisième espace de L'Édifice, ajouté le 2026-11-22 et prioritaire depuis cette date — voir [02-strategie-produit.md](./02-strategie-produit.md). C'est un environnement d'apprentissage autonome : accessible depuis la navigation principale, doté de sa propre navigation intérieure. Comme Trajectoire, c'est un **espace singleton** au sens de [10-architecture-systeme.md](./10-architecture-systeme.md) : ses instances — des programmes d'apprentissage — se créent et se multiplient, le conteneur reste unique.

**Au 2026-11-22, rien n'est construit.** Tout ce qui suit est la cible, et chaque fonction porte le statut **Futur** au sens des statuts de maturité ci-dessus.

### La hiérarchie pédagogique

Un programme d'apprentissage n'est pas une liste de formations. La structure cible est un **curriculum** hiérarchique, à six niveaux :

```text
CURRICULUM  (programme complet — l'instance de l'espace)
  -> MATIERES ou domaines d'apprentissage
       -> MODULES
            -> CHAPITRES
                 -> COURS et LECONS
                      -> EXERCICES et EVALUATIONS
```

**Les exercices et évaluations ne sont pas tous au dernier niveau.** Un exercice accompagne une leçon ; une évaluation peut porter sur un chapitre, un module, une matière ou le curriculum entier. Le schéma ci-dessus donne la profondeur, pas la seule place des évaluations.

Deux formes plus légères restent possibles, sans que la structure complète soit imposée — application directe du principe central, « rien n'est obligatoire » ([01-principes.md](./01-principes.md)) :

- **la formation indépendante** : un programme qui commence au niveau des modules, sans curriculum ni matières au-dessus ;
- **le parcours libre** : une suite ordonnée de leçons et d'évaluations choisies dans un ou plusieurs programmes. Le parcours **référence** ces éléments, il ne les possède ni ne les copie — la première règle d'or, à l'échelle d'Academy.

« Module » a ici un sens pédagogique, distinct du module d'architecture de [10-architecture-systeme.md](./10-architecture-systeme.md) : à l'écran le libellé reste « Module », dans le code les deux sens ne se croisent jamais.

### Ce qu'Academy compose

Sa navigation intérieure donne plusieurs vues sur les mêmes programmes :

- **tableau de bord pédagogique** et **suivi de progression et des compétences** : des vues calculées en lecture. Une progression ne se saisit pas, elle se déduit de ce qui a été fait ;
- **calendrier d'Academy** : planification des cours, des séances de travail, des révisions et des évaluations. Les séances planifiées sont des données d'Academy. L'agenda externe, synchronisé en lecture seule, peut s'y superposer pour montrer le temps déjà engagé ; Academy n'y écrit pas — voir le principe de moindre privilège dans [13-securite-gouvernance.md](./13-securite-gouvernance.md) ;
- **programmes et objectifs pédagogiques**, **leçons et ressources pédagogiques**, **notes et fiches de révision**, **quiz, exercices et évaluations** : le contenu des programmes ;
- **révisions intelligentes** : une planification des révisions calculée à partir des résultats passés. C'est un calcul, pas une décision : il relève du principe « tout automatiser », pas de l'IA ;
- **Professeur IA** : un usage du service commun IA, voir [20-catalogue-services.md](./20-catalogue-services.md). Academy ne porte aucun moteur IA propre. Le professeur explique et propose ; rien de ce qu'il propose n'entre dans un programme sans validation explicite.

**Ce qu'Academy rend possible ailleurs** — la question que [01-principes.md](./01-principes.md) impose à toute nouvelle capacité : pour l'Assistant, une donnée d'apprentissage lisible en portée large ; pour le brief, la charge de séances et de révisions du jour, à croiser avec l'énergie et l'agenda ; pour l'Observatoire, le coût des usages IA d'Academy, centralisé par le service commun. Aucune de ces lectures n'existe aujourd'hui : elles sont la condition pour qu'Academy ne devienne pas un silo de plus.

**Ce qu'Academy ne fait pas** : il ne rattache aucun programme à une marque ni à un projet tant que ces entités n'existent pas en code, et il n'introduit aucun mécanisme d'activation propre — l'activation passera par la couche de configuration unique, comme pour toute autre surface ([11-modularite-configuration.md](./11-modularite-configuration.md)).

## Espace Trajectoire

Trajectoire est le second espace de L'Édifice. Sa nature d'espace singleton — un espace par la duplicabilité de son contenu, un projet parmi N, mais unique par cardinalité du conteneur lui-même — est définie dans [10-architecture-systeme.md](./10-architecture-systeme.md). Son détail fonctionnel fait l'objet d'un document dédié : voir [30-trajectoire.md](./30-trajectoire.md).
