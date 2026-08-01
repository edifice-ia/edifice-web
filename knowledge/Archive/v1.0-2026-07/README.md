# Documentation stratégique v1.0 — juillet 2026 (archivée)

Statut : **archive — ne fait plus autorité**
Remplacée le : 2026-08-01
Remplacée par : [`knowledge/Documentation-Strategique/`](../../Documentation-Strategique/Markdown/)

## Contenu de ce dossier

- `L'Edifice - Documentation Strategique de Reference.pdf` — l'original de référence, tel que produit.
- `L-Edifice-Documentation-Strategique-de-Reference.md` — son export Markdown, suivi par git depuis le 2026-07-28. C'est la version lisible et diffable ; l'historique du fichier est préservé (déplacé par `git mv`).

## Ce que cette version couvrait

Document unique, daté de juillet 2026, en cinq parties et 26 sections numérotées :

- **I — Vision & Fondations** : résumé exécutif, vision & mission, philosophie & principes fondateurs, utilisateur & contexte d'usage.
- **II — Cartographie des modules** : treize modules de rang égal — Cockpit, Assistant IA, Personnel, Business, CRM, Création de Contenu, Observatoire, Bibliothèque, Développement, Finances, Infrastructure, Paramètres, Automatisations.
- **III — Architecture & Données** : modèle de données & graphe de connexions, architecture technique, sécurité & gouvernance.
- **IV — Intégrations & Trajectoire** : intégrations, roadmap, métriques de succès.
- **V — Référence** : glossaire, annexes.

Elle cadrait le produit comme un « cockpit IA personnel », à usage strictement personnel.

## Pourquoi elle est archivée plutôt que supprimée

Elle garde une valeur d'historique : elle documente l'état de la réflexion à un moment donné, et les sections auxquelles d'anciens documents renvoient encore par numéro. Elle ne doit plus être lue comme une source de vérité.

## Ce qui a changé dans la version qui la remplace

La refonte du 2026-08-01 n'est pas un ré-export : c'est une **réécriture avec une taxonomie différente**, éclatée en seize documents autonomes.

| | v1.0 (ce dossier) | `Documentation-Strategique/` |
| --- | --- | --- |
| Forme | un document, 26 sections | seize documents autonomes, numérotés par familles 00/10/20/30/90 |
| Unité de base | treize « modules » de rang égal | hiérarchie à cinq niveaux : Plateforme → Services communs → Modules → Pôles/Espaces → Marques & Projets |
| Surfaces | modules Cockpit, Business, CRM, Bibliothèque… | cinq pôles (Accueil, Personnel, Assistant, Observatoire, Finances) et deux espaces (Contenu, Trajectoire) |
| Sens de « module » | grande brique fonctionnelle | domaine de vie qui produit de la donnée : sommeil, sport, santé, nutrition, habitudes, journal, tâches, objectifs, agenda, notes |
| Cadrage | cockpit IA personnel, usage strictement personnel | système d'exploitation personnel **et** professionnel ; tout est modulaire, rien n'est obligatoire |

Plusieurs modules de la v1.0 sont requalifiés en services communs dans la nouvelle taxonomie — CRM, Automatisations, Infrastructure notamment. Voir [`20-catalogue-services.md`](../../Documentation-Strategique/Markdown/20-catalogue-services.md).

## Points ouverts — deux modules v1.0 sans équivalent direct

Ces deux-là ne sont pas de simples renommages. Ils n'apparaissent nulle part dans les seize documents de la nouvelle structure : recherche faite, zéro occurrence pour l'un comme pour l'autre.

- **Paramètres** (section 17 de la v1.0). La nouvelle taxonomie ne lui donne pas de place : ce n'est ni un pôle, ni un espace, ni un domaine de vie qui produit de la donnée métier. Il reste une **surface système hors taxonomie pôle/espace**. Le module existe pourtant bien en code et dans la navigation, et il est documenté côté technique — voir la section « Paramètres (Réglages) » de [`06_Modules.md`](../../Documentation-Technique-Code/06_Modules.md). Les deux capacités de souveraineté que la v1.0 rattachait explicitement à ce module, **export complet des données** et **suppression ciblée ou totale**, ne sont reprises par aucun document de la nouvelle structure ni par le code.
- **Bibliothèque** (section 13 de la v1.0) : gestion documentaire centralisée, indexation des documents par entité du graphe, notes liées, sans dupliquer le stockage quand une source externe fait autorité. **Aucun repreneur identifié** — ni pôle, ni espace, ni service commun, ni module de domaine de vie. On ne peut pas dire à ce stade si la capacité a été volontairement abandonnée ou simplement omise lors de la refonte. C'est un arbitrage produit, il demande une décision humaine.
