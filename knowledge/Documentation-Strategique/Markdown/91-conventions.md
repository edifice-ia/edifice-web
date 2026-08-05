# Conventions

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Convention de commit](#convention-de-commit)
- [Documentation vivante](#documentation-vivante)
- [Règles du dossier /knowledge](#règles-du-dossier-knowledge)
- [Convention de nommage](#convention-de-nommage)
- [Principes de relecture](#principes-de-relecture)

## Rôle du document

Ce document fixe les conventions transverses du projet : comment on commit, comment la documentation reste vivante, comment le dossier `/knowledge` reste cohérent, comment on nomme les choses, et à quel rythme on relit l'ensemble.

## Convention de commit

Chaque commit suit le format :

```text
type(scope): résumé impératif

- point de détail
- point de détail

Ref: DEC-XXX (si applicable)
```

Le type indique la nature du changement (par exemple une fonctionnalité, un correctif, une évolution de documentation, un changement de sécurité). Le scope indique le domaine touché — un module, un pôle, un service commun. Le résumé est écrit à l'impératif, sans point final. Les points de détail listent ce qui change concrètement, un par ligne. La référence pointe vers une décision ou un ticket quand le commit en découle directement.

**Le message est rédigé en français, en entier** — résumé, points de détail et corps. Le type et le scope restent en anglais, puisqu'ils appartiennent au format. Les messages antérieurs au 2026-08-04 mêlent un résumé anglais à un corps français ; ils ne sont pas réécrits, mais ils ne servent pas de modèle.

## Documentation vivante

Le principe est déjà posé — voir [01-principes.md](./01-principes.md) : la documentation change dans le même geste que le code. Ce document en fixe la procédure : un changement qui touche à l'architecture, à un service commun, à un pôle, à un espace, à un module, ou qui constitue une décision durable, met à jour le fichier `/knowledge` concerné dans le même commit ou la même série de commits que le code — jamais dans une passe de rattrapage ultérieure.

## Règles du dossier /knowledge

**Un fichier, une responsabilité.** Chaque document couvre un domaine et un seul. Un contenu qui déborde sur la responsabilité d'un autre document doit être déplacé, pas dupliqué sur place.

**Zéro duplication.** Une information qui existe déjà ailleurs est référencée par un lien relatif, jamais recopiée. Si deux documents affirment la même chose avec des mots différents, l'un des deux est de trop.

**Références croisées systématiques.** Tout concept qui dépend d'un autre document est relié par un lien relatif explicite, jamais par une mention en texte libre sans lien.

**Documentation prompte.** Toute nouvelle route API, toute nouvelle intégration tierce, toute décision d'architecture significative est documentée sans délai. Une décision qui touche la couche stratégique — un nouveau service commun, une redéfinition de pôle ou d'espace — est ajoutée au document concerné de `Documentation-Strategique`. Une décision d'implémentation reste tracée dans le registre de décisions de `Documentation-Technique-Code`, qui documente l'état réel du code plutôt que la vision — voir la distinction posée à l'ouverture de ce dossier.

## Convention de nommage

« Pôle » et « espace » sont du vocabulaire d'architecture — ils servent la documentation et le code, voir [10-architecture-systeme.md](./10-architecture-systeme.md). À l'écran, les noms sont nus, sans préfixe : on affiche « Personnel », jamais « Pôle Personnel » ; « Trajectoire », jamais « Espace Trajectoire ». Toute interface qui affiche ce vocabulaire d'architecture directement à l'utilisateur est une erreur à corriger.

## Principes de relecture

La documentation stratégique est relue et mise à jour dans trois circonstances, sans attendre un cycle calendaire fixe :

**À chaque changement d'architecture majeur** — un nouveau service commun, un pôle ou un espace redéfini, une évolution du modèle de données.

**À chaque révision de roadmap** — un nouvel horizon posé, une priorité qui change dans [30-trajectoire.md](./30-trajectoire.md).

**À chaque écart constaté entre la vision et l'usage réel** — quand ce que la documentation affirme ne correspond plus à ce que l'usage quotidien révèle. Un tel écart n'est jamais laissé tel quel : soit la documentation se corrige, soit le produit change pour la rejoindre, mais les deux ne restent jamais durablement en désaccord.
