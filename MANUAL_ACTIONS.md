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

### 2026-08-01 — Ajouter la colonne `effort_level` à `trajectoire_actions` en production

**Statut** : `pending`

**Pourquoi c'est manuel** : appliquer une migration passe par le SQL Editor du dashboard Supabase. L'agent n'a pas d'accès SQL direct au projet — les variables serveur ne sont pas exposées dans son environnement. La CLI `supabase` est bien liée au projet et `supabase migration list` fonctionne, mais la seule commande qui appliquerait la migration est `supabase db push`, et **elle ne doit surtout pas être lancée ici** : elle pousserait les **quatre** migrations en retard d'un coup, dont les trois du lot Garmin/Vitals volontairement en pause (voir le tableau ci-dessous). C'est précisément ce que cette entrée existe pour éviter.

**Bloque** : tout le module Trajectoire en production, en lecture comme en écriture.

**État confirmé le 2026-08-01** par `supabase migration list` (compare le local au registre distant, sans rien appliquer). Quatre migrations locales n'ont pas d'équivalent distant, et ce sont les seules :

| Migration | Objet | Remote | Lot |
| --- | --- | --- | --- |
| `20260708100000_create_personal_garmin_daily_stats.sql` | table `personal_garmin_daily_stats` | **absente** | Garmin/Vitals — en pause |
| `20260708110000_create_personal_daily_briefs.sql` | table `personal_daily_briefs` | **absente** | Garmin/Vitals — en pause |
| `20260708120000_add_garmin_oauth_provider.sql` | `garmin` dans le check `provider` de `oauth_tokens` | **absente** | Garmin/Vitals — en pause |
| `20260711100000_add_effort_level_to_trajectoire_actions.sql` | colonne `effort_level` | **absente** | **isolée — objet de cette entrée** |

Toutes les autres migrations du dossier sont appliquées, y compris celles postérieures au 2026-07-11 (`20260721090000` et suivantes) : le retard est un trou au milieu de la séquence, pas une queue non appliquée.

**Pourquoi la quatrième est isolable** — vérifié point par point :

- elle ne touche que `public.trajectoire_actions`, créée par `20260613170000_create_trajectoire_tables.sql`, qui **est** appliquée en remote ;
- son contenu ne comporte aucune clé étrangère, aucun trigger, aucune fonction, aucune référence à une autre table ;
- les trois migrations Garmin ne mentionnent ni `trajectoire` ni `effort_level` (zéro occurrence dans les trois fichiers) ;
- `20260711100000` est le seul fichier du dossier à ajouter `effort_level`.

Elle peut donc être appliquée seule, sans rien réactiver du lot en pause.

**Ce que ça casse aujourd'hui, précisément** — la page ne plante pas, elle se vide. `readTrajectoire` (`lib/server/trajectoire.ts:566`) sélectionne `effort_level` dans la requête sur `trajectoire_actions` et relance l'erreur telle quelle (`throw new Error(actionsError.message)`, ligne 572). Comme cette requête est dans la même fonction que la lecture des projets et des objectifs, son échec **emporte tout le reste** : des projets et objectifs parfaitement lisibles ne sont jamais renvoyés.

En aval, l'erreur est bien attrapée partout, mais ne peut qu'être affichée :

- `/api/trajectoire` répond **500** avec le message Postgres brut ;
- `app/interface/trajectoire/TrajectoireClient.tsx:754` l'affiche dans un bandeau et laisse la liste vide ;
- `app/interface/overview/page.tsx:47` l'attrape aussi et le passe en `readError` ; l'aperçu Trajectoire de l'accueil est vide.

Le message vu par l'utilisateur est donc le texte Postgres, du type `column trajectoire_actions.effort_level does not exist` (SQLSTATE `42703`).

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. Coller et exécuter le contenu intégral de `supabase/migrations/20260711100000_add_effort_level_to_trajectoire_actions.sql`, reproduit ici tel quel. Il est idempotent (`if not exists` / `if exists`) : le relancer ne casse rien.

   ```sql
   alter table public.trajectoire_actions
   add column if not exists effort_level text not null default 'medium';

   alter table public.trajectoire_actions
   drop constraint if exists trajectoire_actions_effort_level_check;

   alter table public.trajectoire_actions
   add constraint trajectoire_actions_effort_level_check
   check (effort_level in ('low', 'medium', 'high'));
   ```

   Le `default 'medium'` est ce que le code attend déjà : `mapAction` (`lib/server/trajectoire.ts:370`) retombe sur `"medium"` quand la valeur est nulle ou inconnue. Les lignes existantes prennent donc la valeur que l'application leur donnait déjà implicitement.

3. Vérifier que la colonne et la contrainte existent :

   ```sql
   select column_name, data_type, is_nullable, column_default
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'trajectoire_actions'
     and column_name = 'effort_level';

   select conname, pg_get_constraintdef(oid)
   from pg_constraint
   where conrelid = 'public.trajectoire_actions'::regclass
     and conname = 'trajectoire_actions_effort_level_check';
   ```

4. Vérifier que la lecture qui échouait passe :

   ```sql
   select id, status, effort_level
   from public.trajectoire_actions
   limit 5;
   ```

5. Réconcilier le registre de migrations, pour que `supabase migration list` cesse de signaler ce décalage — **uniquement ce timestamp**, jamais les trois autres :

   ```bash
   supabase migration repair --status applied 20260711100000
   ```

6. Contrôler que les trois migrations Garmin sont **toujours** signalées comme non appliquées :

   ```bash
   supabase migration list
   ```

   Attendu : `20260708100000`, `20260708110000` et `20260708120000` sans équivalent remote ; `20260711100000` désormais avec.

**Vérification** : ouvrir `/interface/trajectoire`. Attendu — le bandeau d'erreur disparaît et les projets s'affichent. Côté agent, `curl` authentifié sur `/api/trajectoire` doit renvoyer 200 au lieu de 500.

**Option écartée, à rouvrir seulement si l'exécution SQL doit attendre longtemps** : ajouter un repli côté lecture dans `readTrajectoire`, sur le modèle de `isMissingTableError` dans `lib/server/personal/daily-briefs-store.ts` — retenter la requête sans `effort_level` sur SQLSTATE `42703`, et laisser `mapAction` appliquer son défaut `"medium"`. Ce serait trivial et sans risque (lecture seule, aucune RLS, aucune auth touchée), et rendrait les projets et objectifs de nouveau visibles sans attendre.

Non fait délibérément, et non commité : ce repli deviendrait **définitivement du code mort** dès l'étape 2 exécutée, puisqu'il protège contre un état transitoire qui ne doit pas se reproduire. Ajouter une branche permanente pour contourner une migration en retard revient à documenter le retard dans le code plutôt que de le corriger. Si l'exécution SQL est repoussée de plusieurs jours, l'arbitrage se justifie et le correctif tient en quelques lignes — c'est un choix à faire, pas une évidence.

_Aucune autre entrée en attente._

## Archive (done)

### 2026-08-01 — Régénérer 3 PDF de `knowledge/Documentation-Strategique/PDF/` désynchronisés de leur source Markdown

**Statut** : `done` — 2026-08-01, via `npx md-to-pdf@5.2.5`

**Suite donnée — 2026-08-01** : l’outillage n’est plus ponctuel. `md-to-pdf` est passé en `devDependency` et la régénération des 16 PDF tient dans `npm run docs:pdf` (`scripts/generate-strategic-pdf.mjs`), avec `npm run docs:pdf:check` pour détecter un `.pdf` divergent sans rien réécrire. Le point ouvert que cette entrée laissait — « aucun outil de rendu Markdown → PDF n’est disponible » — est clos : ce n’est plus une action manuelle.

L’arbitrage typographique que cette entrée signalait est tranché du même coup : les 16 PDF sont désormais produits par le même pipeline, donc homogènes. Contenu vérifié identique document par document — seules changent les coupures de ligne, désormais correctes sur les noms de fichiers.

**Pourquoi c'est manuel** : aucun outil de rendu Markdown → PDF n'est disponible. Vérifié dans le dépôt — aucun script npm de génération (les 18 scripts de `package.json` ne couvrent pas la documentation), aucun fichier de `scripts/`, aucune dépendance de rendu dans `package.json`. Vérifié sur la machine — `pandoc`, `wkhtmltopdf`, `weasyprint`, `libreoffice` et `soffice` sont tous absents du `PATH`. `npx md-to-pdf` exige le téléchargement d'un paquet, c'est-à-dire une installation non demandée. Seul `pdftotext` est présent (`/mingw64/bin/pdftotext`), mais il extrait du texte, il n'en produit pas. Le `README.md` de `Documentation-Technique-Code/` confirme d'ailleurs que la génération a toujours été faite à la main : sa section « À mettre à jour » demande encore « ajouter la commande officielle de génération du PDF si elle devient un script npm ».

**Bloquait** : rien de fonctionnel. Mais les trois PDF affichent désormais des liens internes faux, alors que leurs `.md` sources sont corrects — c'est-à-dire exactement le type d'écart que la correction visait à supprimer. Quiconque lit la version PDF suivra un lien mort.

**Ce qui a débloqué la situation** : `npx -y md-to-pdf@5.2.5` fonctionne sur cette machine. Le paquet embarque son propre Chromium via Puppeteer et n'a besoin d'aucun installeur système ni droit administrateur — c'est précisément la limite que cette entrée croyait bloquante. Il n'a **pas** été ajouté à `package.json` : usage ponctuel via `npx`, aucune dépendance du projet n'a changé.

**Deux écarts de rendu découverts en comparant aux 13 autres PDF**, et traités :

1. Le lot initial **ne contient pas la section « Sommaire »** que porte chaque `.md` — vérifié sur trois documents : le `.md` en a une, le `.pdf` n'en garde aucune trace. Un rendu direct en aurait ajouté une que les autres documents n'ont pas. Un script de préparation la retire donc avant rendu.
2. Le lot initial porte un pied de page « L'Édifice — Documentation stratégique » à gauche et le numéro de page à droite, absent du `.md`. Reproduit via `footerTemplate`.

**Ce qui n'est pas identique** : la typographie et la mise en page. Le gabarit d'origine est inconnu — les PDF ne portent aucune métadonnée `Producer`/`Creator` — et n'a donc pas pu être reproduit à l'identique. Les trois documents régénérés sont lisibles et complets, mais ne sont pas visuellement interchangeables avec les treize autres. **C'est un arbitrage à trancher** : soit régénérer les seize avec ce pipeline pour retrouver l'homogénéité, soit retrouver le gabarit d'origine et refaire ces trois-là avec. En l'état, un lien juste a été préféré à une police identique.

**Vérification effectuée** — extraction `pdftotext -layout`, méthode d'abord validée sur les PDF fautifs encore en place, qui remontaient bien une occurrence de chaque ancien nom :

| PDF régénéré | Nom corrigé présent | Ancien nom restant |
| --- | --- | --- |
| `10-architecture-systeme.pdf` | `11-modularite-configuration.md` ×1, `12-modele-de-donnees.md` ×1 | 0 |
| `11-modularite-configuration.pdf` | `13-securite-gouvernance.md` ×1 | 0 |
| `20-catalogue-services.pdf` | `22-espaces-et-marques.md` ×1 | 0 |

Contrôles complémentaires : aucun des seize PDF du dossier ne contient plus d'ancien nom de fichier ; tous les titres de niveau 1 à 3 des sources sont présents dans les rendus (11, 6 et 17 titres, aucun manquant) ; les volumes de texte concordent avec les `.md` sources comme avec les PDF d'origine, à moins de 1 % près, écart imputable au pied de page répété.

**Les trois fichiers concernés**, et la correction que leur `.md` a reçue mais pas eux :

| PDF à régénérer | Source Markdown | Lien corrigé dans le `.md` |
| --- | --- | --- |
| `knowledge/Documentation-Strategique/PDF/10-architecture-systeme.pdf` | `../Markdown/10-architecture-systeme.md` | `11-configuration.md` → `11-modularite-configuration.md`, et `12-modele-donnees.md` → `12-modele-de-donnees.md` |
| `knowledge/Documentation-Strategique/PDF/11-modularite-configuration.pdf` | `../Markdown/11-modularite-configuration.md` | `13-securite.md` → `13-securite-gouvernance.md` |
| `knowledge/Documentation-Strategique/PDF/20-catalogue-services.pdf` | `../Markdown/20-catalogue-services.md` | `22-espaces.md` → `22-espaces-et-marques.md` |

Les 13 autres paires `.md`/`.pdf` du dossier sont inchangées et restent synchronisées.

**Étapes** :

1. Régénérer les trois PDF depuis leur `.md` source, avec l'outil et le gabarit utilisés pour produire le lot initial du 2026-08-01 (chaque PDF porte un pied de page « L'Édifice — Documentation stratégique » : reprendre le même rendu pour que le dossier reste homogène).
2. Les écrire par-dessus les fichiers existants, aux mêmes chemins que le tableau ci-dessus.
3. Committer les trois PDF avec les `.md` déjà corrigés.

Si l'outil d'origine n'est plus disponible, l'alternative durable est d'installer un moteur de rendu et de le câbler en script npm — ce qui fermerait cette entrée définitivement plutôt qu'à chaque révision :

```powershell
winget install --id JohnMacFarlane.Pandoc -e
```

**Vérification** : ouvrir chaque PDF régénéré et contrôler que les noms de fichiers cités correspondent à ceux de la colonne de droite du tableau. Côté agent, l'extraction fonctionne sans Poppler :

```bash
pdftotext -enc UTF-8 knowledge/Documentation-Strategique/PDF/10-architecture-systeme.pdf - | grep -c "11-modularite-configuration"
```

Doit renvoyer au moins `1`, et la commande équivalente sur `11-configuration.md` doit renvoyer `0`.

### 2026-07-28 — Vérifier / appliquer les policies RLS `content_assets` (Lot 2 de l'audit sécurité)

**Statut** : `done` — 2026-07-28

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

**Vérification** — résultat obtenu le 2026-07-28, en base :

- Les policies `_select`, `_insert`, `_update` sont bien resserrées sur le propriétaire : la migration `20260721090000` était appliquée.
- **Une quatrième policy non prévue a été trouvée** : `content_assets_authenticated_delete`, avec `qual = true` littéral — n'importe quel utilisateur authentifié pouvait supprimer n'importe quelle ligne. Elle n'était créée par aucune migration du dépôt (`20260601133000` la supprime en préambule sans la recréer, `20260721090000` ne la mentionne pas) : elle existait uniquement en base, hors du flux de migrations.
- Le grant `DELETE` **était bien accordé** à `authenticated`. La faille était donc réellement exploitable, pas seulement latente — la couche de privilège ne rattrapait pas la couche RLS.
- Corrigé en base par `ALTER POLICY`, vérifié par relecture de `pg_policies` : `_delete` porte désormais la même restriction propriétaire que `_update`. Le correctif est versionné dans `supabase/migrations/20260728210000_scope_content_assets_delete_policy_to_owner.sql`.

**Ce que cette entrée a appris, au-delà de son objet** : `supabase/migrations` ne reflète pas fidèlement l'état réel de la base. Au moins un objet de sécurité y existait sans être versionné. Le critère de succès initialement écrit ici (« les trois policies existent ») était trop étroit et invitait à cocher trois cases au lieu de lire ce que la table contenait — c'est la requête, qui listait toutes les policies sans filtre de nom, qui a rattrapé le coup.

**Note connexe** : le changelog du 2026-07-11 indique que `20260711100000_add_effort_level_to_trajectoire_actions.sql` n'était pas encore appliquée non plus. Reste à vérifier — `lib/server/trajectoire.ts` lit `effort_level`, donc la page Trajectoire échoue si la colonne manque.

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
