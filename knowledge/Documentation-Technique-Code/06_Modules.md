# Modules

Statut : source de vérité initiale  
Dernière mise à jour : 2026-09-16

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

**Ce module n'appelle aucun LLM.** `answerConversation` est une cascade de correspondance de mots-clés qui assemble du texte à partir d'un contexte pré-calculé, sans prompt, sans modèle et sans `tools`. Il n'y a pas non plus d'historique de conversation, et `buildProjectContext()` ne prend aucun `userId` — le contexte est entièrement projet, sans rien de Personnel ni de Trajectoire. Constat de l'audit du 2026-08-04, état assumé et non défaut : voir [Décisions](./03_Decisions.md) DEC-011, qui porte aussi la consigne de **ne pas étendre cette cascade** pour y brancher la lecture d'un module.

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

Écran de configuration du cockpit, accessible depuis la navigation sous le libellé « Reglages ». Huit onglets : Général, Comptes, Shorts, Voix, Programmation, Connexions, Sécurité, Personnel.

Fichiers :

- `app/interface/settings/page.tsx` et `app/interface/settings/SettingsWorkspaceClient.tsx`
- `app/interface/settings/connections/page.tsx`, `components/cockpit/SettingsConnectionsPanel.tsx` et les contrôles par provider (`MetaConnectionControls`, `OAuthConnectionControls`, `PinterestConnectionControls`, `TikTokConnectionControls`, `YouTubeConnectionControls`)
- `app/interface/settings/SettingsPersonalPanel.tsx` (onglet Personnel)
- `app/api/settings/preferences/route.ts`, `app/api/personal/settings/erase/route.ts`
- `lib/settings-preferences.ts` (types, valeurs par défaut, normalisation) et `lib/server/settings-preferences.ts` (lecture/écriture)
- `lib/personal/data-erasure.ts` (types et validation) et `lib/server/personal/data-erasure-store.ts` (comptes et suppression)
- tables `user_preferences` (`supabase/migrations/20260627170000_create_user_preferences.sql`) et `personal_data_erasure_log` (`supabase/migrations/20260806200000_create_personal_data_erasure_log.sql`)

**Les préférences sont enregistrées mais jamais relues.** C'est le fait le plus important à connaître sur ce module — il vaut pour sept des huit onglets. L'onglet **Personnel** fait exception et agit réellement : voir sa sous-section plus bas. L'onglet Connexions agit lui aussi, mais par ses boutons seulement, pas par ses réglages. Les 18 champs de `GlobalSettingsPreferences` et les overrides par compte sont persistés dans `user_preferences` et rechargés par l'écran de réglages lui-même, mais **aucun autre module ne les lit** : aucun fichier hors `app/interface/settings`, `app/api/settings` et `lib/settings-preferences*` n'importe ce module, n'appelle `readSettingsPreferences` ni ne requête `user_preferences`. L'atelier Shorts, le pipeline voix, la programmation et les garde-fous de publication utilisent leurs propres valeurs par défaut, codées en dur — `defaultVoiceId` par exemple existe aussi comme fonction locale dans `lib/server/voice-pipeline.ts`, qui lit la variable d'environnement `ELEVENLABS_VOICE_ID` et ignore la préférence du même nom. Modifier un réglage ne change donc aucun comportement.

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

Écart de couverture avec la [documentation stratégique v1.0, archivée](../Archive/v1.0-2026-07/L-Edifice-Documentation-Strategique-de-Reference.md) (section 17), non traité : identité et profil, notifications, sessions actives et journaux d'accès n'existent pas. Des deux capacités de souveraineté que la vision rattache explicitement à ce module, **l'export complet des données reste absent du code** ; la **suppression ciblée** existe désormais pour les quatre modules à saisie manuelle du pôle Personnel (voir ci-dessous), mais **la suppression totale n'existe pas** — le geste ne couvre ni les autres pôles, ni le compte lui-même.

#### Onglet Personnel : « Vider l'historique »

Le seul onglet de cet écran dont les réglages agissent, et le seul endroit du dépôt qui **supprime physiquement** des données. Il vide l'historique d'un module Personnel — Notes, Journal et Humeur, Habitudes, ou Tâches. Il ne supprime pas le compte, ne touche ni aux connexions, ni aux autres modules du pôle, ni aux autres pôles.

**Un module à la fois, jamais plusieurs.** C'est la propriété structurante de cet écran, et elle descend jusqu'au contrat de la route. La liste de sélection propose une ligne par module, chacune avec son propre bouton nommé — « Vider Notes », « Vider Habitudes ». Il n'existe ni case à cocher, ni bouton commun, ni requête capable d'emporter deux modules.

Le flux est en trois écrans : la liste, une confirmation dédiée au module visé, puis le résultat. **Le nom du module apparaît explicitement sur chacun des trois** — c'est le seul élément qui distingue une confirmation d'une autre, le mot à taper étant générique. À la confirmation, il est sorti du corps du texte : un sur-titre « Module ciblé » puis le libellé en `text-xl`, sur sa propre ligne, puis repris dans la phrase de conséquence, dans le libellé du champ de saisie et sur le bouton final. La confirmation dit aussi ce qui **reste** — « Les autres modules du pôle ne sont pas touchés » — et l'écran de résultat le confirme au passé.

Le mot à taper est `SUPPRIMER`, **générique et identique pour les quatre modules**. Il n'est volontairement pas dérivé du nom du module : c'est le nom affiché qui porte la désignation de la cible, pas le mot tapé. Le champ est vidé à chaque ouverture, sans quoi confirmer un module puis en viser un autre trouverait la saisie déjà faite et le second effacement partirait sans rien retaper.

Le bouton « Vider » n'est **jamais désactivé, même à zéro élément** : un module annoncé à 0 peut conserver des lignes dépendantes orphelines si la cascade a manqué en base (voir DEC-013), et le désactiver fermerait le seul chemin qui les nettoie.

Le contraste avec le reste de l'écran est un piège de conception traité explicitement, pas un détail cosmétique : un bouton qui supprime vraiment, dans un écran où rien d'autre n'agit, serait actionné avec la même légèreté que les bascules inertes d'à côté. Trois conséquences dans le code :

- l'onglet est en **dernière position** et n'est jamais l'onglet par défaut, qui reste `general` ;
- le bandeau « Reglages enregistres, pas encore appliques » et le récapitulatif de bas de page sont **masqués** sur cet onglet — les afficher à côté d'une suppression définitive serait faux et dangereux ;
- le panneau porte son propre bandeau, qui dit l'inverse : cette section agit réellement.

Cinq gardes, dans cet ordre : session obligatoire (`401` sans session) ; **rôle autorisé sur le cockpit privé** (`403` pour un reviewer, garde par défaut posé par [DEC-007](./03_Decisions.md)) ; mot de confirmation `SUPPRIMER` **revalidé côté serveur**, la confirmation de l'interface ne suffisant pas si la route est court-circuitée ; identifiant de module passé par liste blanche, aucun nom de table ne venant jamais du client ; exécution par la clé service-role, avec le filtre `.eq("user_id", …)` centralisé dans une fonction unique du store, dont le paramètre est contraint au type `ErasableTableName` dérivé de `MODULE_TABLES`.

Les deux verbes passent par le **même** helper d'autorisation, `authorizeErasureAccess()`. `GET` compte les lignes de chaque module : le laisser ouvert alors que `POST` est gardé fuiterait des volumes, et deux contrôles écrits séparément auraient fini par diverger. Le `401` et le `403` sont distingués plutôt que fondus en un `403` unique comme ailleurs dans le dépôt — renvoyer `403` à un visiteur sans session enverrait un reviewer déjà connecté sur un écran de connexion.

**L'échec partiel entre modules n'existe pas**, et ce n'est pas une précaution mais une conséquence du contrat : `POST` accepte `module`, jamais `modules`, donc une requête ne peut décrire qu'un seul effacement et il n'y a pas d'état où un module serait supprimé et un autre non. Un appelant resté sur l'ancienne forme `{ modules: [...] }` reçoit une erreur de validation, jamais un effacement partiel. **L'échec partiel à l'intérieur d'un module reste possible** en revanche : sur un module à table dépendante, les dépendantes partent avant la principale, et une erreur entre les deux laisse la principale intacte pour des dépendantes déjà supprimées. Rendre l'ensemble atomique demanderait une fonction Postgres `security definer` — arbitrage non pris.

**Ce store est le seul du pôle à utiliser la clé service-role**, et c'est structurel : `personal_notes`, `personal_journal_entries` et `personal_habits` n'accordent pas `DELETE` à `authenticated` et ne portent aucune policy `DELETE`. La suppression physique y est impossible depuis le client de session, par conception. La contrepartie est que **la service-role contourne RLS** : il n'existe ici aucun garde en base, et le seul filtre d'isolation est ce `.eq("user_id", …)`. C'est le point le plus dangereux du chantier, d'où sa centralisation dans `deleteOwnedRows` — aucun appel direct à `.delete()` ne doit être écrit ailleurs dans ce fichier.

**Habitudes est le premier module effaçable à deux tables**, et ses réalisations sont supprimées **explicitement** avant ses habitudes, plutôt que laissées à la cascade de la clé étrangère composite. La cascade existe bien dans la migration, mais ce module a précisément connu une migration appliquée partiellement en base — l'incident RLS documenté plus bas. Si la contrainte manque en production, la cascade ne se produit pas et les réalisations survivent à leur habitude : des lignes orphelines qu'aucun écran ne montre plus, après un geste qui promettait de tout effacer.

**C'est une règle du dépôt depuis le 2026-09-09.** Elle ne l'était pas avant : le patron était déduit d'un unique module et dépendait d'une propriété qui n'a rien d'universel — `deleteOwnedRows` filtre sur `user_id`, ce qui suppose que chaque table dépendante porte cette colonne. Les catégories de Journal ont fourni le deuxième module attendu, de forme comparable et portant bien `user_id`, ce qui a fait passer [DEC-013](./03_Decisions.md) en `actif`. Corollaire à respecter pour toute nouvelle table dépendante : elle doit porter `user_id`, dénormalisé s'il le faut.

Le compte affiché reste exprimé dans l'unité que l'utilisateur reconnaît — une habitude, pas une ligne. Mais le taire ferait annoncer « 3 éléments » pour une suppression qui en détruit des centaines. Deux champs portent cette nuance de bout en bout :

- **`cascadeLabel`**, déclaré sur le module dans `ERASABLE_MODULES` et repropagé par le résumé serveur. Renseigné pour Habitudes (`"réalisations"`) et, depuis le 2026-09-16, pour Journal (`"attributions de catégories"`), avec le premier écran qui crée des liaisons. Notes et Tâches tiennent dans une table. **Toujours un nom féminin pluriel** : les phrases de l'écran l'accordent ainsi. Il produit la mention `+ réalisations` à côté du compte dans la liste, la phrase « et toutes les réalisations associées » à la confirmation, et l'avertissement qui suit le compte : ce compte ne comprend pas les réalisations, elles sont supprimées aussi. **Cet avertissement est neutre sur le volume.** Deux champs facultatifs le complètent, lus dans `ERASABLE_MODULES` par l'écran et non transmis par le serveur : `cascadeVolumeNote`, renseigné pour Habitudes seul — « et elles sont bien plus nombreuses », vrai pour tout compte par construction, ce que rien ne garantit pour Journal — et `cascadeSurvivalNote`, renseigné pour Journal seul — « Les catégories elles-mêmes sont conservées. », parce que « toutes les attributions de catégories associées » se lit facilement comme « toutes les catégories ».
- **`relatedDeletedCount`**, renvoyé par le serveur après coup, qui chiffre les lignes réellement supprimées dans les tables dépendantes. Il est omis pour un module à table unique plutôt que forcé à zéro. L'écran de résultat l'affiche sous la forme « — réalisations : 8 », le libellé venant du `cascadeLabel` du module et **jamais d'un mot écrit dans l'écran**. Sans `cascadeLabel`, rien n'est affiché : c'est ce qui empêchait un vidage de Journal d'annoncer « 0 réalisation » avant qu'il ait le sien ; il affiche désormais « — attributions de catégories : 5 ». La forme libellé-valeur tient au pluriel de `cascadeLabel` — une phrase « et N réalisations » donnerait « 1 réalisations », et un second champ au singulier doublerait la déclaration. Un futur module à table dépendante devra déclarer le sien : c'est la condition pour que son volume dépendant soit nommé et chiffré, comme DEC-012 l'exige.

L'écran de résultat affiche les volumes **renvoyés par le serveur**, pas ceux annoncés à la confirmation. Un écart entre les deux est donc visible plutôt que masqué.

`isErasableModuleId` est **dérivé** de `ERASABLE_MODULES` et non réécrit à la main. Une énumération parallèle finirait par diverger, et la divergence dangereuse est silencieuse : un module retiré de la liste affichée mais toujours accepté par le validateur resterait effaçable par un appel direct à la route.

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

Le style UI est volontairement distinct des conventions `components/cockpit` (primitives locales, palette propre). Ce n'est pas une dette à corriger : le module Personnel n'est pas un module cockpit et ne doit pas être harmonisé avec lui.

`PersonalModuleCard` et `PersonalEmptyState` vivent depuis le 2026-08-04 dans `app/interface/personnel/PersonalPrimitives.tsx`. Elles étaient définies dans `PersonalDashboardClient.tsx`, ce qui empêchait un panneau de module de vivre dans son propre fichier : le panneau aurait importé ses primitives depuis le dashboard, lequel importe le panneau — cycle. L'extraction a été faite en construisant Notes, et elle est la **préparation des modules suivants** du pôle : Journal, Habitudes et Tâches ont depuis suivi le même patron, Nutrition reste à faire — un fichier par module, important les deux primitives, enveloppé par `PersonalSection` côté aiguillage. `PersonalSection` est resté dans le dashboard : c'est le parent qui l'applique, un panneau n'en a pas besoin.

**Onglet actif et hydratation.** L'onglet courant est mémorisé dans `sessionStorage` et lu par `useSyncExternalStore`, dont l'instantané serveur renvoie toujours `"summary"`. Ce détour est nécessaire : la valeur était auparavant lue dans l'initialiseur de `useState`, si bien que le rendu serveur (sans `window`) et le premier rendu client divergeaient sur la `className` des boutons d'onglet et sur le titre de section — erreur d'hydratation React à chaque rechargement suivant la visite d'un onglet autre que Résumé. Corrigé le 2026-08-04. Conséquence assumée : Résumé s'affiche brièvement avant la bascule sur l'onglet mémorisé. Porter l'onglet dans l'URL supprimerait ce clignotement et reste possible ; ce serait un changement de comportement, pas une correction.

Le registre `lib/personal/connectors/registry.ts` est conçu pour accueillir plusieurs connecteurs sans réécriture : chaque connecteur déclare son statut (`À connecter`, `Préparé`, `Indisponible`), ses capacités et ses variables d'environnement requises. Statut réel par connecteur :

- **Garmin** : connecteur actif en développement. Voir [Décisions](./03_Decisions.md) DEC-005 et DEC-006.
- **Strava, Notion, Finance, Calendrier** : stubs déclarés pour usage futur, non implémentés. `syncPersonalConnector` renvoie `success: false` tant qu'un connecteur n'est pas branché.

Tables associées : `personal_garmin_daily_stats`, `personal_daily_briefs`, `personal_notes`, `personal_journal_entries`, `personal_habits`, `personal_habit_completions`, `personal_tasks`. Voir [Base de données](./05_Database.md).

**Quatre des onze onglets portent de la donnée saisie** : Notes, Journal, Habitudes et Tâches, ci-dessous. Calendrier affiche des événements réels mais en lecture seule, depuis la synchronisation Google. Les six autres — Résumé, Énergie, Sommeil, Sport, Objectifs, Sources — rendent des cartes statiques portant « Ce bloc sera alimenté par … selon le cas ». C'est un écart de couverture assumé, pas une dette masquée : aucune de ces surfaces ne prétend afficher une donnée qu'elle n'a pas.

Un onglet qui reçoit son panneau réel **sort de `tabCards` en même temps** : ses cartes statiques sont retirées, son identifiant sort du `Exclude<…>` qui type ce `Record`, `sourceForActiveTab` cesse de le citer, et la branche générique l'exclut. Les quatre points bougent ensemble — laisser une carte morte derrière un panneau réel serait exactement l'écart que cette section documente.

L'onglet Habitudes s'appelait « Routines » jusqu'au 2026-08-06. Renommé pour suivre le nom du module dans [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) ; l'identifiant interne reste `routines`, comme `links` qui pointe sur Ressources.

### Notes

Premier module à saisie manuelle du pôle Personnel, construit de bout en bout le 2026-08-04 : table, route API, UI. Rôle conforme à [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) — garder une information ponctuelle qui ne mérite pas une entrée de journal. Aucune donnée dérivée n'est attendue, et aucune n'est calculée.

Fichiers :

- `supabase/migrations/20260804100000_create_personal_notes.sql` — table `personal_notes`
- `lib/personal/notes.ts` — types et validation, sans I/O
- `lib/server/personal/notes-store.ts` — les quatre opérations base
- `app/api/personal/notes/route.ts` (GET, POST) et `app/api/personal/notes/[id]/route.ts` (PATCH, DELETE)
- `app/interface/personnel/PersonalNotesPanel.tsx` — liste, ajout, édition en place, suppression avec confirmation légère

**Statut réel : store, API et UI en place, testé en conditions réelles.** Création, édition, suppression et persistance du soft delete confirmées par test manuel le 2026-08-04, migration appliquée et réconciliée en production.

**Ce store est le seul du pôle à utiliser le client de session.** `daily-briefs-store.ts` et `calendar-events-store.ts` instancient Supabase avec `SUPABASE_SERVICE_ROLE_KEY`, qui contourne RLS — non par choix de sécurité, mais parce qu'ils s'exécutent sans session utilisateur, depuis un webhook ou un cron. Notes n'a pas cette contrainte : chaque appel arrive par une requête HTTP authentifiée. Le store utilise donc le client de session (`src/lib/supabase/server.ts`, clé anon + cookies), et **RLS devient le garde réel** plutôt qu'une couche contournée par défaut — principe de moindre privilège, voir [13-securite-gouvernance.md](../Documentation-Strategique/Markdown/13-securite-gouvernance.md).

Conséquence à connaître avant de modifier ce module : si les policies de `personal_notes` sont absentes ou mal appliquées, **il n'y a aucun second filet applicatif**. Les filtres `.eq("user_id", userId)` du store sont redondants avec RLS et volontairement conservés, pour rendre l'intention lisible et couvrir un futur passage au service-role.

Deux traits de la table méritent d'être connus :

- **Suppression logique uniquement.** `DELETE /api/personal/notes/[id]` écrit `deleted_at` ; les notes supprimées ne sont jamais listées. Le privilège `DELETE` n'est pas accordé à `authenticated` et **aucune policy DELETE n'existe** : sous RLS, l'absence de policy vaut refus, donc il faudrait ajouter les deux couches pour qu'une suppression physique redevienne possible. C'est la leçon de l'audit `content_assets` du 2026-07-28, où la faille n'était exploitable que parce que le grant et la policy permissive étaient tombés ensemble. La suppression physique relève du geste RGPD « Supprimer l'historique d'un module », qui passera par la clé service-role.
- **`user_id` est `not null` et référence `auth.users`**, contrairement à `personal_calendar_events` dont le `user_id` est nullable — ce dernier est alimenté par une synchronisation sans contexte utilisateur. Une note est toujours écrite par un humain authentifié.

**Rattachement Marque/Projet : extension différée.** [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) prévoit qu'une note puisse se rattacher à une Marque ou un Projet. Rien de tel n'existe ici, délibérément — voir [Décisions](./03_Decisions.md) DEC-010, commune avec Tâches. Le rattachement se fera par une table de liaison dédiée, sans toucher à `personal_notes` : c'est précisément ce que le modèle en table de liaison de [12-modele-de-donnees.md](../Documentation-Strategique/Markdown/12-modele-de-donnees.md) permet, et la raison de ne pas avoir ajouté une colonne `marque_id` nullable qui serait restée vide indéfiniment.

#### Archives et restauration

`GET /api/personal/notes?archived=true` liste les notes archivées ; la liste active renvoie en plus `archivedCount`, pour que l'écran affiche « Voir les archives (N) » sans second aller-retour. **Il n'existe pas de valeur `all`** : les deux états ne se mélangent jamais dans une même liste, faute de quoi une note archivée pourrait passer pour active.

La restauration est `POST /api/personal/notes/[id]/restore`. Elle remet `deleted_at` à `null` et ne touche à rien d'autre. Côté base, c'est un `UPDATE` : elle emprunte la policy `update` déjà en place, scopée au propriétaire — **aucune policy nouvelle n'a été nécessaire**, puisque archiver est déjà un `UPDATE` de la même colonne.

**Restaurer et supprimer définitivement ne partagent rien**, et c'est le point structurant de cette extension. [11-modularite-configuration.md](../Documentation-Strategique/Markdown/11-modularite-configuration.md) pose qu'éteindre une capacité et supprimer une donnée sont deux intentions différentes qui « ne doivent jamais partager un seul bouton ni une seule confirmation ». Ici la séparation va plus loin que le bouton :

- **trois** fichiers de route distincts depuis le 2026-08-18 — `DELETE /[id]` archive, `POST /[id]/restore` restaure, `DELETE /[id]/permanent` supprime physiquement. Aucun booléen ne fait basculer de l'un à l'autre, et le segment `/permanent` porte l'irréversibilité dans le chemin lui-même ;
- trois fonctions de store distinctes, sans ligne commune ;
- **la suppression physique existe désormais, et à un seul endroit** : `permanentlyDeletePersonalItem`, dans `lib/server/personal/data-erasure-store.ts`. Elle n'est **pas** dans le store du module, et c'est délibéré — ce fichier est le seul du dépôt à supprimer physiquement des données Personnel, invariant qui ne survivrait pas à un éparpillement dans les quatre stores. La table n'accorde toujours pas `DELETE` à `authenticated` et ne porte toujours aucune policy `DELETE` : la suppression passe par la clé service-role, qui contourne RLS, d'où le filtre triple applicatif.

Ce que cette section affirmait jusqu'au 2026-08-18 — « aucune suppression physique n'existe dans ce module, ni route, ni fonction, ni privilège » — n'est donc plus vrai des deux premiers termes. **Le privilège, lui, n'a pas bougé** : `authenticated` ne peut toujours rien supprimer, et c'est ce qui rend la clé service-role nécessaire.

**Le bouton de la liste active s'appelle « Archiver », pas « Supprimer »** — renommé le 2026-08-09, avec la confirmation qui va avec (« Confirmer l'archivage ? »). Le geste n'a jamais rien supprimé physiquement : il écrit `deleted_at` depuis l'origine. Tant que les archives n'existaient pas, l'écart de vocabulaire était discutable ; depuis qu'un écran montre ce que devient l'élément, appeler « Supprimer » une action réversible serait un mensonge de l'interface. Seuls les libellés affichés ont changé — routes, fonctions de store et variables internes gardent leurs noms (`confirmDelete`, `softDeletePersonalNote`, `DELETE /[id]`).

À l'écran, les archives vivent dans une carte séparée, en bordure pointillée et texte atténué. **Deux gestes y sont possibles depuis le 2026-08-18 : « Restaurer » et « Supprimer définitivement ».** Ni modifier, ni rien d'autre.

**« Supprimer définitivement » n'existe que dans cette carte**, et le serveur le revalide : la fonction de store filtre sur `id` + `user_id` + `deleted_at is not null`, donc l'identifiant d'un élément **actif** posté à la route renvoie `404` sans rien détruire. L'interface n'expose le bouton que dans les archives, mais l'interface n'est pas un garde.

La friction est une **confirmation binaire**, sans mot à taper — contrairement au geste à l'échelle du module. Ce n'est pas un relâchement : l'archivage préalable est la première barrière, et il impose déjà deux gestes séparés par un retour à la liste. La confirmation affiche en revanche un **aperçu identifiable** de la cible (début du contenu pour une note, contenu + date + humeur pour une entrée de journal, nom pour une habitude) — une confirmation générique ne protégerait de rien entre deux éléments archivés qui se ressemblent.

Voir [Décisions](./03_Decisions.md) DEC-012, et [11-modularite-configuration.md](../Documentation-Strategique/Markdown/11-modularite-configuration.md), qui range ce geste comme **sous-cas du troisième geste canonique** plutôt que comme un sixième geste.

Ce chantier distinct annoncé ici a bien eu lieu, en deux temps : « Vider l'historique » à l'échelle du module le 2026-08-13, puis la suppression d'un élément archivé le 2026-08-18. Les deux passent par la clé service-role, comme prévu.

### Journal et Humeur

Deuxième module à saisie manuelle du pôle, construit le 2026-08-05 sur le patron de Notes : table, route API, UI. Rôle conforme à [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) — garder une trace libre de ce qui se passe et de l'état d'esprit du moment.

Fichiers :

- `supabase/migrations/20260805100000_create_personal_journal_entries.sql` — table `personal_journal_entries`
- `lib/personal/journal.ts` — types et validation, sans I/O
- `lib/server/personal/journal-store.ts` — les quatre opérations base
- `app/api/personal/journal/route.ts` (GET, POST) et `app/api/personal/journal/[id]/route.ts` (PATCH, DELETE)
- `app/interface/personnel/PersonalJournalPanel.tsx` — liste, ajout, édition en place, suppression avec confirmation légère

**Statut réel : store, API et UI en place.** Migration appliquée et réconciliée en production. Gardes vérifiés contre la base et le serveur réels le 2026-08-05 — les quatre routes répondent `401` sans session, et un appel PostgREST anonyme en `SELECT`, `INSERT` et `DELETE` est refusé avec `42501`. **Le cycle CRUD complet n'a pas été exercé** : il demande une session authentifiée.

Tout ce qui est écrit pour Notes ci-dessus sur le **client de session, RLS comme garde réel, l'absence de second filet applicatif, la suppression logique sans privilège ni policy `DELETE`, et le `user_id` non nullable** vaut identiquement ici. Le store le référence plutôt que de le réécrire.

Deux écarts propres à ce module :

- **`mood`, entier nullable, contrainte de plage 1-5.** Le nullable porte l'information « humeur non renseignée » et **ne doit pas être confondu avec la valeur neutre du milieu de l'échelle** : une entrée peut n'être que du texte. À l'écran, « Non renseignée » est un bouton à part entière du sélecteur, ce qui permet aussi de retirer une humeur déjà notée. Côté `PATCH`, la validation distingue « `mood` absent de la charge utile » (on n'y touche pas) de « `mood: null` » (on efface) par un test d'appartenance de clé, `undefined` disparaissant à la sérialisation JSON.
- **Contenu plafonné à 20 000 caractères**, contre 10 000 pour Notes. [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) oppose explicitement les deux modules par le poids de ce qu'ils portent — une note est « une information ponctuelle qui ne mérite pas une entrée de journal ». Le plafond suit cette distinction.

**Tendance d'humeur : différée, pas oubliée.** [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) décrit comme donnée dérivée notable « une tendance d'humeur sur une période, lisible par l'Assistant sans jamais être traitée comme un diagnostic ». Elle n'est pas construite. Ce n'est pas un oubli : le module de base (CRUD) passait d'abord. Deux points à connaître le jour où elle sera faite — elle se calcule **en lecture** à partir de `mood` et `created_at`, sans colonne ni table supplémentaire, donc sans migration ; et elle devra **exclure les entrées sans humeur** plutôt que les compter comme des valeurs moyennes. L'index partiel `(user_id, created_at desc)` couvre déjà son chemin d'accès, raison pour laquelle aucun index n'a été créé par anticipation.

**Rattachement Marque/Projet : extension différée**, même raison et même référence que Notes — voir [Décisions](./03_Decisions.md) DEC-010, qui s'applique à tout module de domaine de vie construit avant que le concept n'existe en code.

**Archives et restauration : contrat identique à Notes**, libellé « Archiver » compris, à la forme de réponse près (`entries` au lieu de `notes`). `GET /api/personal/journal?archived=true` pour la liste, `POST /api/personal/journal/[id]/restore` pour restaurer, `archivedCount` sur la liste active. Les entrées archivées affichent leur humeur si elle était notée. **Deux gestes y sont possibles depuis le 2026-08-18, comme sur Notes : « Restaurer » et « Supprimer définitivement »** (`DELETE /api/personal/journal/[id]/permanent`) — voir la section Notes ci-dessus pour le raisonnement complet sur la séparation entre les trois gestes. Une différence propre à ce module : l'aperçu de confirmation reprend le début du texte **plus la date d'archivage et l'humeur**, deux entrées de journal commençant souvent de la même façon.

#### Catégories — socle serveur

Construit le 2026-09-15, **sans aucune interface** : les écrans viendront aux checkpoints suivants. Tables en base depuis le 2026-09-10, clés étrangères composites depuis le 2026-09-15 — voir [Base de données](./05_Database.md).

Fichiers :

- `lib/personal/journal-categories.ts` — types et validation, sans I/O, partagés client et serveur
- `lib/server/personal/journal-categories-store.ts` — client de session : **RLS est le garde réel**, sans service-role
- `app/api/personal/journal/categories/route.ts` (GET, POST), `app/api/personal/journal/categories/[id]/route.ts` (PATCH, DELETE), `app/api/personal/journal/[id]/categories/route.ts` (PUT)

Toutes les routes passent par `authorizeCockpitApiAccess()` dès leur écriture, et **valident le format UUID** des identifiants avant qu'ils n'atteignent Postgres — `404` pour un identifiant d'URL malformé, `400` dans le corps. Les routes plus anciennes du pôle ne font pas ce contrôle : un identifiant malformé y remonte en `22P02`, puis en `500`.

**Les catégories d'une entrée s'écrivent par une route à part**, `PUT /api/personal/journal/[id]/categories`, qui remplace l'ensemble — jamais par la création ni par la modification du contenu. L'entrée et ses liaisons ne peuvent pas s'écrire atomiquement : portées par la même requête, un échec sur les liaisons laisserait l'entrée créée et ferait recréer une entrée en double au nouvel essai. Ici, un échec ne laisse qu'une entrée sans catégorie, état valide. Un tableau vide est accepté : **aucune catégorie n'est obligatoire à la saisie**. Les ajouts passent avant les retraits, pour qu'un échec entre les deux laisse trop de catégories, jamais trop peu.

`PersonalJournalEntry` porte désormais `categoryIds`, sur les entrées actives comme archivées. Les noms ne sont pas répétés dans l'entrée : l'interface les résoudra depuis la liste des catégories, source unique, pour qu'un renommage ne laisse pas d'anciens noms dans les entrées déjà chargées.

**Le compte par catégorie inclut les entrées archivées, et le dit** : `entryCount` et `archivedEntryCount`, ce dernier étant une part du premier. Un total des seules entrées actives mentirait sur ce que la suppression peut bloquer.

**La suppression d'une catégorie est physique et irréversible**, et elle vit dans ce store, hors de `data-erasure-store.ts` : ce fichier-là porte les gestes d'effacement de contenu, et une étiquette n'en est pas. Elle est **bloquée en `409 CATEGORY_IN_USE`** si une entrée — **archivée comprise** — n'a que cette catégorie ; rien n'est alors écrit, et la réponse liste ces entrées avec date, humeur et un aperçu calculé côté serveur par `erasurePreview`. Sinon, les entrées qui ont d'autres catégories perdent seulement celle-ci. Séquentielle et non atomique, par choix : si une autre session crée entre-temps une entrée n'ayant que cette catégorie, la clé composite en `restrict` refuse en `23503`, le contrôle est refait, et la réponse est un `409` — jamais une `500`.

Les noms en double — majuscules et blancs de bord ignorés — sont refusés par l'index unique en base, rendus en `409 CATEGORY_NAME_TAKEN`. Le `404` est uniforme : ressource inexistante, d'un autre compte, ou identifiant malformé.

`ERASABLE_MODULES` donne à Journal son `cascadeLabel` depuis le 2026-09-16, arrivé avec le premier écran qui crée des liaisons. Les écrans sont décrits ci-dessous, au fur et à mesure qu'ils existent.

#### Catégories — écran de gestion

Construit le 2026-09-16 : `app/interface/personnel/PersonalJournalCategoriesPanel.tsx`, ouvert par un bouton « Gérer les catégories » **en tête de l'onglet Journal, avant « Nouvelle entrée »** — on crée ses catégories avant d'écrire. Sous-écran de Journal et non de Réglages : Réglages porte le geste qui détruit des données du pôle, y loger une gestion courante brouillerait cette lecture. La carte ne se monte qu'à l'ouverture. Elle ne charge pas ses catégories : `PersonalJournalPanel` les charge et les lui transmet, et elle le prévient après chaque écriture — voir « sélecteur et affichage » ci-dessous.

Elle permet de **créer, renommer et supprimer**. Tout se fait sur place, sans fenêtre modale, comme l'édition des entrées. La validation vient de `lib/personal/journal-categories.ts`, le module des routes : le retour avant appel et le `400` du serveur ne peuvent pas diverger. L'unicité du nom n'est tranchée que par le serveur ; un doublon s'affiche sous le champ.

Chaque catégorie affiche son nom, sa description ou « Sans description », et **son compte, entrées archivées comprises et nommées** : « Aucune entrée », « 1 entrée », « 12 entrées, dont 3 archivées ». Après chaque écriture, la liste est **rechargée depuis le serveur** plutôt que corrigée localement : les comptes y sont calculés, et les recalculer à l'écran créerait une seconde source qui dériverait.

**La suppression demande une confirmation binaire, qui dit trois choses** : le geste est **irréversible**, sans corbeille, et la catégorie devra être recréée à la main ; le compte des entrées qui la portent, **présenté comme venant du dernier chargement**, puisqu'il a pu vieillir ; et la règle — les entrées qui ont d'autres catégories la perdent, et la suppression sera refusée si une entrée n'a que celle-ci. L'écran ne prétend pas savoir d'avance quelles entrées bloqueront : c'est le serveur qui tranche. **Après une suppression, le message reprend le compte renvoyé par le serveur** (`unlinkedEntryCount`), pas celui de la confirmation, pour qu'un écart entre les deux reste visible — même principe que l'écran de résultat de « Vider l'historique ».

**Un refus `409 CATEGORY_IN_USE` est affiché en lecture seule** : le nombre d'entrées qui n'ont que cette catégorie, et leur liste — aperçu, date d'écriture, humeur, mention « archivée ». L'écran dit que rien n'a été supprimé, et que **la réassignation depuis cet écran n'est pas encore construite**. Les refus `CATEGORY_DELETE_RACE` et `404` sont rendus en messages courts, suivis d'un rechargement de la liste.

#### Catégories — sélecteur et affichage sur les entrées

Construit le 2026-09-16, dans `app/interface/personnel/PersonalJournalPanel.tsx`. Interface seule : il consomme `PUT /api/personal/journal/[id]/categories` et le champ `categoryIds` des entrées.

**Les catégories sont chargées une fois, par `PersonalJournalPanel`**, à l'ouverture de l'onglet, indépendamment des entrées : un échec sur les catégories n'empêche ni de lire ni d'écrire son journal. La liste est partagée par la carte de gestion, le sélecteur et l'affichage des noms. Les noms ne sont jamais copiés dans les entrées : un renommage se voit partout. Après chaque écriture dans la carte de gestion, le panneau recharge les catégories **puis les entrées**, archives comprises si elles sont ouvertes : une suppression retire côté serveur des liaisons que les entrées déjà chargées porteraient encore. Une catégorie supprimée est aussi décochée des formulaires ouverts.

**Le sélecteur**, à la création comme à la modification, suit le motif du sélecteur d'humeur : boutons à bascule (`aria-pressed`), dans l'ordre de la liste — triée par nom par le serveur —, description en infobulle. **Rien n'est coché par défaut, et rien n'est obligatoire** ; l'écran l'écrit : « Aucune catégorie cochée : c'est permis. » En modification, les catégories actuelles de l'entrée sont précochées. Sans aucune catégorie, un bouton « Créer une catégorie » ouvre la carte de gestion.

**Deux écritures, dans cet ordre**, puisque l'entrée et ses liaisons ne s'écrivent pas atomiquement :

- **à la création**, `POST` de l'entrée, puis `PUT` des catégories si au moins une est cochée. Si le `PUT` échoue, l'entrée reste affichée sans catégorie et **le formulaire est vidé quand même** : le garder rempli inviterait à renvoyer, donc à créer l'entrée en double. Un message le dit, et invite à ajouter les catégories en modifiant l'entrée ;
- **à la modification**, `PATCH` du texte et de l'humeur, puis `PUT` **seulement si la sélection diffère** de ce que le serveur vient de renvoyer. Si le `PUT` échoue, le texte et l'humeur sont déjà enregistrés : **l'édition reste ouverte**, et « Enregistrer » refait les deux écritures.

**Affichage** : les catégories en étiquettes sous le texte des entrées actives ; atténuées et en lecture seule sur les entrées archivées. La confirmation de suppression définitive d'une entrée archivée les nomme, et précise que les catégories elles-mêmes sont conservées. **Un identifiant absent de la liste chargée n'est pas affiché, sans message** : la clé composite interdit qu'il désigne une catégorie supprimée, il ne peut désigner qu'une catégorie créée ailleurs depuis le chargement. Un **échec de chargement** de la liste, lui, est signalé au-dessus des entrées, puisque aucun nom ne peut alors être affiché.

**Premier écran qui crée des liaisons, il apporte le `cascadeLabel` de Journal**, « attributions de catégories », avec la note « Les catégories elles-mêmes sont conservées. » — voir « Vider l'historique » plus haut.

**Pas encore construite** : la réassignation depuis l'écran de blocage.

### Habitudes

Troisième module à saisie manuelle du pôle, et le premier à **deux tables** : une définition qu'on pose une fois (`personal_habits`) et un historique de réalisations au jour le jour (`personal_habit_completions`). Rôle conforme à [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) — suivre des routines répétées que l'on veut maintenir ou installer.

Fichiers :

- `supabase/migrations/20260806100000_create_personal_habits.sql` — les deux tables
- `lib/personal/habits.ts` — types, validation **et calcul de série et de constance**, sans I/O
- `lib/server/personal/habits-store.ts` — six opérations base
- `app/api/personal/habits/route.ts` (GET, POST), `[id]/route.ts` (PATCH, DELETE), `[id]/completions/route.ts` (POST, DELETE)
- `app/interface/personnel/PersonalHabitsPanel.tsx`

**Statut réel : store, API et UI fonctionnels, vérifiés en conditions réelles.** Création d'habitude, marquage d'une réalisation, affichage de la série et du taux de constance confirmés par test manuel. **RLS confirmée par ce même test** — le rejet `new row violates row-level security policy` rencontré lors de la construction venait de policies absentes en base, la migration n'ayant été appliquée que partiellement ; le rejeu l'a résolu.

#### Deux tables, et pourquoi le DELETE physique y est admis

`personal_habits` suit le patron de Notes et Journal : soft delete par `deleted_at`, aucun privilège `DELETE` accordé à `authenticated`, aucune policy `DELETE`. Archiver une habitude préserve son historique de réalisations.

`personal_habit_completions` **fait exception, et c'est le seul endroit du pôle où `authenticated` obtient `DELETE`**. Une réalisation n'est pas du contenu personnel, c'est un booléen sur un jour : décocher une case mal cochée doit retirer la ligne, pas la marquer supprimée. Un soft delete y aurait en plus obligé à rendre partielle la contrainte d'unicité `(habit_id, completed_on)` et à ressusciter la ligne au lieu d'insérer — plus de code pour aucun bénéfice visible. La policy `DELETE` reste **scopée au propriétaire** ; c'est la différence entière avec l'incident `content_assets` du 2026-07-28, où une policy `using (true)` coexistait avec le privilège.

`user_id` est **dénormalisé** sur les réalisations, pour que les policies restent `user_id = auth.uid()` sans sous-requête. La dérive — une réalisation dont le `user_id` ne correspond pas à celui de son habitude — est fermée par une **clé étrangère composite** `(habit_id, user_id)` vers `personal_habits (id, user_id)`, pas par une convention de code : la base refuse la ligne incohérente.

#### Série et taux de constance

Aucune valeur n'est persistée : les deux sont calculés en lecture par `buildHabitStats`, fonction pure prenant `today` en paramètre — donc testable sur des dates fixes, sans horloge.

**Une règle, deux unités.** Une habitude quotidienne se mesure en jours, une hebdomadaire en semaines, puisque c'est l'unité sur laquelle l'engagement a été pris. Compter en jours une habitude définie « 3× par semaine » mesurerait autre chose que ce qui a été promis. L'étiquette porte donc toujours l'unité — « 12 jours d'affilée » face à « 3 semaines d'affilée ».

**La période en cours ne casse jamais la série.** Ne pas avoir coché aujourd'hui à 9 h du matin ne rompt rien : la journée est en cours. Idem pour la semaine — mercredi avec 1 sur 3, la semaine n'est ni réussie ni ratée, elle est en cours. Elle est donc exclue du décompte et affichée à côté comme progression. Sans cette exclusion, toute série tomberait à zéro chaque lundi matin.

Le **taux de constance** porte sur les 4 dernières semaines **complètes**, la semaine en cours étant exclue pour la même raison. Il vaut `null` — affiché « Pas encore mesurable » — tant qu'aucune semaine complète n'a été vécue.

#### Trois bugs de calcul, trouvés et corrigés avant le premier commit

Ils sont consignés ici parce qu'aucun n'était visible à la lecture du code, et que les trois auraient produit des chiffres faux mais plausibles.

**1. La semaine de création était comptée.** Une habitude créée un jeudi affichait `0 %` dès le lundi suivant : elle était jugée sur l'objectif complet d'une semaine où elle n'avait existé que quatre jours. Le calcul démarre désormais au **lundi suivant la création**.

*Pourquoi exclure plutôt que proratiser* : proratiser — `cible × jours restants ÷ 7` — aurait donné un dénominateur fractionnaire et un pourcentage calculé sur une semaine partielle, exact mais peu comparable d'une habitude à l'autre. Exclure applique au contraire la règle déjà retenue pour la série, *une période incomplète ne compte pas*, et garantit qu'aucun taux affiché ne porte sur une semaine partiellement vécue. Le coût est un « Pas encore mesurable » qui peut durer jusqu'à deux semaines, assumé.

**2. `createdOn` était lu en UTC.** `createdAt.slice(0, 10)` extrait le jour UTC, pas le jour vécu : une habitude créée à 00 h 30 heure de Paris porte un `created_at` de la veille. Si cette veille était un dimanche, elle basculait dans la semaine précédente et déclenchait le bug ci-dessus un jour trop tôt. Remplacé par `parisDayOf()`, à utiliser pour **tout** horodatage venant de la base — le reste du module calculait déjà les jours en Europe/Paris, seul ce point lisait de l'UTC.

**3. Le compte de semaines était surévalué d'une unité.** `effectiveStart` est un lundi et `windowEnd` le dimanche de clôture : l'intervalle est inclusif des deux côtés, donc une semaine y mesure 6 jours d'écart. La formule les arrondissait à 1 puis ajoutait 1, comptant **2 semaines pour une**, et **5 pour la fenêtre pleine de 4**. Le dénominateur était systématiquement trop grand, donc **tous les taux sous-estimés** — d'un facteur 5/4 dans le cas courant. Trouvé en vérifiant le correctif précédent, sur un cas où 3 réalisations sur une cible de 3 affichaient 50 % au lieu de 100 %.

#### Archives et restauration

Ajoutées le 2026-08-10, sur le patron exact de Notes et Journal — la lacune signalée au premier commit du module est comblée. `GET /api/personal/habits?archived=true` liste les habitudes archivées, la liste active renvoie `archivedCount`, et `POST /api/personal/habits/[id]/restore` restaure. Vérifié en conditions réelles.

Aucune policy RLS nouvelle : restaurer est un `UPDATE` de `deleted_at`, déjà couvert par la policy `update` scopée au propriétaire — celle qui couvre l'archivage, en sens inverse.

**Les archives n'affichent ni série ni taux de constance.** Ces valeurs n'ont pas de sens pour une habitude qu'on ne suit plus, et les figer en produirait un chiffre périmé qui ne se signalerait pas. Trois barrières le garantissent, dont deux tenues par le compilateur :

- le type `ArchivedPersonalHabit` est construit sur `PersonalHabit` et **non** sur `PersonalHabitWithStats` : les champs n'existent pas, les lire ne compile pas ;
- `listArchivedPersonalHabits` **n'appelle jamais** `buildHabitStats` — aucun chiffre n'est calculé sur ce chemin ;
- la vue affiche nom, fréquence, date d'archivage, et **le volume brut de réalisations conservées** — un décompte de lignes, qui ne se périme pas et ne suppose aucune fenêtre de calcul, à ne pas confondre avec les statistiques absentes ci-dessus.

Deux boutons y figurent depuis le 2026-08-18 : « Restaurer » et « Supprimer définitivement » (`DELETE /api/personal/habits/[id]/permanent`). Habitudes est le seul des quatre modules à porter une table dépendante, donc le seul dont la confirmation **chiffre ce qui part avec l'élément** : les réalisations sont supprimées explicitement avant l'habitude, et leur nombre est annoncé avant confirmation. C'est ce que `completionCount` sert, et rien d'autre.

**Restaurer retrouve l'historique intact.** L'archivage d'une habitude n'a jamais touché `personal_habit_completions` : les réalisations ne sont supprimées que par le geste décocher, ou par « Supprimer définitivement », qui les emporte avec l'habitude. Série et taux de constance sont donc recalculés sur des données complètes à la lecture suivante, et non repris d'un instantané figé.

#### Hors périmètre

**Le graphique par habitude n'est pas construit** — différé, pas oublié. La série et le taux de constance suffisaient à rendre le module utile ; un graphique demande un arbitrage de forme qui n'a pas été pris.

**Rattachement Marque/Projet : extension différée**, voir [Décisions](./03_Decisions.md) DEC-010, qui s'applique à tout module de domaine de vie construit avant que le concept n'existe en code.

### Tâches

Quatrième module à saisie manuelle du pôle, construit sur le patron d'Habitudes : la table `personal_tasks` le 2026-08-24, puis le store, la route et l'interface le 2026-08-30. Retour à une **table unique** après les deux d'Habitudes : une tâche est une ligne.

Fichiers :

- `lib/personal/tasks.ts` (types et validation, sans I/O) et `lib/server/personal/tasks-store.ts`
- `app/api/personal/tasks/route.ts`, `app/api/personal/tasks/[id]/route.ts`, `app/api/personal/tasks/[id]/restore/route.ts`
- `app/interface/personnel/PersonalTasksPanel.tsx`
- table `personal_tasks` (`supabase/migrations/20260824100000_create_personal_tasks.sql`)

Champs repris de [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) : intitulé, échéance, statut, contexte. Voir [Base de données](./05_Database.md) pour le schéma et le raisonnement sur `context_label`.

**Le garde DEC-007 est posé dès le premier commit**, sur les cinq handlers, via `authorizeCockpitApiAccess()`. Aucun appel à `getCurrentUser()` n'existe dans ce module. C'est la leçon de la route d'effacement, qui avait vécu sans filtre de rôle parce que le contrôle avait été réécrit inline, et du chantier 5 qui a dû reprendre dix routes pour la même raison.

#### Statut, échéance et la distinction qui les protège

`status` a **deux valeurs**, `todo` et `done`. `doing` est écarté délibérément : il introduirait un workflow que rien ne demande, même retenue que sur `frequency_type` d'Habitudes.

Cocher une tâche est un `PATCH` de statut, pas une route dédiée — un statut est un champ comme un autre. La requête n'envoie **que** `status`, et c'est ce qui rend utile la distinction que `parseTaskUpdatePayload` fait entre « champ absent » et « champ à `null` » : sans elle, chaque cochage aurait effacé l'échéance et le contexte au passage. Retirer une échéance s'écrit `dueOn: null` ; ne pas y toucher s'écrit en l'omettant.

#### Ce qui n'est jamais persisté

**La charge de tâches en attente** — la donnée dérivée notable de `23-modules.md` — est un compte de `status = 'todo'` fait à la lecture par `countPendingPersonalTasks`. Aucune colonne ne la stocke.

**« En retard » et « Aujourd'hui »** sont recalculés à chaque rendu depuis la date du jour en Europe/Paris. Les stocker les figerait : une tâche cesserait d'être en retard sans que rien ne la mette à jour. Une tâche faite n'est jamais en retard, quelle que soit son échéance.

Même décision que pour la série et le taux de constance d'Habitudes : **aucune valeur dérivée persistée ne peut se périmer en silence, parce qu'aucune n'est persistée.**

#### Deux pièges de fuseau, évités dans le même sens

`todayInParis()` côté client passe par `Intl` avec `timeZone: "Europe/Paris"` et non par `toISOString()` : une échéance au 24 doit basculer en retard le 25 à minuit heure de Paris, pas à 2 h du matin.

`formatDueOn` suffixe la date nue par `T00:00:00` **sans `Z`** : sans cela, `"2026-08-24"` serait lu en UTC puis reculé d'un jour à l'affichage.

Le tri de la liste active place les tâches **sans échéance après** celles qui en ont une (`nullsFirst: false`) — une date fixée est une contrainte, son absence n'en est pas une, et les mélanger noierait l'urgent. L'index partiel `personal_tasks_user_id_due_on_idx` sert exactement ce tri.

#### Archives et restauration

Même contrat que les trois autres modules : `GET /api/personal/tasks?archived=true` pour la liste, `archivedCount` sur la liste active, `POST /api/personal/tasks/[id]/restore` pour restaurer. Restaurer conserve le statut, l'échéance et le contexte tels qu'ils étaient à l'archivage — une tâche archivée cochée revient cochée.

Aucune policy RLS nouvelle : restaurer est un `UPDATE` de `deleted_at`, déjà couvert par la policy `update` scopée au propriétaire.

**Deux gestes y sont possibles depuis le 2026-09-05 : « Restaurer » et « Supprimer définitivement »** (`DELETE /api/personal/tasks/[id]/permanent`) — voir la section Notes ci-dessus pour le raisonnement complet sur la séparation entre les trois gestes. Tâches est le quatrième et dernier module à saisie manuelle du pôle à recevoir le troisième geste, qui couvre désormais tout le pôle.

`personal_tasks` n'ayant pas de table dépendante, la confirmation n'a **rien à chiffrer** : elle affiche l'intitulé de la tâche, tronqué à 80 caractères par `erasurePreview`, et rien d'autre. `related_deleted_count` vaut 0 dans `personal_item_erasure_log`. C'est le patron de Notes, pas celui d'Habitudes.

Aucune fonction de store propre à Tâches n'a été écrite pour ce geste : `permanentlyDeletePersonalItem` est générique sur `ErasableModuleId`, et Tâches y est déclaré depuis l'extension du geste module. La route ne fait que nommer son module.

#### Nommage : ce module part du bon nom

L'état de confirmation d'archivage s'appelle `confirmingArchiveId`, aligné sur `PersonalHabitsPanel`. Notes et Journal utilisent `confirmingDeleteId` pour désigner la même chose — nom hérité d'avant le renommage « Supprimer » → « Archiver » du 2026-08-09, où seuls les libellés affichés avaient changé. Tâches ne reprend pas cette incohérence.

#### Hors périmètre

**Rattachement à une Action de Trajectoire**, que `23-modules.md` prévoit explicitement comme source possible d'une tâche : non construit, voir [Décisions](./03_Decisions.md) DEC-010. Ce sera une colonne séparée ou une table de liaison, **jamais** une réinterprétation de `context_label`.

**Aucune date d'achèvement** n'est enregistrée : le module ne sait pas dire quand une tâche a été faite. Voir [Base de données](./05_Database.md).

**Aucun test de bout en bout** n'a encore été mené sur ce module.

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
