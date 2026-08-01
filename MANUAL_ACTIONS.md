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

_Aucune entrée en attente._

## Archive (done)

### 2026-08-01 — Régénérer 3 PDF de `knowledge/Documentation-Strategique/PDF/` désynchronisés de leur source Markdown

**Statut** : `done` — 2026-08-01, via `npx md-to-pdf@5.2.5`

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
