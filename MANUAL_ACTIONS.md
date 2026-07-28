# Actions manuelles en attente

Ce fichier recense les actions que **seul un humain peut faire** : celles qui nécessitent un navigateur, une console tierce, une authentification interactive, ou un droit dont l'agent ne dispose pas.

Règle : quand une action manuelle est détectée pendant une session autonome, elle est **ajoutée ici avec les étapes exactes**, jamais contournée ni simulée. La session continue ensuite sur la tâche actionnable suivante.

Voir le protocole complet dans [CLAUDE.md](./CLAUDE.md#protocole--session-longue-absence-de-supervision-immédiate).

## Sommaire

- [Statuts](#statuts)
- [Modèle d'entrée](#modèle-dentrée)
- [Entrées](#entrées)
- [Archive (done)](#archive-done)

## Statuts

| Statut | Signification |
| --- | --- |
| `pending` | À faire par un humain. Peut bloquer une suite de tâches. |
| `done` | Fait. Déplacer l'entrée dans [Archive](#archive-done) en gardant la date de réalisation. |

## Modèle d'entrée

Copier ce bloc pour chaque nouvelle entrée. Les étapes doivent être **copiables telles quelles**, sans avoir à deviner un nom de projet, une URL ou une valeur.

```markdown
### YYYY-MM-DD — Titre court et concret

**Statut** : `pending`

**Pourquoi c'est manuel** : quelle limite technique empêche l'agent de le faire lui-même. Être précis sur la limite, pas sur la tâche.

**Bloque** : ce qui est en attente de cette action (ou `rien`).

**Étapes** :

1. Étape exacte, avec l'URL complète.
2. Étape exacte, avec le nom exact du champ / bouton.
3. Valeur à coller, dans un bloc de code si c'est du SQL, une variable d'environnement ou une commande.

**Vérification** : comment savoir que c'est bien passé (ce qui doit s'afficher, ou la commande à relancer côté agent).
```

Exemple de rédaction du champ « Pourquoi c'est manuel » (formulations attendues) :

- « nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération »
- « ajout d'une URL de redirection OAuth dans Google Cloud Console : console web uniquement, pas d'API pour les clients OAuth »
- « variable d'environnement à créer dans le dashboard Vercel, avec sélection des environnements (Production/Preview) via cases à cocher »
- « validation d'un consentement / acceptation de conditions : action irréversible engageant le compte, réservée à l'humain »

## Entrées

<!-- Les entrées `pending` vont ici, les plus récentes en haut. -->

### 2026-07-28 — Vérifier / appliquer les policies RLS `content_assets` (Lot 2 de l'audit sécurité)

**Statut** : `pending`

**Pourquoi c'est manuel** : appliquer une migration Supabase et lire l'état réel des policies passent par le SQL Editor du dashboard. L'agent n'a pas d'accès SQL direct au projet Supabase — les variables serveur ne sont pas exposées dans son environnement — et le dépôt ne trace pas quelles migrations ont déjà été exécutées. Le fichier de migration présent dans `supabase/migrations` ne prouve donc rien sur l'état de la base.

**Bloque** : la clôture du Lot 2. Tant que ce n'est pas vérifié, `content_assets` peut encore être en `using(true)` en production, c'est-à-dire lisible par n'importe quel utilisateur authentifié — la faille que le Lot 2 est censé fermer.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. Lire l'état actuel des policies :
   ```sql
   select policyname, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'content_assets'
   order by policyname;
   ```
3. Si les colonnes `qual` / `with_check` valent `true` (ou si les trois policies `content_assets_authenticated_*` sont absentes), la migration n'est pas appliquée : coller et exécuter le contenu intégral de `supabase/migrations/20260721090000_scope_content_assets_rls_to_owner.sql`.
4. Vérifier au passage que RLS est bien activé sur la table :
   ```sql
   select relrowsecurity from pg_class where relname = 'content_assets';
   ```
   Si le résultat est `false`, les policies ne sont pas appliquées quoi qu'il arrive :
   ```sql
   alter table public.content_assets enable row level security;
   ```
5. Relancer la requête de l'étape 2 pour confirmer.

**Vérification** : les trois policies `content_assets_authenticated_select/insert/update` existent, aucune n'a `qual` ou `with_check` à `true`, et `relrowsecurity` vaut `true`.

**Note connexe** : le changelog du 2026-07-11 indique que `20260711100000_add_effort_level_to_trajectoire_actions.sql` n'était pas encore appliquée non plus. Autant vérifier les deux dans la même session SQL.

## Archive (done)

### 2026-07-28 — Rendre lisible le PDF de `Documentation_Stratégique/`

**Statut** : `done` — 2026-07-28 (option B retenue)

**Pourquoi c'est manuel** : le rendu de PDF côté agent nécessite `pdftoppm` (paquet `poppler-utils`), absent de cette machine. Son installation est un installeur système au niveau de Windows, hors du dépôt et hors de portée de l'agent. L'extraction de texte sans cette dépendance ne renvoie que des données de police illisibles — testé sur les deux PDF du dépôt, échec dans les deux cas.

**Bloque** : l'étape 1 du cadrage « concentre-toi sur le module X » ([CLAUDE.md](./CLAUDE.md#cadrage--concentre-toi-sur-le-module-x-)). En session autonome, la partie « vision long terme » de l'analyse sera absente : seul `knowledge/` sera exploitable, et l'agent devra signaler la lacune au lieu de la combler.

**Étapes** — deux options, la seconde est préférable :

*Option A — installer la dépendance (débloque la lecture de tous les PDF)*

1. Ouvrir PowerShell **en administrateur**.
2. Exécuter :
   ```powershell
   winget install --id oschwartz10612.Poppler -e
   ```
3. Ajouter le dossier `bin` de Poppler au `PATH` système, puis rouvrir le terminal.

*Option B — exporter le contenu en Markdown (recommandé)*

1. Ouvrir `Documentation_Stratégique\L'Edifice - Documentation Strategique de Reference.pdf`.
2. Exporter / copier le contenu en Markdown vers un fichier texte à côté du PDF, par exemple :
   ```text
   Documentation_Stratégique/documentation-strategique-de-reference.md
   ```
3. Garder le PDF comme original de référence ; le `.md` devient la version lisible par l'agent et par git (diffable, versionnable).

Pourquoi B est préférable : un PDF non suivi par git ne se diffe pas, ne se relit pas en revue, et diverge silencieusement du code. Un `.md` à côté résout le problème d'accès **et** le problème de traçabilité.

**Vérification** : Fichier .md créé et poussé dans `Documentation_Stratégique/`, lisible sans Poppler.
