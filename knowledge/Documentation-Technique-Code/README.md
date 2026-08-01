# Base de connaissances de L'Édifice

Statut : guide d'utilisation  
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle de cette base](#rôle-de-cette-base)
- [Fichiers disponibles](#fichiers-disponibles)
- [Comment maintenir la base](#comment-maintenir-la-base)
- [Comment donner le contexte à une IA](#comment-donner-le-contexte-à-une-ia)
- [Éviter la divergence avec le code](#éviter-la-divergence-avec-le-code)
- [PDF](#pdf)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle de cette base

Le dossier `knowledge/Documentation-Technique-Code/` est la source de vérité documentaire de L'Édifice sur **l'état réel du code**. Il doit permettre à un humain, ChatGPT, Claude, Gemini ou tout autre LLM de comprendre le projet sans dépendre d'une conversation précédente.

La vision et l'intention long terme font l'objet d'un dossier distinct, `knowledge/Documentation-Strategique/`. En cas de divergence : ce dossier-ci fait autorité sur ce que le code fait, l'autre sur ce que le produit vise.

Le code reste la source de vérité d'exécution. La documentation explique les intentions, les responsabilités, les décisions et les conventions.

## Fichiers disponibles

- [00_Vision.md](./00_Vision.md) : vision produit, principes directeurs et indépendance vis-à-vis des IA.
- [01_Architecture.md](./01_Architecture.md) : couches techniques, flux applicatifs et garde-fous d'architecture.
- [02_Roadmap.md](./02_Roadmap.md) : horizons court, moyen et long terme.
- [03_Decisions.md](./03_Decisions.md) : registre des décisions structurantes.
- [04_Stack.md](./04_Stack.md) : technologies, scripts et contraintes de stack.
- [05_Database.md](./05_Database.md) : cartographie Supabase, tables et domaines de données.
- [06_Modules.md](./06_Modules.md) : modules fonctionnels et responsabilités.
- [07_Agents.md](./07_Agents.md) : agents logiques, garde-fous et mémoire.
- [08_Workflows.md](./08_Workflows.md) : workflows assistant, Shorts, publication et maintenance documentaire.
- [09_Prompts.md](./09_Prompts.md) : prompts réutilisables et règles anti-dépendance modèle.
- [10_Conventions.md](./10_Conventions.md) : conventions de documentation, code, données et sécurité.
- [11_Changelog.md](./11_Changelog.md) : journal des changements structurants.

## Comment maintenir la base

À chaque évolution importante :

1. Identifier les fichiers de `knowledge/Documentation-Technique-Code/` concernés.
2. Mettre à jour les affirmations devenues fausses ou incomplètes.
3. Ajouter une décision dans `03_Decisions.md` si un choix durable est pris.
4. Ajouter une entrée dans `11_Changelog.md`.
5. Vérifier les liens croisés.
6. Régénérer un export PDF si la base doit être partagée hors du dépôt — voir [PDF](#pdf).

## Comment donner le contexte à une IA

Contexte minimal recommandé :

```text
Lis knowledge/Documentation-Technique-Code/README.md puis les fichiers
knowledge/Documentation-Technique-Code/ pertinents.
Considère knowledge/Documentation-Technique-Code/ comme la source de vérité
documentaire sur l'état réel du code, et knowledge/Documentation-Strategique/
comme la source de vérité sur la vision et l'intention long terme.
Considère le code et les migrations comme la source de vérité d'exécution.
Avant de modifier du code Next.js, lis node_modules/next/dist/docs/ selon le sujet.
Respecte les garde-fous documentés dans
knowledge/Documentation-Technique-Code/10_Conventions.md.
```

Pour une tâche ciblée :

- architecture : lire `01_Architecture.md`, `04_Stack.md`, `05_Database.md` ;
- base de données : lire `05_Database.md`, puis `supabase/migrations` ;
- assistant ou agents : lire `07_Agents.md`, `08_Workflows.md`, `09_Prompts.md` ;
- évolution produit : lire `00_Vision.md`, `02_Roadmap.md`, `03_Decisions.md` ;
- sécurité ou publication : lire `10_Conventions.md`, `07_Agents.md`, `08_Workflows.md`.

## Éviter la divergence avec le code

Bonnes pratiques :

- Ne jamais documenter une capacité comme active si elle est seulement souhaitée.
- Ajouter les limites dans "À mettre à jour" plutôt que les masquer.
- Relier les modules aux fichiers du dépôt.
- Mettre à jour les docs dans le même changement que le code.
- Vérifier les migrations avant de documenter une table.
- Écrire les décisions durables dans `03_Decisions.md`.
- Garder les prompts comme points d'entrée, pas comme logique métier cachée.
- Relire régulièrement les scripts et routes API pour détecter les écarts.

## PDF

**Aucun export PDF de cette base n'existe actuellement dans le dépôt.**

`docs/Edifice_Knowledge_Base.pdf` a longtemps rempli ce rôle : il rassemblait les fichiers Markdown de ce dossier dans l'ordre logique. Il a été supprimé le 2026-08-01 parce qu'il était périmé sans le dire — sa dernière génération datait du 2026-07-07, et il lui manquait `DEC-005`, `DEC-006`, `DEC-007` ainsi que trois semaines de changelog. Un export figé qui ne signale pas sa propre péremption est plus nuisible qu'absent : il se lit comme la base elle-même.

Aucune commande de régénération n'existe dans le dépôt — ni script npm, ni dépendance. L'export était produit à la main. Si un PDF redevient nécessaire, le régénérer depuis les Markdown de ce dossier au moment du partage, et ne pas le committer : il redeviendrait périmé au commit suivant.

Le dossier voisin `knowledge/Documentation-Strategique/` suit une autre règle, délibérément : il maintient un `PDF/` versionné en miroir de son `Markdown/`, chaque `.pdf` étant régénéré en même temps que son `.md` source.

## À mettre à jour

- Ajouter la commande officielle de génération du PDF si elle devient un script npm.
- Ajouter une fréquence de revue documentaire.
- Ajouter un responsable de maintenance lorsque l'organisation du projet le nécessite.
