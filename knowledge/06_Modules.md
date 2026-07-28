# Modules

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-28

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Modules cockpit](#modules-cockpit)
- [Bibliothèque (vision, non implémentée)](#bibliothèque-vision-non-implémentée)
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

### Bibliothèque (vision, non implémentée)

La [documentation stratégique](../Documentation_Stratégique/L-Edifice-Documentation-Strategique-de-Reference.md) décrit un module Bibliothèque (section 13) : gestion documentaire centralisée, indexation des documents par entité du graphe (client CRM, projet, dépense), notes liées, sans dupliquer le stockage quand une source externe fait autorité.

**Rien de ce module n'existe dans le code.** Il n'apparaît ni dans `lib/cockpit/modules.ts`, ni dans `lib/cockpit/navigation.ts`, ni dans aucune route. Ce n'est pas une dette masquée : aucune surface ne prétend l'offrir. C'est un écart de couverture entre la vision et l'implémentation, à traiter le jour où il entrera dans la [Roadmap](./02_Roadmap.md) — il n'y figure à ce jour à aucun horizon.

Ne pas confondre avec deux choses qui existent et portent le même mot :

- la **bibliothèque médias** du domaine contenu (`content_assets`, `components/pinterest/PinterestLibrary.tsx`, `lib/server/media-pipeline.ts`), que la vision décrit comme partageant le stockage de la Bibliothèque globale mais gardant une taxonomie propre au contenu ;
- le module **Ressources** ci-dessus, qui est un annuaire de liens, pas un système documentaire.

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

Module objectifs/projets/actions. C'est le sous-module de suivi de projets que la [documentation stratégique](../Documentation_Stratégique/L-Edifice-Documentation-Strategique-de-Reference.md) rattache au module Développement (section 14), et qu'elle destine à être partagé avec Business et Personnel. Aujourd'hui, seul le croisement en lecture seule avec Personnel existe (voir [Décisions](./03_Decisions.md) DEC-005) ; il n'y a ni module Business ni projets commerciaux dans le code.

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

### Personnel (Espace intérieur)

OS personnel distinct du cockpit éditorial : suivi d'énergie, sommeil, sport, objectifs, routines, journal et notes. Sert de surface de lecture pour des connecteurs de données externes et de croisement en lecture seule avec Trajectoire.

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
