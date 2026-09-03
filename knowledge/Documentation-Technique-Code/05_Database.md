# Base de données

Statut : source de vérité initiale  
Dernière mise à jour : 2026-09-03

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Système principal](#système-principal)
- [Tables connues](#tables-connues)
- [Domaines de données](#domaines-de-données)
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
- `personal_garmin_daily_stats`
- `personal_daily_briefs`
- `personal_notes`
- `personal_journal_entries`
- `personal_habits`
- `personal_habit_completions`
- `personal_tasks`
- `personal_data_erasure_log`
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

Ces cinq tables sont les seules du dépôt dont **RLS est le garde réel et non une défense en profondeur** : leurs stores utilisent le client de session et non la clé service-role. Voir la section Notes de [Modules](./06_Modules.md) pour le raisonnement complet.

Aucune n'accorde le privilège `DELETE` à `authenticated`, **sauf `personal_habit_completions`** : décocher un jour retire la ligne, une réalisation étant un booléen sur un jour et non du contenu. Sa policy `DELETE` reste scopée au propriétaire. Partout ailleurs, la suppression physique relève du geste « Vider l'historique », qui passe par la clé service-role.

**Cette propriété n'a été réellement appliquée en base qu'à partir du 2026-08-30.** Jusque-là, les migrations du pôle écrivaient `revoke all … from anon` puis `grant select, insert, update … to authenticated`, sans jamais révoquer côté `authenticated` — or un `grant` est additif. Le projet Supabase accordant `arwdDxtm` à tous les rôles par défaut sur toute nouvelle table du schéma `public`, les cinq tables détenaient donc `DELETE` et `TRUNCATE` sans que personne ne l'ait écrit. Aucune suppression n'était possible pour autant, l'absence de policy `DELETE` valant refus sous RLS — mais la défense ne tenait que par **une** couche au lieu des deux annoncées. Corrigé par `20260824110000` (révocation explicite sur les cinq tables) et `20260824120000` (défaut du schéma vidé pour `anon` et `authenticated`) — deux migrations dont l'horodatage de nom dit `0824`, jour de la **découverte**, alors qu'elles ont été écrites et appliquées le **2026-08-30**. Voir le chantier 6 dans `suivi-chantiers-edifice.md`.

`personal_data_erasure_log` journalise ce geste. Elle suit un patron **opposé** aux tables ci-dessus, repris de `project_memory_audit_log` : les deux rôles `anon` et `authenticated` sont révoqués et **aucune policy n'est créée**, ce qui la rend accessible à la seule clé service-role. RLS y est une défense en profondeur derrière une révocation totale, là où les tables du pôle en font leur garde réel — un journal d'audit lisible ou modifiable depuis le navigateur ne prouve rien.

Deux choix de conception y sont délibérés :

- **aucune clé étrangère vers `auth.users`**, contrairement à toutes les autres tables du pôle. Une suppression de compte cascaderait et effacerait la preuve que l'effacement a eu lieu ; un journal d'audit ne doit pas pouvoir être effacé par ce qu'il journalise ;
- **aucun contenu supprimé n'y est stocké**, seulement des volumes (`deleted_count`). Journaliser le contenu d'un effacement le contredirait.

Une entrée est écrite **par table effectivement vidée, et non par module** : un module à deux tables comme Habitudes produit deux entrées portant le même `module` et deux `table_name` distincts. C'est le sens de la colonne `table_name`, et c'est ce qui permet au journal de dire combien de réalisations sont parties avec les habitudes — le plus gros des deux volumes, qu'une entrée unique par module aurait tu.

Le geste qui écrit ces entrées vise **un module à la fois** : `POST /api/personal/settings/erase` accepte `module` et non `modules`. Un effacement ne peut donc jamais produire d'entrées pour deux modules différents dans la même requête, et l'ordre d'écriture au sein d'un module est celui de la suppression — les tables dépendantes d'abord, la principale ensuite.

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
