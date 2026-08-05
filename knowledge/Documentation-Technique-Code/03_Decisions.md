# Décisions

Statut : registre initial  
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Format des décisions](#format-des-décisions)
- [Décisions actives](#décisions-actives)
- [Décisions à confirmer](#décisions-à-confirmer)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce registre documente les choix structurants. Il doit éviter que les décisions restent seulement dans une conversation avec un assistant ou dans l'historique Git.

## Format des décisions

Chaque décision future devrait suivre ce format :

```text
ID :
Date :
Statut :
Contexte :
Décision :
Conséquences :
Fichiers liés :
```

## Décisions actives

### DEC-001 - `/knowledge` devient la source de vérité documentaire

Date : 2026-07-07  
Statut : actif

Contexte : le projet doit être compréhensible par plusieurs IA et par des humains sans dépendre d'un modèle précis.

Décision : la documentation durable vit dans `/knowledge`. Les anciens documents dans `/docs` peuvent rester des notes opérationnelles, mais les synthèses canoniques doivent être reportées ici.

Conséquences :

- chaque changement structurant doit mettre à jour au moins un fichier de `/knowledge` ;
- les prompts et workflows doivent être documentés ;
- les décisions importantes doivent être inscrites dans ce registre.

### DEC-002 - Le moteur de workflow assistant est canonique

Date : 2026-07-07  
Statut : actif

Contexte : plusieurs routes et interfaces peuvent déclencher ou préparer des actions assistant.

Décision : `lib/server/assistant-workflows/engine.ts` est le point de référence pour les workflows assistant génériques.

Conséquences :

- les nouvelles actions doivent passer par le modèle de workflow ;
- les actions sensibles restent confirmées explicitement ;
- les endpoints historiques doivent être traités comme compatibilité lorsqu'un moteur canonique existe.

### DEC-003 - Les publications réelles restent sous validation humaine

Date : 2026-07-07  
Statut : actif

Contexte : le projet manipule des canaux externes et peut déclencher des publications publiques.

Décision : aucune publication réelle ni programmation définitive ne doit être automatisée sans validation humaine explicite.

Conséquences :

- les workflows peuvent préparer, analyser et proposer ;
- la sauvegarde finale ou publication doit rester auditée ;
- les UI doivent rendre les actions sensibles visibles.

### DEC-004 - Supabase est le système de persistance principal

Date : 2026-07-07  
Statut : actif

Contexte : les migrations du dépôt définissent les tables métier et les états opérationnels.

Décision : Supabase Database et Storage portent les brouillons, assets, mémoire, OAuth, coûts, scheduling, publications et métriques.

Conséquences :

- tout changement de schéma doit être migré dans `supabase/migrations` ;
- la documentation de base de données doit être mise à jour ;
- les secrets Supabase restent côté serveur.

### DEC-005 - Le module Personnel centralise les connecteurs de données externes

Date : 2026-07-08  
Statut : actif

Contexte : `app/interface/personnel` et `lib/personal/connectors` existaient déjà en code sans être documentés. Garmin est le premier connecteur réellement développé ; Strava, Notion et Finance sont déclarés comme stubs pour usage futur.

Décision : le module Personnel (Espace intérieur) est l'emplacement canonique pour tout connecteur de données personnelles externes. Son architecture (`PersonalConnector`, `registry.ts`, `sync.ts`) reste ouverte à l'ajout de nouveaux connecteurs sans réécriture. Le style UI de `PersonalDashboardClient.tsx` reste volontairement distinct de `components/cockpit` et n'a pas vocation à être harmonisé. Le croisement avec Trajectoire se fait en lecture seule : le module Personnel peut lire l'état de Trajectoire pour prioriser, mais ne modifie jamais `trajectoire_actions` directement.

Conséquences :

- tout nouveau connecteur (Strava, Notion, Finance...) suit le patron `PersonalConnector` existant ;
- aucune migration UI vers les composants cockpit partagés n'est attendue pour ce module ;
- les écritures vers Trajectoire depuis Personnel passent par des propositions, jamais des mutations directes.

### DEC-006 - Accès Garmin via l'API officielle OAuth2 PKCE uniquement

Date : 2026-07-08  
Statut : actif, candidature en cours

Contexte : Garmin ne propose pas d'auto-inscription développeur immédiate ; l'accès à Garmin Connect / Health API nécessite une validation manuelle du Garmin Developer Program. Le statut de cette candidature n'est pas confirmé au moment de cette décision.

Décision : l'intégration Garmin utilise exclusivement le flow OAuth2 + PKCE officiel une fois l'accès approuvé. Aucun fallback non officiel (scraping, bibliothèque tierce non authentifiée, endpoints non documentés) n'est utilisé, y compris temporairement. Tant que l'approbation n'est pas confirmée manuellement, le connecteur reste `isEnabled: false` et le développement se fait contre une fixture JSON mockée reproduisant la structure attendue de l'API.

Conséquences :

- le code d'échange de token OAuth2/PKCE pour Garmin peut être écrit et testé avant l'approbation, mais ne doit jamais être activé automatiquement ;
- l'activation réelle (`isEnabled: true`) est une action manuelle explicite, pas un déploiement de code ;
- si la candidature est refusée, cette décision doit être révisée avant tout contournement.

### DEC-007 - Toute route API porte un garde d'authentification, sauf exception documentée

Date : 2026-07-28  
Statut : actif

Contexte : l'audit de sécurité de juillet 2026 a trouvé des routes de diagnostic et de statut accessibles sans authentification, dont certaines lisaient un token OAuth stocké pour interroger une API tierce (`/api/oauth/youtube/status`, `/api/oauth/calendar/status`). Aucune n'était sensible par son nom ; toutes l'étaient par ce qu'elles renvoyaient. Le middleware (`proxy.ts`) ne protège pas les routes API : il ne redirige les visiteurs anonymes que sur les chemins de la liste reviewer.

Décision : toute route sous `app/api` porte un garde explicite dans son handler. Le garde par défaut est `getCurrentUser()` + `canAccessPrivateCockpit(user)` renvoyant `403`. Deux exceptions seulement, et elles doivent rester justifiées dans le fichier concerné :

- une route publique par nature qui ne révèle rien (`/api/health`, qui renvoie `{ ok: true }`) ;
- une route appelée par un tiers, qui valide alors un secret entrant à temps constant plutôt qu'une session (`/api/webhooks/calendar`, qui compare `x-goog-channel-token` au token du canal enregistré).

`/api/oauth/tiktok/status` est un cas particulier assumé : garde sur la session seule, sans `canAccessPrivateCockpit`, parce que le compte reviewer TikTok doit pouvoir la lire pendant la review et que `canAccessPrivateCockpit` est faux pour le rôle reviewer. La raison est écrite dans le fichier pour qu'un durcissement ultérieur ne casse pas la review.

**Réévaluation du 2026-08-01 — exception maintenue, portée mesurée.** Le libellé « cas particulier » ci-dessus pouvait se relire comme « route non gardée ». Ce n'en est pas une :

- **aucun accès anonyme n'existe** : sans session, la route répond `403`, et le middleware redirige déjà vers `/login`. Le compromis porte uniquement sur le filtre de rôle ;
- `canAccessPrivateCockpit(user)` vaut `getUserRole(user) !== "reviewer"` : l'écart entre ce garde et le garde strict est **exactement un rôle**, celui de `reviewer@edificeia.com`, compte créé et contrôlé par le projet ;
- la réponse ne contient ni token, ni identifiant de compte, ni scope — `{ present, storageEnabled, storageMode, expiresAt, updatedAt }`. C'est strictement moins que ce que le flux OAuth et l'upload sandbox accordent déjà au même compte.

Deux durcissements ont été examinés puis écartés, non par principe mais parce qu'ils cassaient la review qu'ils étaient censés sécuriser. Ajouter `canAccessPrivateCockpit` ferait répondre `403` au reviewer sur la page `/tiktok-sandbox-test`, qui rend `<TikTokConnectionControls />` et dont c'est la fonction annoncée. Réduire la charge utile à `present` seul viderait les trois autres champs que cette même page affiche, pendant qu'elle est examinée.

Ce que la réévaluation a réellement trouvé de défectueux n'est pas le garde, mais l'**absence de condition de sortie** : rien dans le dépôt n'indique où en est la review — aucun ticket, aucune date de soumission, aucun statut, ni dans le code, ni dans `knowledge/`, ni dans l'historique git. Une exception de sécurité sans date d'expiration survit à sa raison d'être. Une entrée `pending` de [`MANUAL_ACTIONS.md`](../../MANUAL_ACTIONS.md) porte désormais la vérification, l'état de la review n'étant lisible que dans le portail développeur TikTok.

Point connexe relevé au passage, **non corrigé** : `getOAuthTokenStatus("tiktok")` est appelée sans `userId`, donc renvoie la première ligne `oauth_tokens` du provider, celle du propriétaire, quel que soit l'appelant. Ce n'est pas propre à TikTok — `youtube/status` et `calendar/status` font de même. C'est la conséquence assumée d'un cockpit mono-utilisateur, à revoir le jour où plusieurs comptes réels coexisteront, pas dans le cadre de cette route.

Conséquences :

- ajouter une route API sans garde est un défaut, même si la route « ne fait que lire un statut » ;
- une route qui lit un token OAuth stocké est sensible quel que soit ce qu'elle en fait, y compris si elle ne teste que sa présence ;
- le garde est vérifié dans le handler, jamais délégué au middleware.

Fichiers liés :

- `src/lib/auth/guards.ts`, `src/lib/auth/roles.ts`
- `src/lib/supabase/proxy.ts`
- `/knowledge/10_Conventions.md`

### DEC-008 - Le renommage de route `/interface/settings` vers `/interface/reglages` est reporté

Date : 2026-08-01  
Statut : actif (décision de report)

Contexte : la documentation stratégique du 2026-08-01 nomme la surface « Réglages » — voir [10-architecture-systeme.md](../Documentation-Strategique/Markdown/10-architecture-systeme.md), qui la classe hors taxonomie pôle/espace avec Ressources. Le libellé affiché et le titre de page disent déjà « Reglages », mais la route est restée `/interface/settings`. Un alias français partiel existait : `app/interface/reglages/connexions/page.tsx` ré-exportait `settings/connections`, si bien que `/interface/reglages/connexions` répondait alors que `/interface/reglages` seul renvoyait 404.

Cet alias n'était pas décoratif : les callbacks OAuth YouTube et Meta y renvoyaient en dur après autorisation, alors que tous les autres providers et tous les liens d'interface utilisaient `/interface/settings/connections`, via `OAUTH_CONNECTIONS_RETURN_PATH` (`lib/server/oauth/oauth-redirects.ts`). Deux chemins de retour coexistaient donc pour la même page.

Décision : ne pas renommer la route maintenant. Supprimer l'alias partiel, et faire converger les deux callbacks sur la constante partagée. Le renommage complet `/interface/settings` → `/interface/reglages` reste à faire, comme chantier distinct.

Raison du report : un renommage de route touche les liens internes, les chemins de retour OAuth (donc la configuration des consoles tierces si le chemin y est déclaré), et les URL déjà connues de l'utilisateur. Le faire à l'occasion d'un alignement de libellés mélangerait un changement cosmétique et un changement d'URL en production.

Conséquences :

- `/interface/reglages/connexions` ne répond plus ; la route de référence est `/interface/settings/connections` ;
- les callbacks YouTube et Meta lisent désormais `OAUTH_CONNECTIONS_RETURN_PATH`, donc `OAUTH_CONNECTIONS_RETURN_PATH` suffit à déplacer le point de retour de tous les providers d'un coup, ce qui est précisément ce que le renommage futur utilisera ;
- tant que le renommage n'est pas fait, la route et le libellé divergent — divergence connue, pas un oubli.

Fichiers liés :

- `app/interface/settings/page.tsx`, `app/interface/settings/connections/page.tsx`
- `app/api/oauth/youtube/callback/route.ts`, `app/api/oauth/meta/callback/route.ts`
- `lib/server/oauth/oauth-redirects.ts`
- `lib/cockpit/navigation.ts`

### DEC-009 - Trois absences structurelles assumées jusqu'à l'achèvement du pôle Personnel

Date : 2026-08-01  
Statut : actif (dette documentée)

Contexte : la refonte stratégique du 2026-08-01 décrit une cible que le code n'atteint pas sur trois points structurants. Les inscrire ici évite qu'ils soient redécouverts comme des bugs, ou comblés dans le désordre. [02-strategie-produit.md](../Documentation-Strategique/Markdown/02-strategie-produit.md) fixe l'ordre : le logiciel idéal pour un usage réel d'abord, la généralisation ensuite.

Décision : documenter ces trois absences comme dette connue et **ne pas les combler tant que le pôle Personnel n'est pas terminé**. Ce ne sont pas des oublis.

**1. Le pôle Finances n'existe pas.** Aucune occurrence de « Finances » dans `app/`, `components/`, `lib/`, `types/`. Ni route, ni composant, ni table. Prévu par [21-poles.md](../Documentation-Strategique/Markdown/21-poles.md), qui précise aussi que le nom est « Finances », jamais « Business » — ce dernier terme est abandonné et ne renaît pas sous forme de pôle. Le code ne contient d'ailleurs aucun module Business : les occurrences de « business » y relèvent toutes du vocabulaire Meta (`business_management`, `business.facebook.com`).

**2. La notion de marque n'existe pas.** L'espace Contenu de [22-espaces-et-marques.md](../Documentation-Strategique/Markdown/22-espaces-et-marques.md) est un conteneur de N marques, chacune avec présence et contenu, acquisition, conversion et relation, infrastructure de marque. Le code a un atelier de contenu unique, organisé par outil (Shorts, Pinterest) et non par marque. Ce même document qualifie explicitement la cible de vision, pas de chantier court terme.

**3. La couche de configuration unique n'existe pas.** Troisième règle d'or de [01-principes.md](../Documentation-Strategique/Markdown/01-principes.md). Le code utilise deux registres statiques codés en dur, `cockpitNavigation` (`lib/cockpit/navigation.ts`) et `cockpitModules` (`lib/cockpit/modules.ts`), dont les identifiants divergent pour une même surface — `assistant` / `assistant-edifice`, `post-creation` / `content-workshop`, `monitoring` / `monitoring-static`, `personnel` / `personnel-light`, `links` / `links-useful` ; seul `trajectory` coïncide. Aucun mécanisme d'activation piloté par une préférence utilisateur, et aucune table `ACTIVATION_MODULE` en base, alors que [12-modele-de-donnees.md](../Documentation-Strategique/Markdown/12-modele-de-donnees.md) la place dans le graphe.

Portée attendue de cette couche, à ne pas sous-dimensionner le jour où elle sera construite : elle ne couvre pas seulement les modules de domaine de vie (sommeil, sport, tâches…), mais aussi **les pôles eux-mêmes, les espaces (Contenu, Trajectoire), et chaque instance individuellement** — une marque précise, un projet précis — pas seulement leur catégorie. C'est la conséquence directe de « aucune fonctionnalité, aucun module, aucun service commun n'est indispensable » ([01-principes.md](../Documentation-Strategique/Markdown/01-principes.md)).

Le geste qui doit s'appliquer à toutes ces granularités est **Désactiver**, tel que défini par [11-modularite-configuration.md](../Documentation-Strategique/Markdown/11-modularite-configuration.md), qui garantit par construction que désactiver ne supprime jamais l'historique — et non « Supprimer l'historique d'un module », qui est un geste distinct.

Conséquences :

- ces trois points ne sont pas des défauts à corriger dans l'immédiat ; les rouvrir demande de constater d'abord que Personnel est terminé ;
- toute implémentation partielle de la couche de configuration qui ne viserait que les modules serait un sous-dimensionnement, à refaire ensuite ;
- les surfaces que la cible rend invisibles restent visibles en attendant — voir la divergence assumée notée dans [06_Modules.md](./06_Modules.md).

Fichiers liés :

- `lib/cockpit/navigation.ts`, `lib/cockpit/modules.ts`
- `supabase/migrations` (aucune migration `activation_module`)

### DEC-010 - Aucun rattachement Marque/Projet tant que le concept n'existe pas en code

Date : 2026-08-04  
Statut : actif

Contexte : [23-modules.md](../Documentation-Strategique/Markdown/23-modules.md) prévoit qu'une donnée de module puisse se rattacher à une Marque ou un Projet — explicitement pour Notes, et par le biais de l'entité Action de Trajectoire pour Tâches. Or la notion de marque n'existe nulle part dans le code : ni table, ni type, ni surface (voir `DEC-009`, point 2). La question s'est posée deux fois le même jour, en construisant Notes et en cadrant Tâches.

Décision : **ne rien construire autour de ce rattachement tant que Marque et Projet n'existent pas comme entités réelles.** Concrètement, pas de colonne `marque_id` ou `projet_id` nullable ajoutée « en prévision », pas de table de liaison vide, pas de champ inerte dans l'interface.

Raison : une colonne nullable ajoutée par anticipation reste vide indéfiniment, mais elle apparaît dans le schéma, dans les types et dans les revues, où elle se lit comme une capacité existante. C'est le même motif que les 18 préférences de `user_preferences` enregistrées et jamais relues, ou que le badge YouTube codé en dur — du scaffolding qui ment sur l'état réel du produit. Une absence est visible ; un champ vide qui prétend au rattachement ne l'est pas.

Ce que la décision **ne** coûte pas : [12-modele-de-donnees.md](../Documentation-Strategique/Markdown/12-modele-de-donnees.md) modélise ce rattachement par une **table de liaison** (« Rattachement contexte »), pas par une colonne portée par la donnée. Le jour où Marque et Projet existeront, la liaison s'ajoutera sans toucher à `personal_notes` ni à la table des tâches. Différer ne crée donc aucune dette de migration.

Conséquences :

- `personal_notes` n'a ni `marque_id` ni `projet_id`, et c'est intentionnel ;
- Tâches, quand il sera construit, suit la même règle ;
- rouvrir cette décision suppose d'abord que Marque et Projet existent, ce que `DEC-009` conditionne à l'achèvement du pôle Personnel ;
- tout module de domaine de vie construit d'ici là applique la même règle par défaut.

Fichiers liés :

- `supabase/migrations/20260804100000_create_personal_notes.sql`
- `knowledge/Documentation-Technique-Code/06_Modules.md` (sections Notes et Personnel)

## Décisions à confirmer

- Politique de rétention des assets et rendus vidéo.
- Stratégie de persistance des workflows assistant.
- Niveau de séparation entre projet personnel, contenu éditorial et cockpit système.
- Convention définitive de nommage des statuts métier.

## Liens utiles

- [Architecture](./01_Architecture.md)
- [Base de données](./05_Database.md)
- [Agents](./07_Agents.md)
- [Workflows](./08_Workflows.md)

## À mettre à jour

- Ajouter les décisions historiques non encore formalisées.
- Ajouter les liens vers commits, PR ou migrations lorsque disponibles.
- Marquer les décisions remplacées ou obsolètes.
