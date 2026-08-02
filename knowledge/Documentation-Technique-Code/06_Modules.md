# Modules

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-28

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Modules cockpit](#modules-cockpit)
- [Paramètres (Réglages)](#paramètres-réglages)
- [Bibliothèque (v1.0) — reprise par Ressources](#bibliothèque-v10--reprise-par-ressources)
- [Modules de création](#modules-de-création)
- [Modules de publication](#modules-de-publication)
- [Modules d'observation](#modules-dobservation)
- [Modules personnels](#modules-personnels)
- [Service renderer](#service-renderer)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier cartographie les modules fonctionnels du produit et leurs responsabilités.

## Modules cockpit

### Assistant de L'Édifice

Point central de conversation, analyse et orchestration. Il s'appuie sur :

- `lib/server/assistant/build-project-context.ts`
- `lib/server/assistant/global-assistant.ts`
- `lib/server/assistant-workflows/engine.ts`
- `components/cockpit/AssistantCommandCenter.tsx`

### Cockpit général

Vue d'ensemble des modules, statuts, risques et ressources. Fichiers principaux :

- `app/interface`
- `components/cockpit`
- `lib/cockpit`
- `types/cockpit.ts`

### Ressources

Annuaire de liens vers les consoles externes nécessaires au pilotage (Vercel, Supabase, GitHub, consoles développeurs des plateformes, OVHcloud), plus un raccourci vers la mémoire projet. À maintenir avec `/knowledge` sans le remplacer.

Fichiers :

- `app/interface/resources/page.tsx` et `app/interface/resources/memory/page.tsx`
- `components/cockpit/ProjectResourcesView.tsx`
- `lib/resources/project-resources.ts` (les données, en dur)

Le module est **entièrement déclaratif** : `projectResources` est une liste écrite à la main, et les deux statuts affichés par ressource (`linkStatus`, `projectStatus`) sont des chaînes saisies, jamais calculées. Aucune sonde ne teste les URL. `linkStatus` valait `"accessible"` sur les 27 ressources — une valeur constante, donc sans information, rendue en badge vert à côté d'un état projet présenté comme distinct, ce qui laissait croire à une vérification indépendante. Le champ est désormais à `"non testé"` partout, ce qui est la seule valeur exacte tant qu'aucune sonde n'existe, et l'en-tête de la page annonce que les deux statuts sont déclaratifs. `projectStatus` reste un jugement éditorial assumé, à relire à la main.

Deux limites connues, non corrigées faute d'arbitrage produit : six paires d'entrées pointent vers la même URL sous deux noms (`GitHub`/`GitHub repository`, `Supabase Dashboard`/`Supabase project`, `Vercel Dashboard`/`Vercel project`, `OVHcloud domaine`/`DNS`, `OVHcloud mails`/`Email professionnel`, `Documentation interne Edifice`/`Notion`), ce qui gonfle le compteur « N ressources » affiché par catégorie ; et `projectStatus` vieillit sans que rien ne le signale, exactement comme les items déclaratifs de l'Observatoire.

#### Sous-surface : la mémoire projet

`/interface/resources/memory` (`app/interface/resources/memory/page.tsx`) est la **mémoire projet**, rattachée à Ressources et non à l'Assistant, bien que ce soit l'Assistant qui la consomme. C'est une sous-surface à part entière, atteignable par un raccourci depuis la page Ressources, sans entrée propre dans `cockpitNavigation`.

Son rôle : conserver l'état durable du projet — ce qui a été décidé, ce qui est en cours, ce qui bloque — pour que l'Assistant n'ait pas à le reconstruire à chaque conversation. Elle est stockée dans `project_memory` (`supabase/migrations/20260529143000_create_project_memory.sql`, étendue par `20260613180000` et `20260613190000`) et lue côté serveur par `lib/server/project-memory.ts`.

Elle est **lue par l'Assistant en portée large**, la portée du service commun IA décrite dans [20-catalogue-services.md](../Documentation-Strategique/Markdown/20-catalogue-services.md) : l'Assistant voit tout en focus, sans cloisonnement dur, et la mémoire projet fait partie de ce qu'il voit. C'est ce qui justifie qu'elle soit une ressource consultable par l'humain plutôt qu'un état interne de l'Assistant : les deux lisent la même chose, et ce que l'humain corrige à l'écran, l'Assistant le lit ensuite.

Rattachement dans la nouvelle taxonomie : Ressources est une **surface hors taxonomie pôle/espace**, au même titre que Réglages — voir [10-architecture-systeme.md](../Documentation-Strategique/Markdown/10-architecture-systeme.md). La mémoire projet suit ce rattachement.

### Paramètres (Réglages)

Écran de configuration du cockpit, accessible depuis la navigation sous le libellé « Reglages ». Six onglets : Général, Comptes, Shorts, Voix, Programmation, Connexions, Sécurité.

Fichiers :

- `app/interface/settings/page.tsx` et `app/interface/settings/SettingsWorkspaceClient.tsx`
- `app/interface/settings/connections/page.tsx`, `components/cockpit/SettingsConnectionsPanel.tsx` et les contrôles par provider (`MetaConnectionControls`, `OAuthConnectionControls`, `PinterestConnectionControls`, `TikTokConnectionControls`, `YouTubeConnectionControls`)
- `app/api/settings/preferences/route.ts`
- `lib/settings-preferences.ts` (types, valeurs par défaut, normalisation) et `lib/server/settings-preferences.ts` (lecture/écriture)
- table `user_preferences` (`supabase/migrations/20260627170000_create_user_preferences.sql`)

**Les préférences sont enregistrées mais jamais relues.** C'est le fait le plus important à connaître sur ce module. Les 18 champs de `GlobalSettingsPreferences` et les overrides par compte sont persistés dans `user_preferences` et rechargés par l'écran de réglages lui-même, mais **aucun autre module ne les lit** : aucun fichier hors `app/interface/settings`, `app/api/settings` et `lib/settings-preferences*` n'importe ce module, n'appelle `readSettingsPreferences` ni ne requête `user_preferences`. L'atelier Shorts, le pipeline voix, la programmation et les garde-fous de publication utilisent leurs propres valeurs par défaut, codées en dur — `defaultVoiceId` par exemple existe aussi comme fonction locale dans `lib/server/voice-pipeline.ts`, qui lit la variable d'environnement `ELEVENLABS_VOICE_ID` et ignore la préférence du même nom. Modifier un réglage ne change donc aucun comportement.

L'écran le dit désormais, plutôt que de câbler 18 réglages à travers le produit — ce serait une refonte, pas une correction :

- un bandeau en tête d'écran énonce que les réglages sont stockés et non appliqués, et situe l'onglet Connexions à part (voir ci-dessous) ;
- l'onglet Sécurité porte son propre avertissement : ses quatre bascules de confirmation ne pilotent aucun garde-fou. Les confirmations réellement appliquées sont codées dans les workflows concernés. En désactiver une ne retire aucune protection, en activer une n'en ajoute aucune — c'était le point le plus dangereux du module, puisqu'il pouvait faire croire à un réglage de sécurité ;
- la mention « Priorité active : réglage compte, puis global, puis défaut » est requalifiée en priorité *prévue* : cette résolution n'est implémentée nulle part ;
- le récapitulatif de bas de page ne dit plus « réglages actifs » mais « enregistrés, non encore appliqués » ;
- la bascule « Génération manuelle obligatoire active » était inerte — toujours cochée, `onChange` vide, jamais enregistrée. Remplacée par une mention en lecture seule, sur le modèle de la limite de rendus simultanés qui, elle, était déjà honnête.

#### Onglet Connexions : ce qui est réel et ce qui ne l'est pas

Cet onglet est le seul du module à agir : ses boutons déclenchent de vrais flux OAuth, et ses boutons de test interrogent les routes de statut, qui lisent le token et interrogent l'API tierce.

Le **badge de statut de chaque carte**, en revanche, ne mesure pas la connexion. `getOAuthStatus` (`lib/oauth/server.ts`) ne lit aucun token : elle vérifie la présence des variables d'environnement requises, d'où les libellés `Configure` / `A configurer`. Seul Pinterest fait exception — `SettingsConnectionsPanel` lit `getOAuthTokenStatus("pinterest")` et affiche `Actif` si un token existe réellement.

La fonction contenait un `if (provider.key === "youtube") return "Connecte"` qui renvoyait une connexion **en dur, inconditionnellement** : la carte YouTube affichait un badge « Connecte » permanent, sans token et même sans variable d'environnement configurée. C'est le même motif que la sonde cassée de l'Observatoire. Supprimé le 2026-08-01 ; YouTube suit désormais la logique commune, et un commentaire sur la fonction interdit d'y réintroduire une valeur affirmative sans lecture de token. Le panneau annonce explicitement ce que le badge mesure.

Suite possible, non faite : étendre à tous les providers la lecture réelle du token, sur le modèle de Pinterest, pour que le badge signifie « connecté » plutôt que « configuré ».

Écart de couverture avec la [documentation stratégique v1.0, archivée](../Archive/v1.0-2026-07/L-Edifice-Documentation-Strategique-de-Reference.md) (section 17), non traité : identité et profil, notifications, sessions actives et journaux d'accès n'existent pas. Les deux capacités de souveraineté que la vision rattache explicitement à ce module — **export complet des données** et **suppression ciblée ou totale** — sont également absentes du code.

### Bibliothèque (v1.0) — reprise par Ressources

La [documentation stratégique v1.0, archivée](../Archive/v1.0-2026-07/L-Edifice-Documentation-Strategique-de-Reference.md) décrivait un module Bibliothèque (section 13). **Son repreneur dans la structure actuelle est le module [Ressources](#ressources)** — liens utiles et accès direct aux sites — confirmé par Vincent le 2026-08-01.

La v1.0 portait une ambition plus large que ce qui a été retenu : gestion documentaire centralisée, indexation des documents par entité du graphe (client CRM, projet, dépense), notes liées, sans dupliquer le stockage quand une source externe fait autorité. **Cette part n'a pas été reprise.** La fonction retenue dans le produit réel est plus simple : un annuaire de liens vers les consoles externes, plus le raccourci vers la mémoire projet.

Ce n'est donc ni une dette masquée ni un écart de couverture — c'est un périmètre volontairement réduit. Aucune surface ne prétend offrir l'indexation documentaire.

Ne pas confondre avec la **bibliothèque médias** du domaine contenu (`content_assets`, `components/pinterest/PinterestLibrary.tsx`, `lib/server/media-pipeline.ts`), qui porte le même mot et relève du stockage d'assets de marque.

## Modules de création

### Atelier de contenu

Zone de création et préparation des contenus. Elle couvre notamment les Shorts et Pinterest.

### Atelier Shorts

Pipeline éditorial pour brouillons, visuels, voix, sous-titres, préparation vidéo, scheduling et publication.

Fichiers importants :

- `app/interface/post-creation/shorts`
- `lib/server/media-pipeline.ts`
- `lib/server/voice-pipeline.ts`
- `lib/server/subtitle-pipeline.ts`
- `lib/server/video-preparation.ts`
- `lib/server/shorts-scheduling.ts`

### Pinterest

Gestion de bibliothèque, suggestions de tableaux, reviews et publication test contrôlée.

Fichiers importants :

- `components/pinterest`
- `lib/server/pinterest-publisher.ts`
- `lib/server/pinterest-reviews.ts`
- `scripts/sync-pinterest-to-supabase.mjs`

## Modules de publication

**Divergence connue et acceptée sur tout ce groupe.** La documentation stratégique du 2026-08-01 fait de la publication un **service commun** — plomberie consommée depuis une marque, jamais une destination qu'on visite ([20-catalogue-services.md](../Documentation-Strategique/Markdown/20-catalogue-services.md)). Ces surfaces restent pourtant visibles, avec leurs entrées de navigation, parce que la notion de marque qui devrait les consommer n'existe pas encore (voir DEC-009 dans [03_Decisions.md](./03_Decisions.md)). Les retirer du menu supprimerait un accès fonctionnel réel sans lui offrir de remplacement. Elles resteront des destinations tant que l'espace Contenu n'est pas construit.

La même remarque vaut pour l'atelier **Pilotage IA** (`/interface/post-creation/shorts/pilotage-ia`), qui expose en entrée de menu une capacité que la cible range dans le service commun IA, et pour **Réglages › Connexions** (`/interface/settings/connections`), que la cible rattache au service commun OAuth et Connexions.

### YouTube Publisher

Workflow UI pour l'API YouTube, avec publication réelle contrôlée.

### Pinterest Publisher

Sélection des pins prêts, choix du tableau cible et publication d'un pin test confirmé.

### TikTok, Meta et Instagram

Routes de statut, OAuth et tests de publication existent. Les workflows doivent rester sous validation humaine et dépendre des statuts de review externe lorsque nécessaire.

## Modules d'observation

### Observatoire

Regroupe signaux, alertes, coûts et état système. Fichiers clés :

- `lib/server/observatory/read-model.ts`
- `app/interface/monitoring`
- `app/api/observatory`

`nextRecommendedAction` est dérivé en priorité d'une source live par `getLiveProjectMemory` (`lib/server/observatory/read-model.ts`) : action prioritaire de la mémoire projet, puis premier item `Bloque`, `A migrer` ou `En cours`. Quand aucune de ces sources ne produit de recommandation, la valeur retombe sur `fallbackNextRecommendedAction` (`lib/cockpit/observatory.ts`), dont le texte annonce explicitement qu'il s'agit d'un repli et ne décrit pas l'état du projet. Cette contrainte est délibérée : la constante contenait auparavant une directive figée (« brancher les statuts réels… en commençant par OAuth YouTube et Supabase ») qui, une fois la tâche faite, s'affichait toujours comme « Prochaine pierre » dans `ProjectMemoryPanel` sans que rien ne signale son obsolescence. Toute directive projet remise à cet endroit reproduirait l'écart.

Il n'existe plus de journal de construction codé en dur. `ConstructionJournal` lit les entrées réelles de `project_memory` ; l'ancien `constructionJournalSeed` (une entrée du 29 mai 2026 dont le blocage annoncé était devenu faux) n'était plus rendu dans l'UI mais restait exposé à l'assistant via `projectMemoryForAssistant`, et a été supprimé.

`observatoryItems` (`lib/cockpit/observatory.ts`) définit trois items d'area `Agents` (`agent-assistant`, `agent-generation`, `agent-montage`) qui ne sont rendus nulle part dans l'app : `app/interface/monitoring` n'affiche que l'area `Infrastructure`, et le seul composant qui rendrait aussi `Agents` (`components/cockpit/ProjectObservatory.tsx`) n'est monté sur aucune route — code mort. À traiter séparément (décision de conception UI, pas une correction de transparence) avant de considérer ces trois items comme réellement visibles quelque part.

### Performance de publication

`lib/server/publication-performance.ts` synchronise les métriques de publication réelles pour YouTube (Data API) et Instagram (Graph API), et écrit des instantanés dans `publication_performance_snapshots`. Un moteur de recommandations à seuils (`buildRecommendations`, déclenché à partir d'un nombre minimal d'instantanés) propose des actions ; la décision de l'utilisateur (accepter/ignorer) est persistée dans `publication_performance_recommendation_actions`, jamais appliquée automatiquement.

TikTok reste honnêtement en lecture placeholder pour cette v1 : aucune métrique TikTok n'est synchronisée, le module le signale explicitement dans son état renvoyé plutôt que d'afficher un faux zéro.

### Coûts

Le suivi de coût est porté par `cost_events`, `lib/server/cost-tracking.ts` et les scripts de vérification.

### Trajectoire

Module objectifs/projets/actions. C'est le sous-module de suivi de projets que la [documentation stratégique v1.0, archivée](../Archive/v1.0-2026-07/L-Edifice-Documentation-Strategique-de-Reference.md) rattache au module Développement (section 14), et qu'elle destine à être partagé avec Business et Personnel. Aujourd'hui, seul le croisement en lecture seule avec Personnel existe (voir [Décisions](./03_Decisions.md) DEC-005) ; il n'y a ni module Business ni projets commerciaux dans le code.

Fichiers clés :

- `app/interface/trajectoire` (`page.tsx`, `TrajectoireClient.tsx`)
- `lib/server/trajectoire.ts`
- `app/api/trajectoire/route.ts` et `app/api/trajectoire/[entity]/[id]/route.ts`
- tables `trajectoire_*`

#### Vocabulaire de progression

Trois valeurs distinctes, qui ne doivent jamais être confondues dans l'UI :

- **manuelle** : le champ `progress` saisi par l'utilisateur et stocké en base ;
- **calculée** : dérivée des enfants — part d'actions `fait` pour un objectif, moyenne des progressions retenues des objectifs pour un projet. Elle vaut `null` quand il n'y a pas d'enfant, et l'UI affiche alors `non disponible` ;
- **retenue** : la calculée si elle existe, sinon la manuelle. C'est la valeur des barres de progression et de la métrique « Progression moyenne retenue ».

Cette séparation est la correction d'un écart réel : `calculatedProjectProgress` retombait silencieusement sur `project.progress`, si bien qu'un projet sans objectif affichait sa valeur saisie à la main sous l'étiquette « Progression calculee », juste à côté d'une « Progression manuelle » portant le même chiffre. La carte objectif faisait déjà correctement la distinction ; la carte projet non. La métrique globale, qui moyenne les progressions retenues, indique désormais combien de projets ont une progression réellement calculée.

Le calcul de progression retenue est **implémenté deux fois** : `retainedObjectiveProgress` existe dans `lib/server/trajectoire.ts` et dans `TrajectoireClient.tsx`. Les deux versions sont identiques aujourd'hui, mais rien ne les tient synchronisées — toute modification de la règle doit être faite aux deux endroits.

## Modules personnels

### Personnel

OS personnel distinct du cockpit éditorial : suivi d'énergie, sommeil, sport, objectifs, routines, journal et notes. Sert de surface de lecture pour des connecteurs de données externes et de croisement en lecture seule avec Trajectoire.

La surface s'appelait « Espace intérieur » à l'écran jusqu'au 2026-08-01. Renommée « Personnel » pour suivre la règle de nommage de [10-architecture-systeme.md](../Documentation-Strategique/Markdown/10-architecture-systeme.md) : les noms sont nus à l'écran, sans préfixe de catégorie. La route `/interface/personnel` et les identifiants internes étaient déjà cohérents avec ce nom.

Fichiers clés :

- `app/interface/personnel` : `page.tsx` et `PersonalDashboardClient.tsx`, onglets Résumé, Énergie, Sommeil, Sport, Objectifs, Tâches, Routines, Journal, Notes, Calendrier, Sources.
- `lib/personal/connectors` : registre générique de connecteurs (`registry.ts`, `types.ts`, `sync.ts`, `index.ts`) et un fichier par connecteur (`garmin.ts`, `strava.ts`, `notion.ts`, `finance.ts`, `calendar.ts`).

Le style UI de `PersonalDashboardClient.tsx` est volontairement distinct des conventions `components/cockpit` (composants locaux `PersonalModuleCard`, `PersonalSection`, `PersonalEmptyState`, palette propre). Ce n'est pas une dette à corriger : le module Personnel n'est pas un module cockpit et ne doit pas être harmonisé avec lui.

Le registre `lib/personal/connectors/registry.ts` est conçu pour accueillir plusieurs connecteurs sans réécriture : chaque connecteur déclare son statut (`À connecter`, `Préparé`, `Indisponible`), ses capacités et ses variables d'environnement requises. Statut réel par connecteur :

- **Garmin** : connecteur actif en développement. Voir [Décisions](./03_Decisions.md) DEC-005 et DEC-006.
- **Strava, Notion, Finance, Calendrier** : stubs déclarés pour usage futur, non implémentés. `syncPersonalConnector` renvoie `success: false` tant qu'un connecteur n'est pas branché.

Tables associées : `personal_garmin_daily_stats`, `personal_daily_briefs`. Voir [Base de données](./05_Database.md).

## Service renderer

`services/shorts-renderer` est un service FastAPI séparé. Il consomme les manifests vidéo stockés dans Supabase Storage et produit des MP4.

## Liens utiles

- [Architecture](./01_Architecture.md)
- [Agents](./07_Agents.md)
- [Workflows](./08_Workflows.md)

## À mettre à jour

- Ajouter un propriétaire fonctionnel ou technique par module.
- Ajouter le statut réel de chaque module en production.
- Ajouter les dépendances externes par module.
- Ajouter les écrans et routes API par module.
