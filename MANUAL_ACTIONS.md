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

### 2026-09-09 — Appliquer les deux migrations « catégories de Journal »

**Statut** : `pending`

**Fichiers** :

- `supabase/migrations/20260909100000_create_personal_journal_categories.sql`
- `supabase/migrations/20260909110000_create_personal_journal_entry_categories.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : tout le chantier « catégories de Journal », et l'amorçage des dix catégories décrit dans l'entrée suivante.

**ORDRE IMPÉRATIF — appliquer ces deux migrations AVANT de déployer le commit qui les accompagne.** Ce commit déclare déjà `personal_journal_entry_categories` comme table dépendante de Journal dans `lib/server/personal/data-erasure-store.ts`. Tant que la table n'existe pas en base, les **deux gestes de suppression physique de Journal** — « Vider l'historique » et la suppression d'une entrée archivée — échouent en `500`. Vérifié : PostgREST répond `PGRST205 / Could not find the table 'public.personal_journal_entry_categories' in the schema cache`, et `deleteOwnedRows` transforme cette erreur en exception. Aucune donnée n'est perdue, mais le geste est indisponible. La fenêtre inverse — des liaisons orphelines — est nulle aujourd'hui, la table de liaison étant vide tant qu'aucune interface ne crée de lien.

**À lire avant d'exécuter — deux écarts au patron du pôle, tous deux délibérés** :

1. `personal_journal_categories` **accorde `DELETE` à `authenticated`**, avec une policy scopée au propriétaire. C'est la **seconde exception** du pôle après `personal_habit_completions`. Une catégorie est une étiquette, pas du contenu ; la protection contre la perte est la règle de blocage, pas une corbeille.
2. Ces deux tables **n'ont pas de `deleted_at`**. Le soft delete du pôle protège du contenu ; il n'y en a pas ici.

**Conséquence, déjà traitée dans le commit qui accompagne ces migrations** : Journal devient le **deuxième module du pôle à porter une table dépendante**, après Habitudes. `lib/server/personal/data-erasure-store.ts` déclare donc désormais `journal.dependents` avec `personal_journal_entry_categories` et `parentKey: "entry_id"` — c'est la raison de l'ordre impératif ci-dessus. C'est aussi le second cas réel que **DEC-013** attendait, et qui l'a fait passer de `proposé` à `actif` le 2026-09-09.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller le contenu intégral de `20260909100000_create_personal_journal_categories.sql`, cliquer « Run ». Les deux fichiers sont idempotents (`if not exists`, `drop policy if exists`, `drop trigger if exists`, `create or replace function`) : les relancer ne casse rien.
4. Nouvelle requête, coller `20260909110000_create_personal_journal_entry_categories.sql`, cliquer « Run ». **Dans cet ordre** : la seconde référence la première.
5. Vérifier que **RLS est activée** sur les deux — sans cela les policies ne s'appliquent pas :

```sql
select relname, relrowsecurity
from pg_class
where relname in ('personal_journal_categories', 'personal_journal_entry_categories');
```

Attendu : `relrowsecurity` à `true` sur les deux lignes.

6. Vérifier les **grants**. C'est ce contrôle qui a révélé le défaut du chantier 6 ; il n'est pas optionnel :

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('personal_journal_categories', 'personal_journal_entry_categories')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Attendu, et **rien d'autre** :

- `personal_journal_categories` / `authenticated` → `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- `personal_journal_entry_categories` / `authenticated` → `SELECT`, `INSERT`, `DELETE`
- **aucune ligne pour `anon`**, et **aucun `TRUNCATE`, `REFERENCES` ni `TRIGGER`**

7. Vérifier que les policies correspondent exactement aux verbes accordés :

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('personal_journal_categories', 'personal_journal_entry_categories')
order by tablename, cmd;
```

Attendu : quatre policies sur `personal_journal_categories` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), trois sur `personal_journal_entry_categories` (`SELECT`, `INSERT`, `DELETE`). **Aucune policy `UPDATE` sur la table de liaison.**

8. Vérifier que la contrainte `RESTRICT` est bien posée — c'est la moitié structurelle de la règle de blocage :

```sql
select conname, confdeltype
from pg_constraint
where conrelid = 'public.personal_journal_entry_categories'::regclass
  and contype = 'f';
```

Attendu : `confdeltype` = `r` (restrict) sur la clé étrangère vers `personal_journal_categories`, et `c` (cascade) sur celles vers `personal_journal_entries` et `auth.users`.

**Vérification** : les quatre requêtes ci-dessus renvoient exactement les valeurs attendues. Si un `TRUNCATE` ou un droit `anon` apparaît malgré la révocation explicite, **ne pas continuer** et rouvrir le chantier 6 : cela signifierait qu'un troisième `ALTER DEFAULT PRIVILEGES` existe.

### 2026-09-09 — Amorcer les dix catégories de Journal sur `contact.edificeia@gmail.com`

**Statut** : `pending`

**Pourquoi c'est manuel** : insertion ponctuelle de données en production, sur un compte réel nommé. Ce n'est **pas** un mécanisme de seed et ne doit pas en devenir un — aucun script du dépôt ne doit connaître ces dix noms, et aucun futur compte ne doit les recevoir automatiquement. Un script dans `scripts/` serait un outil, et un outil se relance ; ce geste ne doit jamais l'être.

**Bloque** : rien techniquement. Le chantier fonctionne sans, avec zéro catégorie.

**Dépend de** : l'entrée ci-dessus. Les deux tables doivent exister.

**Garde en place, à ne pas retirer** : le `SELECT` résout le compte **par e-mail**, il ne contient aucun UUID en dur. Un identifiant copié serait faux le jour où le compte est recréé — c'est déjà arrivé deux fois sur le compte de test au cours du chantier Tâches. Aucune ligne ne peut atteindre un autre compte que celui nommé dans le `where`.

**Étapes** :

1. **Contrôle préalable.** Vérifier qu'exactement un compte porte cet e-mail :

```sql
select id, email, created_at
from auth.users
where email = 'contact.edificeia@gmail.com';
```

**Une seule ligne attendue.** Si zéro ou plusieurs, s'arrêter : l'insertion viserait la mauvaise cible ou aucune.

2. Exécuter l'insertion :

```sql
insert into public.personal_journal_categories (user_id, name, description)
select u.id, c.name, c.description
from auth.users u
cross join (values
  ('Observations',            'Ce que tu remarques — comportements, relations, société, environnement, toi-même.'),
  ('Prises de conscience',    'Ce que tu comprends sur toi ou sur la vie.'),
  ('Évolutions',              'Ce qui change en toi, comparé à l''ancien toi.'),
  ('Tempêtes',                'Les périodes difficiles : événement → réaction → compréhension → évolution.'),
  ('Décisions',               'Les choix importants, et pourquoi cette direction plutôt qu''une autre.'),
  ('Objectifs / Directions',  'Là où tu veux aller, mesurable ou non.'),
  ('Apprentissages',          'Ce que tu retiens d''une expérience — erreur, rencontre, réussite, échec.'),
  ('Principes / Philosophie', 'Les règles de vie construites progressivement, amenées à évoluer.'),
  ('Relations / Humain',      'Observations et apprentissages sur les dynamiques relationnelles.'),
  ('Fragments',               'Pensées brutes, intuitions non encore classées.')
) as c(name, description)
where u.email = 'contact.edificeia@gmail.com'
on conflict do nothing;
```

`on conflict do nothing` s'appuie sur l'index unique `personal_journal_categories_user_id_name_key`, insensible à la casse : une seconde exécution accidentelle n'insère aucun doublon.

**Vérification** : dix catégories, et zéro sur tout autre compte.

```sql
select count(*) as total
from public.personal_journal_categories c
join auth.users u on u.id = c.user_id
where u.email = 'contact.edificeia@gmail.com';

select count(*) as hors_compte_cible
from public.personal_journal_categories c
join auth.users u on u.id = c.user_id
where u.email <> 'contact.edificeia@gmail.com';
```

Attendu : `total` = 10, `hors_compte_cible` = 0.


### 2026-08-18 — Appliquer la migration `personal_item_erasure_log`

**Statut** : `pending`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : la suppression physique individuelle d'un élément archivé (bouton « Supprimer définitivement » de la carte Archives), sur Notes, Journal et Humeur, et Habitudes. **Le code n'est pas encore écrit** : cette entrée précède l'implémentation, contrairement à celle du 2026-08-13 qui la suivait. Appliquer la migration maintenant ne casse rien et ne rend rien accessible — aucune route n'écrit encore dans cette table.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller ce script **tel quel** et cliquer « Run ». C'est le contenu exact de `supabase/migrations/20260818100000_create_personal_item_erasure_log.sql`, commentaires abrégés ; en cas de doute, c'est le fichier qui fait foi.

```sql
create table if not exists public.personal_item_erasure_log (
  id uuid primary key default gen_random_uuid(),
  -- Pas de FK vers auth.users : une suppression de compte cascaderait et
  -- effacerait la preuve que l'effacement a eu lieu.
  user_id uuid not null,
  module text not null,
  table_name text not null,
  -- Identifiant technique de la ligne supprimee, pas du contenu. Pas de FK :
  -- la ligne referencee n'existe plus au moment de l'ecriture.
  item_id uuid not null,
  -- Lignes dependantes emportees avec l'element. 0 si le module tient dans
  -- une seule table.
  related_deleted_count integer not null default 0,
  requested_at timestamptz not null default now(),
  source text not null default 'archives_panel',
  constraint personal_item_erasure_log_related_count_positive
    check (related_deleted_count >= 0)
);

alter table public.personal_item_erasure_log enable row level security;

-- Patron repris de personal_data_erasure_log : les DEUX roles sont revoques, et
-- aucune policy n'est creee. La table n'est accessible que par la service-role.
revoke all on table public.personal_item_erasure_log from anon;
revoke all on table public.personal_item_erasure_log from authenticated;

create index if not exists personal_item_erasure_log_user_id_requested_at_idx
on public.personal_item_erasure_log (user_id, requested_at desc);
```

Le script est **idempotent sur la table et l'index** (`create ... if not exists`), les `revoke` sont sans effet s'ils ont déjà été appliqués, et `enable row level security` est sans effet si RLS est déjà actif. Le rejouer ne casse rien.

4. Vérifier que les révocations ont bien pris — c'est le point qui avait été appliqué partiellement lors de l'incident du 2026-08-10 sur `personal_habits` :

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'personal_item_erasure_log';
```

5. Vérifier que RLS est actif et qu'aucune policy n'existe :

```sql
select c.relrowsecurity as rls_active,
       (select count(*) from pg_policies p
        where p.schemaname = 'public' and p.tablename = 'personal_item_erasure_log') as nb_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'personal_item_erasure_log';
```

6. Vérifier que la contrainte de positivité est bien en place :

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.personal_item_erasure_log'::regclass
  and contype = 'c';
```

**Vérification** :

- étape 4 : `anon` et `authenticated` **ne doivent apparaître dans aucune ligne**. Une ligne pour l'un des deux signifie que les `revoke` n'ont pas pris, et la table serait alors lisible depuis le navigateur — ce qui retirerait toute valeur au journal.
- étape 5 : `rls_active` doit valoir `true` et `nb_policies` doit valoir `0`. Zéro policy avec RLS actif est le résultat attendu, pas une anomalie : sous RLS, l'absence de policy vaut refus, et l'accès ne passe que par la service-role qui contourne RLS.
- étape 6 : la contrainte `personal_item_erasure_log_related_count_positive` doit apparaître avec `CHECK ((related_deleted_count >= 0))`.

Aucun test fonctionnel n'est possible à ce stade : aucune route n'écrit encore dans cette table. Le test viendra avec l'implémentation du geste.

### 2026-08-01 — Vérifier si la review TikTok est terminée, et durcir `/api/oauth/tiktok/status` si oui

**Statut** : `pending`

**Pourquoi c'est manuel** : l'état d'avancement d'une app review TikTok ne se lit que dans le portail développeur TikTok, derrière une authentification interactive. Rien dans le dépôt ne l'indique — recherche faite le 2026-08-01 : aucun ticket, aucune date de soumission, aucun statut, ni dans le code, ni dans `knowledge/`, ni dans l'historique git. Le seul repère est la date d'introduction de l'exception, le 2026-07-28 (`2cf9316`), et celle de la mise en place de l'accès reviewer, entre le 2026-05-20 et le 2026-05-31.

**Bloque** : rien de fonctionnel. C'est une exception de sécurité sans date d'expiration — le risque est qu'elle survive à sa raison d'être et devienne un écart inexpliqué.

**Ce que l'exception autorise exactement** — mesuré le 2026-08-01, pour que la décision se prenne sur des faits et non sur le mot « exception » :

- **Aucun accès anonyme.** Sans session, la route répond `403`, et le middleware redirige déjà vers `/login`. Le compromis ne porte que sur le filtre de rôle.
- `canAccessPrivateCockpit(user)` vaut `getUserRole(user) !== "reviewer"` (`src/lib/auth/roles.ts`). L'écart entre ce garde et le garde strict est donc **exactement un rôle** : celui de `reviewer@edificeia.com`, compte créé et contrôlé par le projet.
- La réponse ne contient **ni token, ni identifiant de compte, ni scope** : `{ present, storageEnabled, storageMode, expiresAt, updatedAt }`. Le reviewer voit qu'un token TikTok existe et depuis quand — strictement moins que ce que le flux OAuth et l'upload sandbox lui accordent déjà par ailleurs.

**Pourquoi le durcissement ne peut pas être fait à l'aveugle** : `/tiktok-sandbox-test` rend `<TikTokConnectionControls />`, qui appelle cette route et **affiche les quatre champs**. Ajouter `canAccessPrivateCockpit` ferait répondre `403` au reviewer et casserait la « vérification du token stocké côté serveur » que la page lui annonce — pendant l'examen de cette même page.

**Étapes** :

1. Ouvrir le portail développeur TikTok et lire le statut de l'app review.
2. **Si la review est terminée** (approuvée ou définitivement rejetée), appliquer le durcissement :
   - retirer `"/api/oauth/tiktok/status"` de `reviewerAllowedPaths` dans `src/lib/supabase/proxy.ts` ;
   - dans `app/api/oauth/tiktok/status/route.ts`, remplacer le garde par celui de `youtube/status` et `calendar/status` :
     ```ts
     if (!user || !canAccessPrivateCockpit(user)) {
       return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
     }
     ```
     avec `import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";` ;
   - supprimer le bloc de commentaire d'exception devenu faux, et mettre à jour `DEC-007` dans `knowledge/Documentation-Technique-Code/03_Decisions.md`, qui cite cette route comme cas particulier assumé.
   - décider au passage du sort des trois autres chemins encore dans `reviewerAllowedPaths` (`/api/oauth/tiktok/start`, `/callback`, `/upload-test`) et du compte `reviewer@edificeia.com` lui-même.
3. **Si la review est encore en cours**, ne rien changer et repousser la relecture ; noter la date de relecture ici.

**Vérification** : connecté avec un compte non-reviewer, `/api/oauth/tiktok/status` doit continuer de répondre `200`. Avec le compte reviewer, elle doit répondre `403` une fois le durcissement appliqué. Et `grep -rn "tiktok/status" src/lib/supabase/proxy.ts` ne doit plus rien renvoyer.

## Archive (done)

### 2026-08-24 — Appliquer la migration `personal_tasks` (module Tâches du pôle Personnel)

**Statut** : `done` — 2026-08-24

**Résultat** : migration appliquée dans le SQL Editor et vérifiée le 2026-08-24. Table, colonnes, contraintes, RLS et policies conformes.

**Ce sont ses contrôles post-application qui ont ouvert le chantier 6.** L'étape 6 ci-dessous — la vérification des grants — a montré `authenticated` en possession de **tous** les privilèges (`SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`) alors que la migration n'en accordait que trois. Le défaut ne venait pas de cette migration : les cinq tables du pôle étaient dans le même état depuis `personal_notes` (2026-08-04), à cause de deux `ALTER DEFAULT PRIVILEGES` du projet Supabase et de migrations qui révoquaient `from anon` sans révoquer `from authenticated`. Corrigé le 2026-08-30 par `20260824110000` et `20260824120000` (commit `f0b1e2d`).

**Ce contrôle a donc payé, et c'est la raison de le garder dans toute entrée future** : sans lui, la table serait passée pour conforme.


**Fichier** : `supabase/migrations/20260824100000_create_personal_tasks.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : tout le module Tâches. Sans cette table, le store et les routes `/api/personal/tasks` échouent et l'onglet ne peut rien afficher ni enregistrer.

**Particularité de sécurité, à lire avant d'exécuter** : comme pour Notes, Journal et Habitudes, **RLS est ici le garde réel et non une défense en profondeur**. Le store utilisera le client de session (clé `anon` + cookies), pas la clé service-role qui contourne RLS. Si les policies ne sont pas appliquées correctement, **il n'y a pas de second filet côté application**. Les étapes de vérification ci-dessous ne sont donc pas optionnelles — et l'incident du 2026-08-10 sur `personal_habits`, où la migration n'avait été appliquée que partiellement, montre que ce n'est pas théorique.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller le contenu intégral de `supabase/migrations/20260824100000_create_personal_tasks.sql` et cliquer « Run ». Le fichier est idempotent (`if not exists`, `drop policy if exists`, `drop trigger if exists`, `create or replace function`) : le relancer ne casse rien.
4. Vérifier que la table et ses colonnes existent :

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'personal_tasks'
order by ordinal_position;
```

5. Vérifier que **RLS est activée** — sans cela les policies ne s'appliquent pas, quoi qu'il arrive :

```sql
select relrowsecurity from pg_class where relname = 'personal_tasks';
```

6. Vérifier les **grants** — c'est le point qui avait été appliqué partiellement lors de l'incident du 2026-08-10 :

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'personal_tasks'
order by grantee, privilege_type;
```

7. Vérifier les **policies**, leur nombre et leur expression :

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'personal_tasks'
order by policyname;
```

8. Vérifier les **contraintes de validation** :

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.personal_tasks'::regclass and contype = 'c'
order by conname;
```

**Vérification** :

- étape 4 : `id`, `user_id` (`NO`), `title` (`NO`), `due_on` (`YES`), `status` (`NO`), `context_label` (`YES`), `created_at` (`NO`), `updated_at` (`NO`), `deleted_at` (`YES`).
- étape 5 : doit renvoyer `true`.
- étape 6 : `authenticated` doit avoir **exactement** `SELECT`, `INSERT`, `UPDATE` — **jamais `DELETE`**. `anon` ne doit apparaître dans **aucune ligne**. Un `DELETE` accordé ici rendrait la suppression physique possible depuis le navigateur, ce que ce module refuse par conception.
- étape 7 : **trois** policies, `personal_tasks_select_own` / `insert_own` / `update_own`, et **aucune policy `DELETE`**. Chaque `qual` et `with_check` doit être `(user_id = auth.uid())` — une expression à `true` serait exactement la faille `content_assets` du 2026-07-28.
- étape 8 : cinq contraintes `CHECK` — `title_not_blank`, `title_max_length`, `status_known` (`status in ('todo','done')`), `context_label_not_blank`, `context_label_max_length`.

Une fois appliquée, le cycle CRUD complet reste à valider par test manuel une fois l'interface construite (checkpoint 3).

### 2026-08-13 — Appliquer la migration `personal_data_erasure_log`, puis tester « Vider l'historique »

**Statut** : `done` — 2026-08-18

**Résultat** : migration appliquée dans le SQL Editor et vérifiée — grants propres (ni `anon` ni `authenticated`), et `confdeltype = c` confirmé sur `personal_habit_completions_habit_fk`, donc la cascade existe bien en base. Le test de bout en bout du geste « Vider l'historique » a été mené le **2026-08-18 par pilotage navigateur humain, pas par script**, sur le compte jetable `test-erase@edificeia.com` (16 lignes de test : 3 notes, 3 entrées de journal, 2 habitudes, 8 réalisations). Les trois modules ont été testés **séparément** :

- suppression ciblée confirmée sur chacun, les deux autres modules restés intacts à chaque fois — c'est la propriété que le passage à un module à la fois (Option A) existe pour garantir ;
- journal d'audit conforme pour Habitudes : **deux entrées dans l'ordre attendu**, `personal_habit_completions` = 8 puis `personal_habits` = 2, ce qui valide la suppression explicite des dépendantes avant la principale ;
- réalisations orphelines : **0**.

Aucune donnée du compte `contact.edificeia@gmail.com` n'a été touchée.

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : tout le geste « Vider l'historique » (Réglages > Personnel). Le code est écrit, typé et compilé, mais `writeErasureAudit` insère dans `personal_data_erasure_log` **après** chaque suppression. Tant que la table n'existe pas, la route renvoie une erreur 500 — et pour Notes ou Journal, la suppression physique aura **déjà eu lieu** quand l'écriture d'audit échoue. **Ne pas exercer le geste avant d'avoir appliqué cette migration.**

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller ce script **tel quel** et cliquer « Run ». C'est le contenu exact de `supabase/migrations/20260806200000_create_personal_data_erasure_log.sql` ; en cas de doute, c'est le fichier qui fait foi.

```sql
create table if not exists public.personal_data_erasure_log (
  id uuid primary key default gen_random_uuid(),
  -- Pas de cle etrangere vers auth.users, deliberement : une suppression de
  -- compte cascaderait et effacerait la preuve que l'effacement a eu lieu.
  user_id uuid not null,
  module text not null,
  table_name text not null,
  deleted_count integer not null,
  requested_at timestamptz not null default now(),
  source text not null default 'settings_personal',
  constraint personal_data_erasure_log_deleted_count_positive
    check (deleted_count >= 0)
);

alter table public.personal_data_erasure_log enable row level security;

-- Patron repris de project_memory_audit_log : les DEUX roles sont revoques, et
-- aucune policy n'est creee. La table n'est accessible que par la service-role.
revoke all on table public.personal_data_erasure_log from anon;
revoke all on table public.personal_data_erasure_log from authenticated;

create index if not exists personal_data_erasure_log_user_id_requested_at_idx
on public.personal_data_erasure_log (user_id, requested_at desc);
```

Le script est **idempotent sur la table et l'index** (`create ... if not exists`) et les `revoke` sont sans effet s'ils ont déjà été appliqués : le rejouer ne casse rien. Il ne l'est pas sur `alter table ... enable row level security`, qui est simplement sans effet si RLS est déjà actif.
4. Vérifier ensuite que les révocations sont bien en place — c'est le point qui a été appliqué partiellement lors de l'incident du 2026-08-10 sur `personal_habits`. Coller et exécuter :

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'personal_data_erasure_log';
```

5. Vérifier aussi que la cascade d'`personal_habit_completions` existe réellement en base, puisque c'est la contrainte que le code refuse délibérément de présumer :

```sql
select conname, confdeltype
from pg_constraint
where conrelid = 'public.personal_habit_completions'::regclass
  and contype = 'f';
```

**Vérification** : à l'étape 4, `anon` et `authenticated` **ne doivent apparaître dans aucune ligne** — la table n'est accessible qu'à la clé service-role, et une ligne pour l'un de ces deux rôles signifie que les `revoke` n'ont pas pris. À l'étape 5, `confdeltype` doit valoir `c` (cascade) ; toute autre valeur confirme que la migration `20260806100000` est encore partiellement appliquée, ce qui ne casse pas la suppression (le code supprime les réalisations explicitement) mais doit être corrigé.

**Procédure de test exécutée** — conservée ci-dessous telle qu'elle a été suivie, pour qu'un futur test du même geste reparte du même protocole.

Ensuite, tester le geste de bout en bout dans Réglages > Personnel. Le flux est **un module à la fois** depuis le 2026-08-16 : chaque module a sa propre ligne et son propre bouton « Vider <module> », et le mot `SUPPRIMER` est retapé à chaque fois. Pour chacun des trois modules, séparément :

1. cliquer « Vider <module> », vérifier que l'écran de confirmation nomme **le bon module** et que le compte annoncé correspond ;
2. taper `SUPPRIMER`, confirmer ;
3. vérifier que **les deux autres modules ont gardé leur compte** — c'est la propriété que ce flux existe pour garantir ;
4. contrôler le journal d'audit, une ligne par table effectivement vidée :

```sql
select module, table_name, deleted_count, requested_at
from public.personal_data_erasure_log
order by requested_at desc
limit 20;
```

Pour **Habitudes**, deux lignes doivent apparaître pour un seul geste — `personal_habit_completions` puis `personal_habits` — et l'écran de résultat doit annoncer les réalisations en plus des habitudes. Vérifier qu'aucune réalisation orpheline ne subsiste :

```sql
select count(*) from public.personal_habit_completions;
```

Tester sur un jeu de données jetable : la suppression est irréversible et sans sauvegarde.

### 2026-08-04 — Appliquer la migration `personal_notes` (module Notes du pôle Personnel)

**Statut** : `done` — 2026-08-04

**Resultat** : migration appliquee dans le SQL Editor et registre reconcilie. Verifie cote agent — `supabase migration list` renvoie desormais `{"local":"20260804100000","remote":"20260804100000"}`, et les trois migrations Garmin restent sans equivalent remote : la pause n'a pas ete rompue. Les policies ont ete controlees contre la base reelle par un appel PostgREST anonyme : `SELECT`, `INSERT` et `DELETE` refuses avec `42501`. Le cycle CRUD complet a ete valide par test manuel le 2026-08-04.

**Pourquoi c'est manuel** : appliquer une migration passe par le SQL Editor du dashboard Supabase. L'agent n'a pas d'accès SQL direct au projet — les variables serveur ne sont pas exposées dans son environnement. La CLI `supabase` est liée et `supabase migration list` fonctionne, mais la seule commande qui appliquerait la migration est `supabase db push`, et **elle ne doit pas être lancée ici** : elle pousserait aussi les trois migrations du lot Garmin/Vitals volontairement en pause (`20260708100000`, `20260708110000`, `20260708120000`).

**Bloque** : tout le module Notes. Sans cette table, la route `/api/personal/notes` échoue et l'onglet Notes ne peut rien afficher ni enregistrer.

**Particularité de sécurité, à lire avant d'exécuter** : c'est la première table du dépôt dont **RLS est le garde réel et non une défense en profondeur**. Le store Notes utilise le client de session (`src/lib/supabase/server.ts`, clé `anon` + cookies), pas la clé service-role des deux autres stores Personnel — qui, eux, contournent RLS. Si les policies ne sont pas appliquées correctement, il n'y a pas de second filet côté application. Les étapes de vérification ci-dessous ne sont donc pas optionnelles.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. Coller et exécuter le contenu intégral de `supabase/migrations/20260804100000_create_personal_notes.sql`. Le fichier est idempotent (`if not exists`, `drop policy if exists`, `create or replace`) : le relancer ne casse rien.
3. Vérifier que la table et ses contraintes existent :
   ```sql
   select column_name, data_type, is_nullable
   from information_schema.columns
   where table_schema = 'public' and table_name = 'personal_notes'
   order by ordinal_position;
   ```
   Attendu : `id`, `user_id` (`NO`), `content` (`NO`), `created_at`, `updated_at`, `deleted_at` (`YES`).
4. Vérifier que **RLS est activée** — sans cela, les policies ne s'appliquent pas, quoi qu'il arrive :
   ```sql
   select relrowsecurity from pg_class where relname = 'personal_notes';
   ```
   Doit renvoyer `true`.
5. Lire **toutes** les policies sans filtre de nom, et contrôler qu'aucune ne porte un `qual` permissif :
   ```sql
   select policyname, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'personal_notes'
   order by policyname;
   ```
   Attendu exactement trois lignes — `_select_own` (SELECT), `_insert_own` (INSERT), `_update_own` (UPDATE) — toutes avec `user_id = auth.uid()`. **Aucune ligne `DELETE`, et aucun `qual` ou `with_check` à `true`.** C'est la requête sans filtre de nom qui avait rattrapé la policy fantôme de `content_assets` le 2026-07-28 : la garder telle quelle.
6. Vérifier que le privilège DELETE n'est **pas** accordé — l'application ne fait que du soft delete :
   ```sql
   select privilege_type
   from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'personal_notes' and grantee = 'authenticated'
   order by privilege_type;
   ```
   Attendu : `INSERT`, `SELECT`, `UPDATE`. **Pas de `DELETE`.**
7. Réconcilier le registre de migrations — **uniquement ce timestamp** :
   ```bash
   supabase migration repair --status applied 20260804100000
   ```
8. Contrôler que les trois migrations Garmin sont **toujours** non appliquées :
   ```bash
   supabase migration list
   ```

**Vérification fonctionnelle** : ouvrir `/interface/personnel`, onglet Notes. Créer une note, la modifier, la supprimer. Puis contrôler que la suppression est bien logique et non physique :

```sql
select id, left(content, 40) as extrait, deleted_at
from public.personal_notes
order by created_at desc
limit 5;
```

La note supprimée doit toujours être présente, avec un `deleted_at` non nul.

### 2026-08-01 — Ajouter la colonne `effort_level` à `trajectoire_actions` en production

**Statut** : `done` — 2026-08-04

**Resultat** : migration appliquee et registre reconcilie. Constate cote agent le 2026-08-04 en verifiant une autre migration — `supabase migration list` renvoie `{"local":"20260711100000","remote":"20260711100000"}`. Le module Trajectoire n'est donc plus vide en production.

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
