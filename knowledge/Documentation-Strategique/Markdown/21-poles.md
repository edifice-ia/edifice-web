# Les cinq pôles

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Accueil](#accueil)
- [Personnel](#personnel)
- [Assistant](#assistant)
- [Observatoire](#observatoire)
- [Finances](#finances)

## Rôle du document

Ce document donne une fiche pour chacun des cinq pôles — surfaces uniques et non duplicables, définies dans [10-architecture-systeme.md](./10-architecture-systeme.md), que ce document ne redéfinit pas. Il ne détaille pas non plus les modules que chaque pôle compose — voir [23-modules.md](./23-modules.md). Chaque fiche rappelle comment la première règle d'or s'applique concrètement à ce pôle : il lit, il ne possède pas — voir [01-principes.md](./01-principes.md).

## Accueil

Accueil est la vue-porte-d'entrée : la première chose que l'on voit au démarrage. Il fait monter le **brief du jour** directement, sans passer par Personnel — même si une partie de ce que le brief affiche provient de données qui vivent dans Personnel.

Le brief est une vue calculée en lecture : ce n'est pas une donnée que l'on écrit ou que l'on modifie, c'est une synthèse recalculée à chaque consultation à partir de ce qui existe ailleurs. Il s'adapte automatiquement aux modules activés — si le module sommeil est désactivé, le brief ne prétend jamais savoir comment la nuit s'est passée. Il affiche les recommandations produites par l'IA en portée perso, la portée étroite du service IA décrite dans [20-catalogue-services.md](./20-catalogue-services.md). Il peut aussi afficher des tuiles de marques de l'espace Contenu, mais uniquement en opt-in : une marque n'apparaît sur Accueil que si l'utilisateur a choisi de l'y faire figurer, jamais par défaut.

**Règle d'or.** Le brief n'est pas une donnée possédée par Accueil, c'est une lecture agrégée du reste de la plateforme. Désactiver ou modifier ce qu'il affiche ailleurs modifie le brief automatiquement, sans qu'Accueil ait besoin d'être averti explicitement.

## Personnel

Personnel compose les modules de la vie personnelle — agenda, sport, sommeil, météo, notes, tâches, journal, santé, et les autres modules de ce domaine décrits dans [23-modules.md](./23-modules.md). Tout ce qui y vit reste lisible par l'Assistant : rien n'est cloisonné par défaut à l'intérieur de ce pôle.

**Règle d'or.** Personnel compose des modules, il ne les recode pas. Chaque module garde sa propre donnée et sa propre logique ; Personnel les assemble dans une seule surface, il n'en devient jamais le propriétaire.

## Assistant

Assistant est la surface transversale au-dessus de la capacité IA, en portée large — la même capacité que celle qui alimente le brief d'Accueil, mais sans la borne du contexte du jour, voir [20-catalogue-services.md](./20-catalogue-services.md). Il voit tout, **en focus** : il priorise le contexte actif de la conversation sans jamais imposer de cloisonnement dur entre les domaines.

**Règle d'or.** Assistant lit à travers toute la plateforme, il ne possède rien de ce qu'il lit. Chaque donnée qu'il mobilise dans une réponse reste dans son module d'origine ; l'Assistant ne la déplace ni ne la duplique pour construire sa réponse.

## Observatoire

Observatoire est la vue macro en lecture de l'état du système : coûts IA, performance de publication, état des connexions externes, infrastructure, journal technique. Il porte aussi une fenêtre vers Finances, accessible directement depuis Observatoire sans qu'Observatoire n'en possède les données.

**Règle d'or.** Observatoire agrège en lecture ; il ne modifie jamais une donnée qu'il affiche. Un signal de coût ou de panne remonté par Observatoire pointe toujours vers sa source réelle plutôt que d'être traité comme une donnée propre à ce pôle.

## Finances

Finances est un pôle dédié qui consolide en lecture les données perso et pro depuis les contextes où elles vivent réellement — une dépense personnelle reste rattachée à Personnel, un revenu de marque reste rattaché à sa marque dans Contenu, voir [12-modele-de-donnees.md](./12-modele-de-donnees.md). Finances est également accessible via une fenêtre depuis Observatoire : deux portes d'entrée vers la même lecture consolidée, jamais deux copies de la donnée.

Le nom du pôle est « Finances », jamais « Business ». Ce dernier terme est abandonné : son rôle d'orchestrateur historique est absorbé par le concept d'espace — voir [10-architecture-systeme.md](./10-architecture-systeme.md) — et ne renaît pas sous forme de pôle.

**Règle d'or.** Finances consolide en lecture ; la donnée source reste toujours ailleurs, jamais recopiée dans ce pôle pour y être affichée.
