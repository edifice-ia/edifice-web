# Base de données

Statut : source de vérité initiale  
Dernière mise à jour : 2026-11-24

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Système principal](#système-principal)
- [Tables connues](#tables-connues)
- [Domaines de données](#domaines-de-données)
- [Privilèges des tables accédées par la seule clé service-role](#privilèges-des-tables-accédées-par-la-seule-clé-service-role)
- [Règles de sécurité](#règles-de-sécurité)
- [Migrations](#migrations)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier décrit les données persistées par L'Édifice. Il ne remplace pas les migrations SQL, mais donne une cartographie lisible pour humains et IA.

## Système principal

Supabase est le système de persistance principal. Le projet utilise :

- PostgreSQL pour les tables métier ;
- Row Level Security sur les tables créées ;
- Supabase Storage pour les assets, manifests et rendus ;
- tokens OAuth stockés côté serveur.

## Tables connues

Tables créées ou visibles dans les migrations :

- `oauth_tokens`
- `project_memory`
- `project_memory_audit_log`
- `content_drafts`
- `content_assets`
- `content_draft_asset_links`
- `content_draft_media_plans`
- `content_draft_visual_scenes`
- `pinterest_pins`
- `trajectoire_projects`
- `trajectoire_objectives`
- `trajectoire_actions`
- `personal_calendar_sync_state`
- `personal_calendar_events`
- `personal_garmin_daily_stats`
- `personal_daily_briefs`
- `personal_notes`
- `personal_journal_entries`
- `personal_habits`
- `personal_habit_completions`
- `personal_tasks`
- `personal_journal_categories`
- `personal_journal_entry_categories`
- `personal_goals`
- `personal_data_erasure_log`
- `personal_item_erasure_log`
- `video_render_jobs`
- `short_video_schedules`
- `user_preferences`
- `cost_events`
- `short_video_publications`
- `publication_performance_snapshots`
- `publication_performance_recommendation_actions`
- `assistant_decision_memory`

## Domaines de données

### Mémoire projet

`project_memory` garde les entrées structurantes du projet : titre, contenu, statut, priorité, prochaine action et source. `project_memory_audit_log` trace les modifications et confirmations associées.

### Contenu

`content_drafts` représente les brouillons éditoriaux. Des colonnes ajoutées par migrations suivent le score, les scènes visuelles, la voix, les sous-titres et la préparation vidéo.

`content_assets`, `content_draft_asset_links`, `content_draft_media_plans` et `content_draft_visual_scenes` structurent les assets et états média.

### OAuth et plateformes

`oauth_tokens` stocke les tokens et métadonnées de connexion par fournisseur, compte et environnement. Les fournisseurs incluent notamment Pinterest, YouTube, TikTok, Meta et Instagram selon les routes présentes.

### Shorts et publication

`video_render_jobs`, `short_video_schedules` et `short_video_publications` suivent le rendu, la programmation et les états de publication des vidéos courtes.

### Coûts et performance

`cost_events` trace les coûts. `publication_performance_snapshots` et `publication_performance_recommendation_actions` suivent les performances et recommandations.

### Trajectoire

`trajectoire_projects`, `trajectoire_objectives` et `trajectoire_actions` décrivent objectifs, projets et actions. `trajectoire_actions.effort_level` (`low`/`medium`/`high`, défaut `medium`) qualifie l'effort/enjeu de l'action ; il remplace le proxy basé sur la priorité de l'objectif parent utilisé initialement par le module Personnel pour prioriser les actions selon le niveau de récupération. Voir [Changelog](./11_Changelog.md).

### Personnel

`personal_garmin_daily_stats` stocke un instantané quotidien par utilisateur des métriques Garmin (sommeil, Body Battery, HRV, fréquence cardiaque au repos, stress, charge d'entraînement, score de préparation à l'entraînement) ainsi que la charge brute (`raw_payload` jsonb) reçue de l'API ou de la fixture mockée.

`personal_daily_briefs` stocke le brief quotidien généré à partir de `personal_garmin_daily_stats` : niveau de récupération calculé (`recovery_level`), focus recommandé (`recommended_focus` jsonb), et si l'utilisateur a accepté la proposition (`accepted`, nullable tant que non tranché). Un brief ne modifie jamais `trajectoire_actions` directement ; il reste une proposition en lecture seule vis-à-vis de Trajectoire. Voir [Décisions](./03_Decisions.md) DEC-005.

`personal_notes` et `personal_journal_entries` sont les tables des deux modules à saisie manuelle du pôle. Elles partagent le même patron, différent des deux précédentes : `user_id` **non nullable** et référençant `auth.users` en cascade, contrainte de contenu non vide, `deleted_at` nullable pour la suppression logique, et un déclencheur `updated_at`. `personal_journal_entries` ajoute `mood` (entier nullable, contrainte de plage 1-5) ; le nullable y porte l'information « humeur non renseignée », qui n'est pas la valeur neutre du milieu de l'échelle.

`personal_habits` et `personal_habit_completions` portent le module Habitudes, le premier du pôle à deux tables : une définition et son historique de réalisations. La seconde dénormalise `user_id` pour que les policies restent sans sous-requête, et ferme le risque de dérive par une **clé étrangère composite** `(habit_id, user_id)` vers `personal_habits (id, user_id)` — d'où la contrainte `unique (id, user_id)` sur la table des habitudes, redondante avec la clé primaire mais exigée par Postgres comme cible de référence.

`personal_tasks` porte le module Tâches, quatrième module à saisie manuelle et retour à une table unique après les deux d'Habitudes. Ses champs suivent `23-modules.md` : `title` (l'intitulé), `due_on` (l'échéance, une **date** et non un timestamp — un jour, pas un instant), `status` contraint à `('todo','done')`, et `context_label`.

**`context_label` est un texte libre descriptif, et son nom porte cette distinction.** Ce n'est pas le « Rattachement contexte » de [12-modele-de-donnees.md](../Documentation-Strategique/Markdown/12-modele-de-donnees.md), qui est une *table de liaison* optionnelle vers une Marque ou un Projet, avec cardinalité multiple. Le commentaire de la migration interdit explicitement d'étendre ce champ en `marque_id`/`projet_id` : le jour où une tâche devra provenir d'une Action de Trajectoire — `23-modules.md` le prévoit — ce sera une colonne séparée ou une table de liaison. Voir [Décisions](./03_Decisions.md) DEC-010.

**Aucune date d'achèvement n'est stockée.** Un `completed_at` à côté de `status` créerait deux sources de vérité pour le même fait. Conséquence assumée : le module ne sait pas répondre à « quand cette tâche a-t-elle été faite ». Si le besoin apparaît, `completed_at` devra **remplacer** `status`, pas s'y ajouter.

`personal_journal_categories` et `personal_journal_entry_categories` portent les **catégories de Journal**, créées par l'utilisateur, appliquées en base le 2026-09-10. Une entrée peut porter plusieurs catégories et une catégorie couvrir plusieurs entrées : relation N-N, donc table de liaison explicite. Périmètre Journal uniquement — aucune abstraction commune n'est posée pour Notes ou Tâches. Points de conception :

- **pas de `deleted_at` sur les catégories.** Une étiquette n'est pas du contenu : sa suppression est physique et irréversible. La protection contre la perte est la règle de blocage ci-dessous, pas une corbeille ;
- **unicité par utilisateur, insensible à la casse et aux blancs de bord**, portée par un index unique sur `(user_id, lower(btrim(name)))`. Un index et non une contrainte, une contrainte `unique` ne pouvant porter sur une expression : il n'apparaît donc pas dans `pg_constraint` ;
- **la liaison dénormalise `user_id`**, comme `personal_habit_completions`, pour des policies sans jointure, et **sa cohérence avec les deux parents est garantie en base** : ses deux clés étrangères sont **composites** — `(entry_id, user_id)` vers `personal_journal_entries (id, user_id)`, `(category_id, user_id)` vers `personal_journal_categories (id, user_id)` —, adossées à `unique (id, user_id)` sur chaque parent, patron d'Habitudes. C'est ce qui empêche une liaison de référencer l'entrée ou la catégorie d'un autre compte : Postgres vérifie une clé étrangère **sans appliquer RLS**, et les clés simples posées à la création le permettaient. Faille fermée par `20260914100000`, appliquée le 2026-09-15, avant qu'aucune liaison n'ait existé ;
- **la clé composite vers les catégories est en `on delete restrict`** : c'est la moitié structurelle de la règle qui bloque la suppression d'une catégorie laissant une entrée sans catégorie. Elle ne peut être déclenchée que par les liaisons du propriétaire lui-même. Celle vers les entrées est en `cascade`, filet et non mécanisme — la suppression explicite des dépendantes est la règle, voir [Décisions](./03_Decisions.md) DEC-013, passée en `actif` sur ce cas.

Leur store existe depuis le 2026-09-15, `lib/server/personal/journal-categories-store.ts` : client de session, RLS en garde réel, et l'interface a suivi les 2026-09-16 et 2026-09-17.

`personal_goals` porte le module **Objectifs**, cinquième module à saisie manuelle, appliquée en base le 2026-09-18. Table unique, comme Tâches. Module autonome : aucun lien avec `trajectoire_objectives`, ni avec le « moteur Objectifs » de [20-catalogue-services.md](../Documentation-Strategique/Markdown/20-catalogue-services.md) — un service commun attend un second cas réel, pas un premier cas anticipé. Points de conception :

- **trois valeurs en `numeric(15,3)`** — `start_value`, `target_value`, `current_value`. Un type exact, adapté à des montants ; douze chiffres entiers au plus, ce qui borne la valeur absolue sous 1e12 et fait refuser un dépassement en `22003`. **Au-delà de trois décimales, Postgres arrondit sans erreur** — `80.12345` devient `80.123`, vérifié à l'application : c'est au parser applicatif de refuser une saisie plus précise ;
- **la progression n'est pas stockée** : `(current_value − start_value) / (target_value − start_value)`, calculée à la lecture. Une seule formule couvre l'objectif qui monte et celui qui descend, et **le sens n'est pas stocké non plus** — il se déduit du signe de `target_value − start_value`, qu'une colonne `direction` pourrait contredire. Même règle que la charge de Tâches et la série d'Habitudes ;
- **la cible doit différer du départ**, contrainte `personal_goals_target_differs_from_start` : la formule diviserait sinon par zéro, cas que la lecture n'a donc jamais à traiter ;
- **`start_value` est `not null default 0`**, et non nullable : « absente » et « 0 » seraient deux écritures du même état, la règle déjà appliquée à `context_label`. Conséquence assumée : un objectif de poids créé sans valeur de départ part de 0 et se lit comme un objectif qui monte ;
- **`current_value` n'a pas de défaut en base**, une colonne ne pouvant prendre par défaut la valeur d'une autre. C'est l'application qui la fixe à `start_value` à la création ;
- **`status` contraint à `('active','achieved')`**, et c'est une **déclaration** de l'utilisateur, jamais recalculée : « cible atteinte » se déduit des valeurs, « atteint » se déclare, et les deux peuvent diverger. Pas de `abandoned` : renoncer à un objectif, c'est l'archiver ;
- **`unit_label`** est un texte libre — « EUR », « kg », « livres » —, nul autorisé, chaîne vide refusée, sur le modèle de `context_label` ;
- **`due_on` est une date**, un jour et non un instant, comme `personal_tasks.due_on` ;
- **aucun historique des valeurs** : `current_value` est écrasée à chaque mise à jour. Une courbe d'évolution demanderait une table dépendante, donc [Décisions](./03_Decisions.md) DEC-012 et DEC-013.

Droits : `SELECT`, `INSERT`, `UPDATE` à `authenticated`, **aucun `DELETE`** ni en privilège ni en policy, trois policies scopées au propriétaire. La révocation `from anon, authenticated` précède le `grant`. Contrôles post-application validés le 2026-09-18, ACL lue par `aclexplode`. Son store, `lib/server/personal/goals-store.ts`, existe depuis le 2026-09-18 : client de session, RLS en garde réel. L'interface, `PersonalGoalsPanel.tsx`, est écrite depuis le 2026-09-19. **La suppression physique passe par la clé service-role**, comme pour les quatre autres modules : « Vider l'historique » et « Supprimer définitivement » un objectif archivé, tous deux branchés le 2026-09-19. Aucune migration n'a été nécessaire — `module` est un `text not null` sans liste de valeurs autorisées sur les deux tables d'audit, qui ne contraignent que les comptes.

Ces huit tables sont les seules du dépôt dont **RLS est le garde réel et non une défense en profondeur** : leurs stores utilisent le client de session et non la clé service-role. Voir la section Notes de [Modules](./06_Modules.md) pour le raisonnement complet.

**Trois d'entre elles seulement accordent le privilège `DELETE` à `authenticated`**, chacune doublée d'une policy `DELETE` scopée au propriétaire, et pour la même raison : aucune ne porte de contenu.

- `personal_habit_completions` — décocher un jour retire la ligne, une réalisation étant un booléen sur un jour ;
- `personal_journal_entry_categories` — retirer une catégorie d'une entrée retire le lien. Un lien n'a aucun champ modifiable, d'où l'absence d'`UPDATE` ;
- `personal_journal_categories` — supprimer une catégorie est un geste de gestion courante sur une étiquette. La garde n'y est pas une corbeille mais la règle de blocage, tenue par l'application et par la contrainte `restrict`.

Partout ailleurs, la suppression physique relève des deux gestes du pôle, « Vider l'historique » et « Supprimer définitivement » un élément archivé, qui passent tous deux par la clé service-role.

**Cette propriété n'a été réellement appliquée en base qu'à partir du 2026-08-30.** Jusque-là, les migrations du pôle écrivaient `revoke all … from anon` puis `grant select, insert, update … to authenticated`, sans jamais révoquer côté `authenticated` — or un `grant` est additif. Le projet Supabase accordant `arwdDxtm` à tous les rôles par défaut sur toute nouvelle table du schéma `public`, les cinq tables détenaient donc `DELETE` et `TRUNCATE` sans que personne ne l'ait écrit. Aucune suppression n'était possible pour autant, l'absence de policy `DELETE` valant refus sous RLS — mais la défense ne tenait que par **une** couche au lieu des deux annoncées. Corrigé par `20260824110000` (révocation explicite sur les cinq tables) et `20260824120000` (défaut du schéma vidé pour `anon` et `authenticated`) — deux migrations dont l'horodatage de nom dit `0824`, jour de la **découverte**, alors qu'elles ont été écrites et appliquées le **2026-08-30**. Voir le chantier 6 dans `suivi-chantiers-edifice.md`. Les deux tables de catégories, créées après ce correctif, tiennent cette propriété dès leur création : leur migration révoque explicitement avant d'accorder, et l'ACL brute lue par `aclexplode` le 2026-09-10 ne montre que les privilèges écrits.

`personal_data_erasure_log` journalise ce geste. Elle suit un patron **opposé** aux tables ci-dessus, repris de `project_memory_audit_log` : les deux rôles `anon` et `authenticated` sont révoqués et **aucune policy n'est créée**, ce qui la rend accessible à la seule clé service-role. RLS y est une défense en profondeur derrière une révocation totale, là où les tables du pôle en font leur garde réel — un journal d'audit lisible ou modifiable depuis le navigateur ne prouve rien.

Deux choix de conception y sont délibérés :

- **aucune clé étrangère vers `auth.users`**, contrairement à toutes les autres tables du pôle. Une suppression de compte cascaderait et effacerait la preuve que l'effacement a eu lieu ; un journal d'audit ne doit pas pouvoir être effacé par ce qu'il journalise ;
- **aucun contenu supprimé n'y est stocké**, seulement des volumes (`deleted_count`). Journaliser le contenu d'un effacement le contredirait.

Une entrée est écrite **par table effectivement vidée, et non par module** : un module à deux tables comme Habitudes produit deux entrées portant le même `module` et deux `table_name` distincts. C'est le sens de la colonne `table_name`, et c'est ce qui permet au journal de dire combien de réalisations sont parties avec les habitudes — le plus gros des deux volumes, qu'une entrée unique par module aurait tu.

Le geste qui écrit ces entrées vise **un module à la fois** : `POST /api/personal/settings/erase` accepte `module` et non `modules`. Un effacement ne peut donc jamais produire d'entrées pour deux modules différents dans la même requête, et l'ordre d'écriture au sein d'un module est celui de la suppression — les tables dépendantes d'abord, la principale ensuite.

### Academy

*Jusqu'au 2026-11-24, cette section disait « aucune table » ; la migration ci-dessous est la première du domaine.*

**Cinq tables, migration appliquée en base le 2026-11-24, contrôles structurels conformes (tests fonctionnels non faits)** — `supabase/migrations/20261124120000_create_academy_hierarchy.sql`, commit local du 2026-11-24. **Les cinq tables existent en base depuis le 2026-11-24, après application manuelle dans le SQL Editor** (entrée archivée du même jour dans `MANUAL_ACTIONS.md`).

| Table | Niveau | Parent (clé composite, obligatoire) | Colonnes propres |
|---|---|---|---|
| `academy_programs` | programme : curriculum ou formation | aucun | `kind` (`curriculum` / `formation`), `title`, `description` |
| `academy_subjects` | matière | `(program_id, user_id)` → `academy_programs` | `title`, `description`, `position` |
| `academy_units` | module pédagogique | `(subject_id, user_id)` → `academy_subjects` | `title`, `description`, `position` |
| `academy_chapters` | chapitre | `(unit_id, user_id)` → `academy_units` | `title`, `description`, `position` |
| `academy_lessons` | cours ou leçon | `(chapter_id, user_id)` → `academy_chapters` | `title`, `content` (Markdown, facultatif), `position` |

Colonnes communes : `id`, `user_id` (référence `auth.users`, en cascade), `created_at`, `updated_at` (déclencheur `set_<table>_updated_at`), `deleted_at`. Chaque table porte `unique (id, user_id)`, cible des clés composites `<table>_<parent>_fk`, en `on delete cascade` comme filet de sécurité seulement : la suppression physique, à l'étape 8, supprimera les enfants explicitement (DEC-013).

Contraintes : titre non vide, au plus 200 caractères ; description nulle ou non vide, au plus 2 000 ; contenu de leçon nul ou non vide, au plus 100 000 ; `position >= 0`, sans unicité ; `kind` dans sa liste. **`kind` est une étiquette** : aucune règle de données n'en dépend.

Index partiels `where deleted_at is null` : `(user_id, created_at desc)` sur les programmes, `(parent_id, position)` sur chaque niveau enfant.

Droits : RLS activée ; `revoke all … from anon, authenticated` **avant** le `grant` ; `SELECT`, `INSERT`, `UPDATE` à `authenticated`, **aucun `DELETE`** ; trois policies par table, `select_own`, `insert_own` et `update_own`, toutes sur `user_id = auth.uid()`. RLS est le garde réel : le store `lib/server/academy/hierarchy-store.ts` (2026-11-24) accède à ces tables par le **client de session**, jamais par la clé service-role, comme ceux du pôle Personnel, et filtre en plus chaque requête sur `user_id`.

**Archivage** : archiver un parent n'archive pas ses enfants ; c'est la lecture qui les masque. **Ordre** : `position`, puis `created_at`. Voir la note du 2026-11-24 sous DEC-014 dans [Décisions](./03_Decisions.md).

Hors de cette migration, étape 2b : `academy_objectives` et `academy_resources`.

**`academy_objectives` — objectifs pédagogiques, migration appliquée en base le 2026-11-26, contrôles structurels conformes** — `supabase/migrations/20261126120000_create_academy_objectives.sql`, appliquée à la main dans le SQL Editor (entrée archivée du même jour dans `MANUAL_ACTIONS.md`). **Aucun code ne lit ni n'écrit encore cette table** : store, routes et interface de l'étape 2b-1 restent à écrire.

| Colonne | Rôle |
|---|---|
| `program_id`, `subject_id`, `unit_id`, `chapter_id` | parent, **un et un seul** (contrainte `academy_objectives_one_parent`, `num_nonnulls(...) = 1`) ; chacun par une clé composite `academy_objectives_<niveau>_fk`, `(x_id, user_id)` → `(id, user_id)`, en `on delete cascade`. Pas de rattachement à une leçon. |
| `title` | non vide, au plus 200 caractères |
| `description` | nulle ou non vide, au plus 2 000 caractères |
| `position` | `>= 0`, sans unicité |

Colonnes communes et droits identiques à la hiérarchie : `id`, `user_id`, `created_at`, `updated_at` (déclencheur `academy_objectives_set_updated_at`), `deleted_at` ; `unique (id, user_id)` ; RLS ; `revoke all` avant le `grant` de `SELECT`, `INSERT`, `UPDATE` à `authenticated`, aucun `DELETE` ; trois policies `*_own`. Pas de statut « atteint » : la progression se calculera à l'étape 6. Index partiels `(parent_id, position) where deleted_at is null and parent_id is not null`, un par colonne de parent. Entité pédagogique, sans lien avec `personal_goals` ni `trajectoire_objectives` (DEC-014).

`academy_resources` (étape 2b-2) : pas encore de migration.

## Privilèges des tables accédées par la seule clé service-role

Neuf tables ne sont lues et écrites que par des clients service-role — vérifié par lecture du code le 2026-09-28, noms de table dynamiques compris : `personal_calendar_events`, `personal_calendar_sync_state`, `content_drafts`, `content_draft_asset_links`, `content_draft_media_plans`, `content_draft_visual_scenes`, `trajectoire_projects`, `trajectoire_objectives`, `trajectoire_actions`. Aucun client de session ni client navigateur ne les cite. **Pour elles, RLS est une défense en profondeur, pas le garde réel** — l'inverse des huit tables du pôle Personnel dont les stores utilisent le client de session.

**Ce que disent leurs migrations** : RLS activée, `revoke all … from anon`, `grant select, insert, update, delete … to authenticated`, puis quatre policies `to authenticated` — `user_id = auth.uid()` pour `content_drafts`, `trajectoire_*` et `personal_calendar_*`, et une existence de brouillon appartenant à l'appelant pour les trois tables liées à `content_drafts`. Aucune ne révoque `from authenticated` : c'est le défaut du chantier 6, qui n'avait traité que cinq tables du pôle Personnel. Deux autres, `personal_daily_briefs` et `personal_garmin_daily_stats`, ont le même défaut et sont hors de cette section.

**Ce que la migration `20260928100000_revoke_client_privileges_on_service_role_only_tables.sql` change** : `revoke all … from anon, authenticated` sur les neuf tables, **sans re-grant** — ce que le chantier 6 faisait pour les tables lues par le client de session, et que celles-ci n'ont pas à faire. Elle est **écrite le 2026-09-28, committée le 2026-09-29 (`be07b02`), appliquée en base et vérifiée** — compte rendu du 2026-10-04. **La date d'application n'est pas établie** : seules les bornes le sont, après le 2026-09-29 et au plus tard le 2026-10-04. Relevé en base par le mainteneur : plus aucun privilège pour `anon`, `authenticated` ni `PUBLIC` sur les neuf tables, `postgres` et `service_role` intacts, aucun privilège de colonne. RLS et les policies ne sont pas modifiées — les neuf empreintes de policies sont identiques avant et après. Elles sont désormais inatteignables pour les deux rôles clients, et restent comme seconde couche. Les contrôles et le test de fumée sont dans l'entrée archivée du 2026-09-28 de `MANUAL_ACTIONS.md`.

**Effet à connaître** : les policies `to authenticated` de `content_assets`, `video_render_jobs`, `short_video_schedules`, `short_video_publications` et `publication_performance_snapshots` contiennent une sous-requête sur `content_drafts` (et sur `content_draft_asset_links` pour la première). Elle est évaluée avec les privilèges de l'appelant : une requête `authenticated` sur ces cinq tables échouera en « permission denied » plutôt que de renvoyer des lignes filtrées. Aucun code du dépôt n'émet cette requête. Déduit du fonctionnement des policies, **non testé après l'application de la migration**.

**Limite du test de fumée** : il a exercé Trajectoire en écriture complète (`select`, `insert`, `update`, `delete`) et le Calendrier et l'Atelier de contenu en **lecture seule**. Les écritures de l'Atelier de contenu — sur `content_drafts` et les trois tables liées — n'ont pas été exercées ; seul le témoin des privilèges de `service_role` les couvre, indirectement.

**Point ouvert** : `content_drafts` porte en base quatre policies `{public}` absentes des migrations. Lues le 2026-11-22 : restreintes au propriétaire et inatteignables, donc pas une fuite. Supprimées par `20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql`, **appliquée le 2026-11-22** : `content_drafts` ne porte plus que ses quatre policies versionnées `content_drafts_*_own`, relevé en base le même jour. Point clos. Voir le chantier 2 de `suivi-chantiers-edifice.md`.

**`pinterest_pins` — lecture ouverte, corrigée le 2026-11-22.** Sa migration (`20260605110000`) accorde `SELECT` à `authenticated` et pose une policy `using (true)` : tout compte connecté lit toutes les épingles. Relevé en base le 2026-11-22. La table n'a pas de `user_id`, et elle n'est lue et écrite que par la clé service-role (`lib/server/pinterest-reviews.ts`, `lib/server/pinterest-publisher.ts`, `lib/pinterestLocalIndexes.ts`). La même migration `20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql` supprime la policy et révoque `anon` et `authenticated`, sans re-grant — le patron du chantier 7. **Appliquée le 2026-11-22** : relevé en base le même jour, plus aucune policy sur `pinterest_pins` et aucun privilège pour `anon`, `authenticated` ni `PUBLIC` ; bibliothèque et Publisher Pinterest affichés sans erreur. `pinterest_pins` est désormais une table accédée par la seule clé service-role.

## Règles de sécurité

Les migrations activent Row Level Security sur les tables créées. Les accès serveur utilisent des variables d'environnement Supabase et doivent rester côté serveur.

Règles à conserver :

- ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client ;
- centraliser les écritures sensibles dans `lib/server` ou routes API protégées ;
- documenter toute nouvelle table et son usage ;
- associer toute migration métier à une mise à jour de cette page.

## Migrations

Les migrations vivent dans `supabase/migrations` et sont nommées par timestamp. Elles constituent la référence technique de vérité pour le schéma.

## Liens utiles

- [Architecture](./01_Architecture.md)
- [Workflows](./08_Workflows.md)
- [Décisions](./03_Decisions.md)

## À mettre à jour

- Ajouter les colonnes principales par table.
- Ajouter un diagramme relationnel.
- Documenter les policies RLS effectives.
- Ajouter les buckets Supabase Storage et leurs conventions de chemin.
