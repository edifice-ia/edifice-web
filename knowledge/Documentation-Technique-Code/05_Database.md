# Base de données

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-11

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

Ces deux tables sont les seules du dépôt dont **RLS est le garde réel et non une défense en profondeur** : leurs stores utilisent le client de session et non la clé service-role. Voir la section Notes de [Modules](./06_Modules.md) pour le raisonnement complet. Ni l'une ni l'autre n'accorde le privilège `DELETE` à `authenticated`, et aucune ne porte de policy `DELETE` — la suppression physique relève du geste RGPD, qui passera par la clé service-role.

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
