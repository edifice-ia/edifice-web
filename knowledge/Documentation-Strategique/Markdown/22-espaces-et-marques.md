# Espaces et marques

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Espace Contenu](#espace-contenu)
- [Anatomie type d'une marque](#anatomie-type-dune-marque)
- [Statuts de maturité](#statuts-de-maturité)
- [Une cible, pas un chantier court terme](#une-cible-pas-un-chantier-court-terme)
- [Espace Trajectoire](#espace-trajectoire)

## Rôle du document

Ce document décrit les deux espaces de L'Édifice — conteneurs d'instances duplicables au sens défini dans [10-architecture-systeme.md](./10-architecture-systeme.md), que ce document ne redéfinit pas. La première partie détaille l'espace Contenu et l'anatomie type d'une marque. La seconde renvoie à [30-trajectoire.md](./30-trajectoire.md) pour le détail de l'espace Trajectoire.

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

Cette anatomie complète est la vision cible de ce que doit devenir une marque dans L'Édifice — elle n'est pas la prochaine chose à construire. La priorité actuelle reste de finir le pôle Personnel avant tout nouveau chantier fonctionnel, voir [02-strategie-produit.md](./02-strategie-produit.md). Poser cette anatomie maintenant sert à donner une direction claire à ce que chaque brique deviendra, pas à annoncer un calendrier de livraison.

## Espace Trajectoire

Trajectoire est le second espace de L'Édifice. Sa nature d'espace singleton — un espace par la duplicabilité de son contenu, un projet parmi N, mais unique par cardinalité du conteneur lui-même — est définie dans [10-architecture-systeme.md](./10-architecture-systeme.md). Son détail fonctionnel fait l'objet d'un document dédié : voir [30-trajectoire.md](./30-trajectoire.md).
