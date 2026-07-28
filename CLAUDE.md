@AGENTS.md

# Protocole — session longue, absence de supervision immédiate

Cette section s'applique **uniquement** quand la session est explicitement lancée en mode autonome (voir [Activation](#activation)). Hors de ce mode, le fonctionnement habituel reste inchangé : on demande, on attend la réponse.

Contexte : la session est lancée depuis un téléphone, le PC reste allumé, l'utilisateur part. Aucune validation ne viendra avant plusieurs heures. Le but est de continuer à produire du travail utile, de mettre de côté proprement ce qui exige un humain, et de rendre compte à la fin.

## Sommaire

- [Activation](#activation)
- [Sources documentaires et autorité](#sources-documentaires-et-autorité)
- [Cadrage « concentre-toi sur le module X »](#cadrage--concentre-toi-sur-le-module-x-)
- [Décision ambiguë](#décision-ambiguë)
- [Action manuelle détectée](#action-manuelle-détectée)
- [Vérification isolée avant tout commit](#vérification-isolée-avant-tout-commit)
- [Mode Push](#mode-push)
- [Résumé de fin de session](#résumé-de-fin-de-session)
- [Ce que le mode autonome ne couvre pas](#ce-que-le-mode-autonome-ne-couvre-pas)

## Activation

Le mode est activé par une phrase explicite en tête du prompt initial, qui précise aussi le [Mode Push](#mode-push) :

- `mode autonome, commit seul`
- `mode autonome, push auto`

Si le mode autonome est demandé sans préciser lequel, **le mode par défaut est `commit seul`** : jamais de push automatique.

## Sources documentaires et autorité

Trois sources coexistent dans le dépôt. Elles ne sont **pas** interchangeables et l'une d'elles est un dérivé.

| Source | Nature | Fait autorité sur |
| --- | --- | --- |
| [`knowledge/`](./knowledge/) — 13 fichiers Markdown, suivis par git | Documentation vivante, mise à jour avec le code | **L'état réel du code** : modules, tables, décisions, conventions, changelog |
| [`Documentation_Stratégique/`](./Documentation_Stratégique/) — un PDF de référence + son export Markdown suivi par git | Document de référence stratégique, hors cycle de développement | **La vision et l'intention long terme** |
| `docs/Edifice_Knowledge_Base.pdf` | **Export consolidé de `knowledge/`**, régénéré à la main | Rien. Ne jamais s'y référer comme source. |

Précisions vérifiées :

- `Documentation_Stratégique/` (accent inclus, `D:\edifice-web\Documentation_Stratégique`) contient deux fichiers pour un même contenu : `L'Edifice - Documentation Strategique de Reference.pdf`, l'original de référence non suivi par git, et `L-Edifice-Documentation-Strategique-de-Reference.md`, son export Markdown suivi par git. **Lire le `.md`** : le PDF n'est pas lisible par l'agent sur cette machine (`pdftoppm` absent, voir l'entrée archivée du 2026-07-28 dans `MANUAL_ACTIONS.md`). Si le PDF est mis à jour sans que le `.md` le soit, l'export devient périmé sans que rien ne le signale — regénérer le `.md` fait partie de la mise à jour.
- `docs/Edifice_Knowledge_Base.pdf` n'est **pas** une source distincte : `knowledge/README.md` le décrit comme le PDF consolidé rassemblant les fichiers Markdown de `/knowledge`. Même contenu, autre format, régénéré manuellement (aucun script npm). Lire les `.md` de `knowledge/`, jamais ce PDF.
- Le reste de `docs/` (notes Pinterest, Shorts, workflow engine) est constitué de notes de travail par sujet, ni source de vérité ni doublon des deux autres.
- Le code et `supabase/migrations` restent la source de vérité **d'exécution**, au-dessus de toute documentation (règle posée par `knowledge/README.md`).

En cas de divergence entre `knowledge/` et `Documentation_Stratégique/` : `knowledge/` gagne sur ce que le code fait, `Documentation_Stratégique/` gagne sur ce que le produit vise. Si la divergence porte sur ce qu'il faut faire maintenant, ce n'est pas un arbitrage à trancher seul → [Décision ambiguë](#décision-ambiguë) et remontée dans le résumé.

## Cadrage « concentre-toi sur le module X »

Quand la session s'ouvre sur une consigne de ce type (« concentre-toi sur le module Personnel »), **ne pas choisir une tâche avant d'avoir fait ces cinq étapes**. Le risque n'est pas de mal coder, c'est de coder la mauvaise chose pendant six heures sans personne pour le dire.

**1. Localiser la documentation du module**

- `knowledge/06_Modules.md` en premier : c'est la cartographie des modules et de leurs responsabilités, et elle relie chaque module à ses fichiers réels.
- Puis les fichiers `knowledge/` liés au sujet : `05_Database.md` pour les tables, `03_Decisions.md` pour les décisions déjà prises (référencées `DEC-00x`), `01_Architecture.md`, `07_Agents.md`/`08_Workflows.md` selon le module.
- Puis `Documentation_Stratégique/` s'il couvre ce module. Autorité selon le tableau ci-dessus : `knowledge/` sur l'état réel, `Documentation_Stratégique/` sur la vision.

**2. Comparer la vision documentée au code réel**

Relever deux types d'écarts, et **les traiter dans cet ordre de gravité** :

1. **Écart de sincérité** (prioritaire) : ce qui existe dans le code mais ment sur son état réel — sonde de statut cassée qui affiche un statut figé, flag ou capacité déclarée active alors qu'elle ne l'est pas, UI qui affiche une valeur périmée sans le signaler, code mort déclaré comme rendu quelque part. Ce type d'écart est **plus grave qu'une fonctionnalité absente** : une absence est visible, un mensonge silencieux corrompt la confiance dans tout le reste du module et fausse les décisions prises à partir de lui.
2. **Écart de couverture** : ce qui est décrit comme faisant partie du rôle du module mais simplement absent du code.

`knowledge/06_Modules.md` donne le standard de rédaction attendu sur ce point — la section Observatoire y qualifie explicitement trois items comme du code mort non rendu, et la section Performance de publication assume que TikTok reste un placeholder en lecture plutôt que d'afficher un faux zéro. C'est ce niveau d'honnêteté qu'il faut maintenir en documentant les écarts trouvés.

**3. Vérifier la feuille de route**

- `knowledge/02_Roadmap.md` : horizons court/moyen/long terme et les cinq principes de priorisation (sécurité et garde-fous avant automatisation, observabilité avant orchestration, etc.).
- `suivi-chantiers-edifice.md` (racine) : les chantiers réellement en cours, leur priorité relative, leurs blocages et leurs dépendances.

But : ne pas travailler sur quelque chose de prématuré — une fonctionnalité qui dépend d'un chantier non terminé, d'une action manuelle en attente, ou d'un choix produit non tranché.

**4. Construire une liste de tâches priorisée**

Ordonner par **gravité de l'écart**, pas par facilité d'exécution : écarts de sincérité d'abord, puis écarts de couverture bloquants, puis le reste. Annoncer cette liste en début de session avant de commencer, pour qu'elle soit lisible dans l'historique même en cas d'interruption.

**5. Mettre à jour la documentation dans le même commit que le code**

Principe de documentation vivante déjà en vigueur (`knowledge/README.md` et `knowledge/10_Conventions.md`) : le fichier `knowledge/` concerné est modifié dans le **même** commit que le code, plus une entrée dans `11_Changelog.md` si le changement est structurant, plus une décision dans `03_Decisions.md` si un choix durable est pris. Une doc mise à jour dans un commit séparé est une doc qui redeviendra fausse.

**Si la doc elle-même est ambiguë ou contradictoire** sur ce qu'il faut faire pour ce module : ne pas deviner silencieusement. Retenir l'option la plus conservative, la documenter comme hypothèse, et l'inscrire dans la section « décisions ambiguës à relire en priorité » du résumé de fin de session — c'est exactement le cas que cette section existe pour attraper.

## Décision ambiguë

Face à un choix non tranché par la demande, le code ou les conventions du dépôt : **ne jamais bloquer en attendant une réponse qui ne viendra pas dans l'immédiat.**

1. Choisir l'option la plus **réversible** et la plus **conservative** : ne pas supprimer, ne pas renommer largement, ne pas migrer de données, ne pas changer un comportement en production, préférer l'ajout à la modification, préférer le drapeau désactivé par défaut.
2. Documenter l'hypothèse retenue — dans le corps du message de commit (`Hypothèse : ...`) si la décision concerne un commit précis, sinon dans le journal de session.
3. Continuer.
4. Reporter la décision dans le [Résumé de fin de session](#résumé-de-fin-de-session), section « à relire en priorité ».

Si les deux options sont également irréversibles, ou si se tromper coûterait une perte de données ou une régression en production : ne rien faire, l'inscrire dans le résumé comme décision en attente, et passer à la tâche suivante.

## Action manuelle détectée

Toute action nécessitant un humain dans un navigateur ou une console tierce — Google Cloud Console, dashboard Supabase, variables d'environnement Vercel, portails développeurs, acceptation de conditions, saisie d'identifiants :

- **Ne pas tenter de la contourner** (pas de chemin détourné, pas de script qui simule l'appel, pas de valeur inventée pour « débloquer »).
- **Ne pas la simuler** ni la déclarer faite.
- L'ajouter à [`MANUAL_ACTIONS.md`](./MANUAL_ACTIONS.md) au format défini dans ce fichier : date, titre court, pourquoi c'est manuel (**la limite technique précise**, pas une paraphrase de la tâche), ce que ça bloque, les étapes exactes copiables telles quelles, et comment vérifier.
- Passer à la tâche actionnable suivante. Rester bloqué sur une action manuelle est le seul échec réel de ce protocole.

Si une tâche entière dépend d'une action manuelle, aller aussi loin que possible sans elle (le code peut être écrit et vérifié même si la variable d'environnement n'existe pas encore), puis le signaler dans l'entrée.

## Vérification isolée avant tout commit

Obligatoire avant **chaque** commit, sans exception. Leçon de l'incident du build cassé sur le chantier Calendrier : la vérification passait grâce à des fichiers non commités présents dans l'arbre de travail, alors que l'état effectivement commité ne compilait pas.

Le principe : **vérifier l'état exact qui sera commité, pas l'arbre de travail complet.**

1. Stager précisément ce qui doit être commité (`git add <chemins>`, jamais `git add -A` en session autonome — le dépôt contient en permanence du travail en cours non lié).
2. Mettre temporairement de côté tout le reste, **y compris les fichiers non suivis** : ils peuvent faire compiler le build à tort.
   ```bash
   git stash push --keep-index --include-untracked -m "verifier-isolation"
   ```
3. Vérifier dans cet état isolé : `npx tsc --noEmit`, puis `npm run build`.
4. Restaurer : `git stash pop`, et contrôler que `git status` est revenu à son état initial.

En pratique, déléguer ces quatre étapes au subagent [`verifier`](./.claude/agents/verifier.md), qui ne renvoie que `PASS`/`FAIL` et les erreurs — ce qui évite de charger le contexte de la session avec des logs de build à chaque commit.

Si le `git stash pop` échoue (conflit) : **aucune résolution automatique, aucun `git checkout`/`reset`/`stash drop`.** Le stash contient du travail non commité de l'utilisateur. Arrêter la session, et le placer en tête du résumé.

### Unique exception : commit hors périmètre build

La vérification n'est pas requise **si et seulement si tous les fichiers du commit, sans exception**, relèvent de l'une de ces deux catégories :

- **Documentation Markdown** : `*.md` à la racine (`CLAUDE.md`, `MANUAL_ACTIONS.md`, `README.md`, `suivi-chantiers-edifice.md`), dans `knowledge/`, dans `docs/`, dans `Documentation_Stratégique/`.
- **Définitions d'agents et de skills en Markdown** : `.claude/agents/*.md`, `.claude/skills/*.md`.

Sont **explicitement exclus** du périmètre — leur présence rend la vérification obligatoire, quelle que soit l'apparente innocuité de leur extension :

- `package.json`, `package-lock.json`, `tsconfig.json` ;
- toute config influençant le build : `next.config.*`, `eslint.config.*`, `postcss.config.*`, `vercel.json`, `proxy.ts` ;
- `.env.example` et tout fichier d'environnement ;
- les migrations SQL (`supabase/migrations/*.sql`) ;
- tout `.ts`, `.tsx`, `.js`, `.mjs`, `.json` — y compris `.claude/settings*.json`, qui n'est pas une définition d'agent.

Règle de lecture : **un seul fichier hors périmètre suffit à rendre la vérification obligatoire pour tout le commit.** Il est interdit de découper un commit pour faire tomber une partie des fichiers dans l'exception — c'est le contournement que cette clause doit empêcher, pas permettre.

L'exception doit toujours être **visible, jamais silencieuse** : quand elle s'applique, l'inscrire dans le [Résumé de fin de session](#résumé-de-fin-de-session) avec la mention exacte :

```text
Vérification isolée non requise — commit composé uniquement de fichiers doc/config hors périmètre build
```

## Mode Push

| Mode | Comportement |
| --- | --- |
| `commit seul` (défaut) | Commits locaux uniquement. Aucun `git push`, jamais, même si la vérification passe. |
| `push auto` | `git push` autorisé **uniquement** si la vérification isolée du commit concerné passe sans erreur. |

En `push auto`, si la vérification échoue : committer quand même en local (le travail ne doit pas être perdu), **ne pas pousser**, et le signaler dans le résumé de fin de session avec la mention exacte : `vérification échouée, push non effectué`.

Dans les deux modes : commits sur une branche, jamais de `push --force`, jamais de réécriture d'historique déjà poussé.

### Surclassement permanent : jamais de push automatique sur du code sensible

**Toute session qui touche à l'authentification, à la sécurité ou aux politiques RLS repasse automatiquement en `commit seul`**, quelle que soit la phrase de lancement — y compris un `push auto` demandé explicitement. Cette règle ne se désactive pas depuis le prompt de lancement : elle n'est levée que par une demande humaine explicite, après relecture, une fois la session terminée.

Raison : une régression de build se voit au déploiement suivant et se corrige. Une route d'authentification affaiblie ou une politique RLS trop permissive s'exploite silencieusement, et le seul moment où un humain peut l'attraper est **avant** que le code ne parte en production. `tsc` et `npm run build` ne détectent aucune de ces deux fautes — la vérification isolée passe au vert sur une faille.

Périmètre — la règle s'applique dès qu'un seul fichier du commit relève de l'une de ces catégories :

- routes d'authentification et OAuth : `app/api/auth/**`, `app/api/oauth/**` (tous providers, y compris `[provider]`) ;
- surfaces à secret partagé ou à jeton entrant : `app/api/internal/**`, `app/api/webhooks/**` ;
- couche d'accès serveur : `lib/server/oauth/**`, `src/lib/supabase/*.ts`, `proxy.ts` (middleware) ;
- SQL touchant à la sécurité : toute migration contenant `POLICY`, `ROW LEVEL SECURITY`, `GRANT`, `REVOKE` ou `SECURITY DEFINER` ;
- catch-all comportemental, indépendant du chemin : tout code qui lit ou écrit `oauth_tokens`, manipule un jeton, un secret partagé ou la clé service-role, ou décide qui a le droit de lire ou d'écrire quelque chose.

Le catch-all prime sur la liste de chemins : un fichier hors des dossiers cités mais qui décide d'un droit d'accès déclenche la règle. En cas de doute sur la qualification d'un fichier, **il est sensible** — le coût d'un push retardé est nul, celui d'un push prématuré ne l'est pas.

Portée **session, pas commit** : dès qu'un commit de la session tombe dans le périmètre, toute la session passe en `commit seul`, y compris ses commits ultérieurs sans rapport. C'est délibéré, pour la même raison que l'interdiction de découper un commit dans la clause d'exception : sinon il suffirait d'isoler le code sensible dans un commit et de pousser le reste.

La règle ne relâche rien d'autre : la [vérification isolée](#vérification-isolée-avant-tout-commit) reste obligatoire dans les mêmes termes, et le travail est commité normalement en local. Seul le `push` est retenu, et il redevient une action humaine explicite.

Quand ce surclassement s'applique alors qu'un `push auto` avait été demandé, il doit apparaître **en tête** du [Résumé de fin de session](#résumé-de-fin-de-session), avec la mention exacte :

```text
Mode "push auto" surclasse en commit seul — session touchant du code d'authentification/securite (regle permanente). Commits locaux, push a valider manuellement.
```

Si la session était déjà en `commit seul`, la règle n'a rien surclassé et n'a pas à être mentionnée.

## Résumé de fin de session

Produit systématiquement à la fin d'une session autonome, dans le dernier message. Format fixe :

```markdown
## Résumé de session autonome — <date> — mode <commit seul | push auto>

<si la regle de surclassement securite a bloque un push auto demande :
la mention exacte definie plus haut, ici, avant toute autre section>

### Commits
- `<sha court>` <message de commit> — poussé | local uniquement | local, vérification échouée, push non effectué
- ...
(si aucun commit : le dire, et dire pourquoi)

### Actions manuelles ajoutées à MANUAL_ACTIONS.md
- <titre de l'entrée> — bloque : <ce que ça bloque>
- ...
(si aucune : « aucune »)

### Décisions ambiguës prises en autonomie — à relire en priorité
- <décision> → option retenue : <laquelle> — hypothèse : <hypothèse> — où : <commit / fichier>
- ...
(si aucune : « aucune »)

### Resté en suspens
- <tâche non terminée et pourquoi> (échec de vérification, dépendance à une action manuelle, décision trop risquée)
```

La section « décisions ambiguës » est la plus importante des quatre : elle est ce qui doit être relu en premier au retour. Y lister chaque hypothèse retenue, même celle qui semble évidente sur le moment.

Ce format vit ici plutôt que dans un skill dédié : il doit s'appliquer automatiquement à la fin de la session, sans invocation explicite — or un skill demande d'être appelé, ce que personne ne sera là pour faire.

## Ce que le mode autonome ne couvre pas

Le mode autonome lève l'attente de validation sur les décisions techniques ordinaires. Il ne lève rien d'autre. Restent interdits sans accord explicite, et vont dans [`MANUAL_ACTIONS.md`](./MANUAL_ACTIONS.md) ou dans le résumé :

- Toute publication réelle (contenu publié, envoi de message, appel d'API tierce en écriture sur un compte réel).
- Toute suppression de données, tout `DROP`/`DELETE` en base, toute migration destructive.
- Toute modification de secrets, de variables d'environnement de production, ou de réglages de compte.
- Toute dépense.

Ces règles prolongent la section Sécurité de [`knowledge/10_Conventions.md`](./knowledge/10_Conventions.md) et ne s'y substituent pas.
