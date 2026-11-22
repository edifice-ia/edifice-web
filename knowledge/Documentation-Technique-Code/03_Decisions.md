# Décisions

Statut : registre initial  
Dernière mise à jour : 2026-11-22

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

Note (2026-11-22) : avec la mise en pause de Personnel par [DEC-014](#dec-014---edifice-academy-devient-le-troisième-espace-et-la-priorité-de-développement--personnel-est-mis-en-pause), la condition de réouverture ci-dessus n'est plus atteignable tant que dure la pause. Elle est **suspendue, pas levée** : Academy ne rouvre aucune des trois absences, et n'introduit aucun mécanisme d'activation propre.

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

### DEC-011 - L'Assistant restera un moteur déterministe jusqu'à nouvel ordre — LLM prévu, pas construit maintenant

Date : 2026-08-04  
Statut : actif — **révisée le 2026-11-22 par [DEC-015](#dec-015---le-service-commun-ia-est-multi-fournisseurs-et-multi-modèles--révise-dec-011)** : l'Assistant reste déterministe et la consigne sur la cascade de mots-clés est maintenue ; le premier consommateur d'un LLM devient le Professeur IA d'Academy, par le service commun IA, et non plus les modules Personnel, en pause. Le texte ci-dessous est conservé tel qu'il a été écrit.

Contexte : l'audit du pôle Assistant, mené le 2026-08-04, a établi que **l'Assistant n'appelle aucun LLM**. Ni Anthropic, ni OpenAI, ni aucun autre — vérifié de trois façons : aucun SDK dans `package.json`, aucune URL d'API de modèle sur ce chemin, et les occurrences de « openai » dans le moteur de workflow sont des estimations de coût, pas des appels.

Ce que fait réellement `globalAssistant` (`lib/server/assistant/global-assistant.ts`, servi par `app/api/assistant/global/route.ts`) : `answerConversation` est une **cascade de correspondance de mots-clés** — `normalized.includes("memoire")`, `includes("module")`, `includes("brouillon")` — qui assemble des chaînes de caractères à partir d'un `ProjectContext` pré-calculé. Le choix entre les modes Conversation et Workflow repose lui aussi sur une liste de dix-neuf verbes d'action. Il n'existe ni prompt système, ni modèle, ni paramètre d'inférence, ni `tools`.

Deux conséquences observées au passage, qui font partie du constat : il n'existe **aucun historique de conversation** — le client garde un seul échange en mémoire React, chaque requête ne transmet que le message courant — et `buildProjectContext()` ne prend **aucun `userId`**, si bien que le contexte assemblé est entièrement projet, sans rien de Personnel ni de Trajectoire.

Décision : **un vrai LLM sera branché plus tard, pas maintenant.** C'est un chantier à part entière, pas une extension de l'existant : coût par appel à mesurer et à plafonner, gestion d'erreur et de latence, et surtout l'historique de conversation à construire de zéro — sans lui, un modèle branché aujourd'hui répondrait à chaque message comme au premier.

**Quand ce sera fait, l'intégration visera d'emblée tous les modules Personnel**, par un registre générique sur le modèle de `lib/personal/connectors/registry.ts`, et non le seul module Notes. L'audit a établi que le point d'entrée est déjà centralisé — `buildProjectContext()` est le seul endroit où le contexte s'assemble — donc le coût du générique n'y est pas significativement supérieur à celui du spécifique. C'est ce qui distingue ce cas de [DEC-010](#dec-010---aucun-rattachement-marqueprojet-tant-que-le-concept-nexiste-pas-en-code) : là-bas, différer évitait du scaffolding autour d'entités inexistantes ; ici les deux chemins convergent à coût comparable, et le seul arbitrage qui compte porte sur l'introduction du LLM lui-même.

Conséquences :

- **Ne pas étendre la cascade de mots-clés de `answerConversation`** pour y ajouter la lecture de Notes ou d'un autre module. Ce travail serait entièrement à refaire une fois le LLM branché, et il donnerait au passage l'illusion d'un assistant qui comprend, alors qu'il ne ferait que réciter une branche `if` de plus.
- L'effort disponible va donc **à la construction des autres modules Personnel** — stores et UI, sur le patron de Notes. Ce sont eux qui constitueront la base de lecture du futur LLM : sans donnée, un assistant intelligent n'a rien à lire.
- Tout audit ultérieur du pôle Assistant qui redécouvrirait l'absence de LLM doit lire cette entrée avant de la traiter comme un défaut : c'est un état connu et assumé, pas un oubli.
- Le champ optionnel `trajectoire` de `GlobalAssistantInput`, jamais fourni par aucun appelant, reste en l'état : il ne sert à rien aujourd'hui, et le câbler avant le LLM relèverait du même travail jetable.

Fichiers liés :

- `app/api/assistant/global/route.ts`, `lib/server/assistant/global-assistant.ts`
- `lib/server/assistant/build-project-context.ts`
- `knowledge/Documentation-Technique-Code/06_Modules.md` (section Assistant de L'Édifice)

### DEC-012 - La suppression physique de données Personnel passe par un chemin unique et journalisé

Date : 2026-08-13  
Révisée : 2026-08-16 — scindée, voir la note de révision en fin d'entrée  
Statut : actif

Contexte : les modules à saisie manuelle du pôle Personnel — Notes, Journal et Humeur, Habitudes, Tâches et, depuis le 2026-09-19, Objectifs — n'implémentent que la suppression **logique** : leurs tables n'accordent pas `DELETE` à `authenticated` et ne portent aucune policy `DELETE`. C'est délibéré et documenté, mais cela laissait le pôle sans aucun moyen d'effacer réellement quoi que ce soit — une lacune de souveraineté que la documentation stratégique rattache explicitement au module Réglages.

Décision : **un seul geste du dépôt supprime physiquement**, « Vider l'historique » dans Réglages > Personnel, et il obéit à quatre règles.

1. **Un module par geste, et par requête.** L'écran propose une ligne et un bouton nommé par module ; la route accepte `module`, jamais `modules`. Une requête ne peut décrire qu'un seul effacement, ce qui supprime par construction l'échec partiel entre modules — il n'a pas de représentation possible dans le contrat. La friction est ainsi proportionnelle à la destruction : vider trois modules demande trois gestes complets. Le mot de confirmation reste `SUPPRIMER`, générique et identique partout ; c'est le **nom du module, affiché sur les trois écrans** — sélection, confirmation, résultat —, qui désigne la cible, et non le mot tapé.
2. **Clé service-role, filtre `user_id` centralisé.** La service-role est le seul moyen de supprimer ces lignes, et elle contourne RLS : il n'existe aucun garde en base sur ce chemin. Le seul filtre d'isolation est le `.eq("user_id", …)` de `deleteOwnedRows`, fonction unique par laquelle passe toute suppression du store. Aucun `.delete()` direct ailleurs dans ce fichier.
3. **Liste blanche de tables, jamais un nom venu du client.** L'identifiant de module reçu est validé puis résolu en noms de tables côté serveur. `isErasableModuleId` est **dérivé de `ERASABLE_MODULES`** plutôt que réécrit à la main : une énumération parallèle divergerait tôt ou tard, et la divergence dangereuse est silencieuse — un module retiré de la liste affichée mais toujours accepté par le validateur resterait effaçable par appel direct à la route.
4. **Journal d'audit hors de portée de ce qu'il journalise.** `personal_data_erasure_log` ne porte aucune clé étrangère vers `auth.users` — une suppression de compte cascaderait et effacerait la preuve — et ne stocke aucun contenu supprimé, seulement des volumes. Une entrée est écrite **par table effectivement vidée, et non par module** : `table_name` est une colonne de cette table, et un module étendu sur plusieurs tables produit donc plusieurs entrées portant le même `module`. Une entrée unique par module ne pourrait porter qu'un seul volume, et tairait le plus gros — les réalisations d'Habitudes sont bien plus nombreuses que ses habitudes.

Conséquences :

- **Étendre le geste à un nouveau module se fait en un seul endroit**, `ERASABLE_MODULES` et `MODULE_TABLES`. Aucun écran n'est à modifier : la liste, les boutons et la confirmation se dérivent du module.
- **Vérifié en pratique le 2026-09-03** : brancher Tâches n'a demandé que deux ajouts, une entrée dans chacune de ces deux listes. Ni la route, ni le validateur, ni l'interface n'ont été touchés — `isErasableModuleId` est dérivé, et l'écran itère sur `ERASABLE_MODULES`.
- **Vérifié une seconde fois le 2026-09-19, avec Objectifs** : pour le geste « Vider l'historique », deux entrées de plus, une dans chaque liste, et rien d'autre — la route de réglages et l'écran n'ont pas bougé, et le compilateur refuse l'état intermédiaire, `MODULE_TABLES` étant typé `satisfies Record<ErasableModuleId, …>`. **Le geste par élément, lui, demande de son côté une route `/permanent` et un bouton dans la carte Archives par module** : ce n'est pas une exception à la règle, c'est ce que dit la dernière conséquence ci-dessous. Aucune migration n'a été nécessaire, les deux tables d'audit n'ayant pas de liste de valeurs autorisées pour `module`.
- **Vider plusieurs modules demande autant de gestes complets**, et c'est le prix assumé de la règle 1. Si un effacement groupé devient nécessaire, il devra être un geste distinct et explicitement nommé (« Vider tout le pôle Personnel »), avec sa propre confirmation — jamais un retour de la sélection multiple, qui rendait l'ampleur de la destruction dépendante de cases cochées plus haut dans l'écran.
- Le compte annoncé à l'écran reste exprimé dans l'unité que l'utilisateur reconnaît (une habitude, pas une ligne), mais **ce que ce compte n'inclut pas doit être nommé** à la confirmation et chiffré au résultat. Un total qui sous-estime silencieusement l'ampleur d'une suppression irréversible est le type d'écart de sincérité que ce dépôt traite en priorité.
- L'onglet Personnel masque le bandeau « réglages enregistrés, pas encore appliqués » et le récapitulatif de bas de page. Les afficher à côté d'une suppression définitive serait faux, et faux au pire endroit.
- **Ce geste n'est pas une suppression de compte** et ne couvre pas les autres pôles. La « suppression totale » de la vision stratégique reste absente, de même que l'export complet des données.
- La route porte le **garde par défaut de [DEC-007](#dec-007---toute-route-api-porte-un-garde-dauthentification-sauf-exception-documentée)** — `getCurrentUser()` **et** `canAccessPrivateCockpit`, ajouté le 2026-08-18. Elle ne posait que le premier à sa création, ce qui la laissait joignable par appel direct depuis un compte reviewer : le middleware bloque `/interface` pour ce rôle, mais pas `/api/personal`. C'est la seule route du dépôt à supprimer physiquement, et la seule du pôle à passer par la service-role, donc sans RLS pour rattraper un garde manquant.
- **Une seconde granularité existe depuis le 2026-08-18** : « Supprimer définitivement » un élément archivé, dans la carte Archives de chaque module. Elle réutilise le même store, la même clé service-role et le même principe de liste blanche, mais avec son propre journal d'audit (`personal_item_erasure_log`), sa propre route par module (`DELETE /[id]/permanent`) et une friction différente — confirmation binaire, l'archivage préalable tenant lieu de première barrière. La règle 1 ci-dessus vaut aussi pour elle : **un élément par requête**. La documentation stratégique la range en **sous-cas du troisième geste canonique**, pas en sixième geste.
- Le **traitement des tables dépendantes** ne relève pas de cette décision : il fait l'objet de [DEC-013](#dec-013---traitement-des-tables-dépendantes-lors-dun-effacement--suppression-explicite-actif), passée en `actif` le 2026-09-09.

Note de révision (2026-08-16), deux passes le même jour :

- **Scission.** Cette entrée avait été rédigée et actée en session autonome, sans validation humaine, et portait quatre règles présentées comme non négociables séparément. La troisième — la suppression explicite des tables dépendantes plutôt que la cascade — était un choix d'implémentation pris seul, généralisé en règle à partir d'un unique module. Elle en est retirée et devient DEC-013, au statut `proposé`.
- **Passage à un module par geste.** La règle 1 est **nouvelle**. Le flux d'origine partageait une seule saisie de `SUPPRIMER` entre tous les modules cochés : trois cases cochées et le mot tapé une fois vidaient les trois. Ce flux est abandonné. L'ancienne rédaction de cette entrée le décrivait comme acquis — elle est corrigée ici, et non conservée en note historique, la documentation devant décrire le code tel qu'il est.

Fichiers liés :

- `lib/personal/data-erasure.ts`, `lib/server/personal/data-erasure-store.ts`
- `app/api/personal/settings/erase/route.ts`, `app/interface/settings/SettingsPersonalPanel.tsx`
- `supabase/migrations/20260806200000_create_personal_data_erasure_log.sql`
- `knowledge/Documentation-Technique-Code/06_Modules.md` (section Paramètres, onglet Personnel)

### DEC-013 - Traitement des tables dépendantes lors d'un effacement : suppression explicite (actif)

Date : 2026-08-16  
Actée : 2026-09-09 — critère de sortie rempli, voir la note de bascule en fin d'entrée  
Statut : **actif**

Contexte : `erasePersonalModules` supprime les lignes des tables dépendantes d'un module **explicitement**, avant celles de sa table principale, au lieu de laisser la clé étrangère `on delete cascade` les emporter. Un seul module est concerné à ce jour : Habitudes, dont `personal_habit_completions` référence `personal_habits (id, user_id)` en cascade.

Argument en faveur de la suppression explicite : le module Habitudes a connu une migration **appliquée partiellement en base** (incident RLS du 2026-08-10, commit `cc281b2`). Si la contrainte de cascade manque en production, Postgres ne lève aucune erreur — les réalisations survivent simplement à leur habitude, en lignes orphelines qu'aucun écran ne montre plus, après un geste qui promettait de tout effacer. Supprimer explicitement ne coûte rien quand la cascade fonctionne, et rattrape le cas où elle manque.

Arguments contre, ou au moins non tranchés :

- **La généralisation repose sur un seul cas.** Un patron déduit d'un unique module n'est pas un patron ; c'est une observation. Rien ne dit encore que le prochain module à table dépendante aura la même forme — dépendance simple, `user_id` dénormalisé sur la dépendante, donc filtrable directement.
- **Le mécanisme dépend d'une propriété non universelle.** `deleteOwnedRows` filtre sur `user_id`. Cela ne fonctionne que si chaque table dépendante porte `user_id`. Une dépendante qui ne le porterait pas — cas normal en base relationnelle — ne serait pas supprimable par ce chemin, et demanderait soit une jointure, soit un retour à la cascade.
- **Le coût est un aller-retour réseau par table dépendante**, plus une entrée d'audit par table. Sur un module à plusieurs dépendantes, ce coût croît linéairement là où la cascade est un seul ordre.
- **La cause racine n'est pas traitée ici.** Le vrai problème est qu'une migration a pu être partiellement appliquée sans que rien ne le signale. Compenser cela dans le code applicatif de chaque suppression est un correctif de symptôme ; vérifier l'état des contraintes en base en serait un de la cause.

**Deuxième observation, qui ne satisfait pas le critère de sortie.** La suppression définitive d'un élément archivé (2026-08-18) applique le même patron : les réalisations d'une habitude sont supprimées explicitement avant l'habitude, et le filtre `user_id` y est répété en plus de `habit_id`. Cela conforte le choix sans le valider — c'est un deuxième **geste** sur le même module, pas un deuxième module. Satisfaire le critère à la lettre en le trahissant ferait passer cette décision en `actif` sur une base d'un seul cas réel. Elle **reste donc `proposé`**.

Un fait relevé au passage, en faveur du choix : le déplacement des données de test du 2026-08-18 a buté sur cette clé étrangère composite, faute d'`on update cascade`. La contrainte est donc bien réelle en base aujourd'hui — ce qui ne dit rien de sa présence demain, ni sur un autre environnement, et ne change pas le raisonnement.

Ce qui permettait de trancher : **un deuxième module effaçable doté d'une table dépendante.** Si son besoin était de même forme, le patron se généralisait. Si sa dépendante ne portait pas `user_id`, ou si elle avait plusieurs niveaux de dépendance, il aurait fallu soit un mécanisme générique, soit revenir à la cascade avec une vérification de contrainte au déploiement.

**Ce cas est arrivé le 2026-09-09 : les catégories de Journal.** `personal_journal_entry_categories` relie une entrée de journal à ses catégories, et c'est bien un deuxième MODULE, pas un deuxième geste sur Habitudes — la distinction que la note de 2026-08-18 refusait de forcer.

Sa forme a été comparée point par point au critère, et non supposée conforme :

- **elle porte `user_id`**, dénormalisé au-delà de ses deux clés étrangères. `deleteOwnedRows` peut donc la filtrer directement, sans jointure — la propriété dont l'universalité était précisément mise en doute ;
- **un seul niveau de dépendance.** Aucune table ne dépend d'elle ;
- **un `parentKey` unique suffit** pour la granularité par élément, `entry_id`. Sa seconde clé étrangère, `category_id`, pointe vers une table sœur et non vers un parent : elle ne participe pas à la chaîne d'effacement.

Une différence, qui ne remet pas le patron en cause : sa clé étrangère vers `personal_journal_categories` est en `restrict` et non en `cascade`, parce qu'elle porte une règle métier — bloquer la suppression d'une catégorie qui laisserait une entrée sans catégorie. La suppression explicite y devient donc **nécessaire et non plus seulement prudente** : sans elle, l'ordre de suppression buterait sur la contrainte au lieu de s'en passer.

Le patron se généralise sur deux modules de forme comparable. La décision passe en **`actif`**.

Conséquences :

- **Toute table dépendante déclarée dans `MODULE_TABLES` est supprimée explicitement, avant sa table principale.** C'est désormais la règle du dépôt pour les deux gestes de suppression physique du pôle, et elle peut être invoquée comme précédent.
- **Toute nouvelle table dépendante doit porter `user_id`**, dénormalisé s'il le faut. C'est ce qui rend le patron applicable sans jointure, et c'est la condition qui a été vérifiée pour l'admettre. Une dépendante qui ne pourrait pas la porter rouvrirait cette décision plutôt que de la contourner.
- La formule « ne jamais dépendre d'une contrainte pour la correction d'une suppression annoncée comme totale » **devient un principe du dépôt**, et non plus un simple argument de cette entrée.
- **Les arguments contre listés plus haut ne disparaissent pas.** Le coût d'un aller-retour et d'une entrée d'audit par table dépendante reste réel, et la cause racine — une migration partiellement appliquée sans signal — n'est toujours pas traitée. Le contrôle des contraintes en base reste une vérification `MANUAL_ACTIONS.md`, pas une garantie du code.
- Ce qui reste **hors** de cette décision : le sort des tables SŒURS. `personal_journal_categories` n'est pas une dépendante des entrées de journal — vider le Journal détruit les entrées et leurs liaisons, et laisse les catégories. Une étiquette définie par l'utilisateur n'est pas du contenu de journal. Si ce choix devait changer, ce serait une décision distincte, pas une extension de celle-ci.

Fichiers liés :

- `lib/server/personal/data-erasure-store.ts` (`MODULE_TABLES`, `erasePersonalModule`, `permanentlyDeletePersonalItem`)
- `supabase/migrations/20260806100000_create_personal_habits.sql` (la clé étrangère composite en cascade, premier cas)
- `supabase/migrations/20260909110000_create_personal_journal_entry_categories.sql` (second cas, qui a fait basculer le statut)
- `MANUAL_ACTIONS.md` (entrées du 2026-08-13 et du 2026-09-09, requêtes de contrôle de `confdeltype`)

### DEC-014 - EDIFICE ACADEMY devient le troisième espace et la priorité de développement ; Personnel est mis en pause

Date : 2026-11-22  
Statut : actif — arbitrage du porteur du projet. **Aucune ligne de code n'en découle encore** : voir « Ce que cette décision ne fait pas ».

Contexte : la documentation stratégique du 2026-08-01 fixait une règle de séquencement explicite, « finir le pôle Personnel avant tout le reste » ([02-strategie-produit.md](../Documentation-Strategique/Markdown/02-strategie-produit.md)), et ne connaissait que deux espaces, Contenu et Trajectoire ([10-architecture-systeme.md](../Documentation-Strategique/Markdown/10-architecture-systeme.md)). Le 2026-11-22, le porteur du projet arbitre en faveur d'un environnement d'apprentissage, EDIFICE ACADEMY, qui n'existe dans aucun document antérieur ni dans le code. Cette entrée trace l'arbitrage, ses conséquences sur les décisions existantes, et ce qui reste à trancher.

Décision, en cinq points :

1. **Academy est un espace, le troisième**, au sens de [10-architecture-systeme.md](../Documentation-Strategique/Markdown/10-architecture-systeme.md). Le test de décision de ce document le classe ainsi, et non comme module ni comme pôle : son contenu réel est fait d'instances que l'utilisateur crée et multiplie — des **programmes d'apprentissage** —, et la surface n'en est que le conteneur. Comme Trajectoire, il n'existe qu'un seul Academy dans la plateforme : c'est un **espace singleton**. Il est accessible directement depuis la navigation principale et porte **sa propre navigation intérieure** — tableau de bord pédagogique, calendrier, programmes, leçons et ressources, notes et fiches de révision, quiz, exercices et évaluations, révisions, progression et compétences, ressources pédagogiques, Professeur IA.
2. **Academy devient la priorité principale de développement.** La règle « finir le pôle Personnel avant tout le reste » est **suspendue, pas abrogée** : son texte d'origine est conservé et daté dans [02-strategie-produit.md](../Documentation-Strategique/Markdown/02-strategie-produit.md) et [30-trajectoire.md](../Documentation-Strategique/Markdown/30-trajectoire.md).
3. **Le pôle Personnel est mis en pause.** Ses cinq modules à saisie manuelle restent en service, dans l'état documenté dans [06_Modules.md](./06_Modules.md) ; aucun nouveau module n'y est construit tant que la pause dure. Le volet Vitals (chantier 1), déjà en pause, le reste. Les autres pôles et espaces sont inchangés.
4. **La hiérarchie pédagogique cible est un curriculum structuré**, décrit dans [22-espaces-et-marques.md](../Documentation-Strategique/Markdown/22-espaces-et-marques.md) : curriculum ou programme complet → matières ou domaines → modules → chapitres → cours et leçons → exercices et évaluations. Les **formations indépendantes** et les **parcours libres** restent possibles. Un programme n'est donc pas réduit à une liste de formations.
5. **Toute capacité IA d'Academy passe par le service commun IA**, multi-fournisseurs et multi-modèles, défini par [DEC-015](#dec-015---le-service-commun-ia-est-multi-fournisseurs-et-multi-modèles--révise-dec-011). Le Professeur IA en est un consommateur, jamais le porteur.

**Contradictions avec l'existant, signalées et non masquées** :

- **Règle de séquencement de [02-strategie-produit.md](../Documentation-Strategique/Markdown/02-strategie-produit.md).** Contredite frontalement ; c'est l'objet même de la décision. Le texte d'origine reste lisible, avec sa période de validité.
- **[DEC-009](#dec-009---trois-absences-structurelles-assumées-jusquà-lachèvement-du-pôle-personnel).** Sa condition de réouverture — l'achèvement de Personnel — n'est plus atteignable tant que dure la pause. Les trois absences (Finances, marques, couche de configuration) **ne sont pas rouvertes par Academy** et restent de la dette documentée. Conséquence directe : Academy n'aura **aucun mécanisme d'activation propre**. Il sera visible en permanence, comme toutes les surfaces actuelles, son entrée étant écrite dans les deux registres statiques. Un réglage d'activation propre à Academy serait le « mécanisme de configuration parallèle » que la troisième règle d'or interdit.
- **[DEC-011](#dec-011---lassistant-restera-un-moteur-déterministe-jusquà-nouvel-ordre--llm-prévu-pas-construit-maintenant).** Elle prévoyait le premier LLM pour l'Assistant et les modules Personnel. Le premier consommateur envisagé devient le Professeur IA. Révisée par DEC-015.
- **Moindre privilège sur Google Agenda.** L'accès stocké est en lecture seule (`calendar.readonly`, `lib/server/calendar/calendar-oauth.ts`). « Planifier » dans le calendrier d'Academy signifie donc écrire **dans les données d'Academy**, et seulement superposer les événements Google en lecture. Écrire dans Google exigerait un scope élargi et un nouveau consentement OAuth : décision distincte, non prise.
- **Notifications et bus d'événements.** Le catalogue en fait des services communs, mais aucun n'existe dans le code. Les rappels de séances et de révisions ne seront pas poussés tant que le service Notifications n'existe pas ; un module ne choisit jamais lui-même son canal d'envoi ([20-catalogue-services.md](../Documentation-Strategique/Markdown/20-catalogue-services.md)).
- **Suppression physique.** [DEC-012](#dec-012---la-suppression-physique-de-données-personnel-passe-par-un-chemin-unique-et-journalisé) et `ERASABLE_MODULES` sont propres au pôle Personnel, dans `lib/personal/` et l'onglet Personnel des Réglages. Les étendre à Academy modifierait Personnel, ce que la pause exclut. Le chemin de suppression d'Academy fera l'objet d'une décision distincte, avant l'étape qui l'implémente.
- **Vocabulaire.** « Module » désigne dans l'architecture un domaine de vie ([10-architecture-systeme.md](../Documentation-Strategique/Markdown/10-architecture-systeme.md)). Il désigne aussi, dans la hiérarchie pédagogique, un niveau d'un curriculum. Les deux sens ne doivent jamais se croiser dans le code : le niveau pédagogique y recevra un identifiant distinct (nom de travail : `unit`), le libellé « Module » restant celui de l'écran. Même précaution pour « Bibliothèque » : la Bibliothèque v1.0 a été reprise par Ressources (voir [06_Modules.md](./06_Modules.md)), d'où le nom de travail « ressources pédagogiques ».
- **Source de vérité unique.** Les notes, objectifs et ressources d'Academy recoupent par leur nom Notes, Objectifs et Ressources. Ce sont des entités **pédagogiques** — une fiche rattachée à une leçon, un objectif rattaché à un niveau de curriculum —, pas un second point d'écriture d'une note personnelle ni d'un objectif personnel.

**Entités envisagées — non définitives.** Aucune n'existe en base ni dans le code. Le modèle sera tranché, migration comprise, à l'étape qui le construit :

| Niveau ou fonction | Entité envisagée | Remarque |
|---|---|---|
| Instance de l'espace | `academy_programs` | `kind` ∈ `curriculum` (programme complet) / `formation` (formation indépendante). **Remplace `academy_courses`** de la proposition d'architecture : « cours » désigne un niveau de la hiérarchie, la collision serait permanente. |
| Matière ou domaine | `academy_subjects` | Facultatif ; absent d'une formation indépendante. |
| Module pédagogique | `academy_units` | Nom de travail, voir la collision de vocabulaire. |
| Chapitre | `academy_chapters` | — |
| Cours et leçon | `academy_lessons` | Couvre les deux libellés ; reprend l'entité de la proposition. |
| Exercice et évaluation | `academy_assessments` + `academy_questions` | Rattachés à un seul niveau de la hiérarchie : l'exercice à une leçon, l'évaluation à un chapitre, un module, une matière ou au programme. Reprend l'entité de la proposition, élargie. |
| Parcours libre | `academy_paths` + `academy_path_items` | Liste ordonnée de **références** vers des leçons ou évaluations de n'importe quel programme. Le parcours lit, il ne possède pas. Reprend l'entité de la proposition, précisée. |
| Objectifs pédagogiques | `academy_objectives` | Rattachés à un niveau de la hiérarchie. |
| Compétences | `academy_skills` + liaison | — |
| Tentatives | `academy_attempts` + réponses | — |
| Révisions | `academy_review_items` + `academy_review_logs` | Algorithme déterministe, sans IA. |
| Calendrier | `academy_sessions` | Cours, séances de travail, révisions, évaluations. |
| Notes et fiches | `academy_notes` | `kind` ∈ `note` / `fiche`. |
| Ressources pédagogiques | `academy_resources` | Lien, fichier dans Supabase Storage, ou texte. |
| Professeur IA | historique de conversation | Porté par le service commun IA ou par Academy : à trancher avec DEC-015. |

**Question ouverte, la plus structurante pour le modèle** : une table par niveau, chaque niveau intermédiaire pouvant être absent, ou une table d'arborescence unique portant un type de niveau. **Hypothèse retenue à ce stade : une table par niveau**, parce que [12-modele-de-donnees.md](../Documentation-Strategique/Markdown/12-modele-de-donnees.md) veut des relations explicites et que chaque niveau porte des attributs distincts. Hypothèse à confirmer avant toute migration.

Règles applicables à toutes ces tables, héritées du dépôt et non négociables : `user_id` sur chaque table, dépendantes comprises ([DEC-013](#dec-013---traitement-des-tables-dépendantes-lors-dun-effacement--suppression-explicite-actif)) ; `created_at`, `updated_at`, `deleted_at` (suppression logique par défaut) ; clés étrangères composites `(id, user_id)` entre tables Academy ; RLS par propriétaire ; `revoke all … from anon, authenticated` **avant** tout `grant`, leçon des chantiers 6 et 7 ; aucun `DELETE` accordé ; **aucun `projet_id` ni `marque_id`** ([DEC-010](#dec-010---aucun-rattachement-marqueprojet-tant-que-le-concept-nexiste-pas-en-code)) ; progression et niveau de compétence **calculés, jamais stockés**, sur le patron du module Objectifs.

Ce que cette décision ne fait pas :

- **elle ne lance pas le développement.** [02-strategie-produit.md](../Documentation-Strategique/Markdown/02-strategie-produit.md) maintient la seconde règle de séquencement : aucun nouveau chantier fonctionnel tant que l'audit de sécurité n'est pas clos. Au 2026-11-22, sa clôture **n'est pas établie** — voir le chantier 2 de `suivi-chantiers-edifice.md` et l'entrée `pending` du même jour dans `MANUAL_ACTIONS.md` ; *mise à jour du même jour : l'audit est déclaré **clos au 2026-11-22**, sous réserve de l'exception TikTok, par le porteur du projet — déclaration au chantier 2. Ce préalable est levé ; la validation explicite de l'étape 1 reste requise* ;
- elle ne crée aucune page, aucune route, aucune entrée de navigation, aucune migration, aucune table ;
- elle ne modifie ni Personnel, ni Contenu, ni Trajectoire.

Conséquences :

- l'étape 1 du chantier Academy (squelette de l'espace, sans base de données) attend la clôture établie de l'audit **et** une validation explicite du porteur du projet ;
- la priorité affichée dans `suivi-chantiers-edifice.md` devient le chantier 8, EDIFICE ACADEMY ;
- tout écran d'Academy affiche ce qui existe réellement : une capacité non construite est signalée comme telle, jamais simulée.

Note (2026-11-22) — **deux questions ouvertes de cette décision sont tranchées** par le porteur du projet. Le texte ci-dessus est conservé tel qu'il a été écrit.

1. **Hiérarchie pédagogique : une table par niveau.** L'hypothèse retenue plus haut devient la décision, et l'arborescence unique est écartée. Les niveaux structurels sont le curriculum, la matière, le module, le chapitre et la leçon, chacun avec sa table : `academy_programs`, `academy_subjects`, `academy_units`, `academy_chapters`, `academy_lessons`. Le tableau des entités envisagées est confirmé pour ces cinq niveaux ; les autres entités du tableau restent envisagées, non définitives.
   - `academy_programs` reste l'instance de l'espace et porte le curriculum ; la formation indépendante en est la variante `kind = formation`.
   - **Liens de parenté, tous obligatoires — décision du porteur du projet, précisée le 2026-11-22** : programme → matière, matière → module, module → chapitre, chapitre → leçon. **Une formation est composée de matières**, et chaque module appartient obligatoirement à une matière. « Les formations indépendantes commencent au niveau des modules » signifie qu'elles **sautent le niveau curriculum, pas le niveau matière**. Cette précision remplace la mention « Facultatif ; absent d'une formation indépendante » du tableau ci-dessus pour `academy_subjects`, qui reste lisible comme texte d'origine.
   - **Formations courtes sans matière : reportées.** Aucune décision à ce stade ; le modèle de l'étape 2 ne les prévoit pas.
   - *Une première version de cette note, du même jour (`10d1500`), déduisait l'inverse : un module rattaché directement à son programme, avec une matière facultative. Cette déduction n'avait pas été arbitrée ; elle est retirée.*
   - Les exercices et évaluations ne forment pas un niveau de la hiérarchie : `academy_assessments` se rattache à un niveau, comme indiqué dans le tableau.
2. **Suppression physique propre à Academy.**
   - **Suppression logique par défaut** (`deleted_at`), comme le reste du dépôt.
   - **Suppression physique sur le schéma de « Vider l'historique » de Personnel** ([DEC-012](#dec-012---la-suppression-physique-de-données-personnel-passe-par-un-chemin-unique-et-journalisé), [DEC-013](#dec-013---traitement-des-tables-dépendantes-lors-dun-effacement--suppression-explicite-actif)) : un chemin unique, une confirmation explicite, une liste blanche de tables résolue côté serveur, un filtre `user_id` centralisé dans une seule fonction de suppression, et une suppression explicite des tables dépendantes avant leur table principale.
   - **Journal d'effacement dédié à Academy**, distinct de `personal_data_erasure_log` et `personal_item_erasure_log` : sans clé étrangère vers `auth.users`, sans contenu supprimé, une entrée par table vidée.
   - **Ce n'est pas une extension de DEC-012**, qui reste propre au pôle Personnel. Personnel, `ERASABLE_MODULES` et l'onglet Personnel des Réglages ne sont pas modifiés : Academy reprend le schéma, il n'en réutilise pas le code.
   - Restent à fixer à l'étape 8, sans être des questions de principe : l'emplacement de l'écran, et la granularité de l'effacement — par programme, par type de contenu, ou pour tout Academy.

La troisième question ouverte — l'historique du Professeur IA — relève de [DEC-015](#dec-015---le-service-commun-ia-est-multi-fournisseurs-et-multi-modèles--révise-dec-011), où elle est tranchée.

Fichiers liés :

- `knowledge/Documentation-Strategique/Markdown/02-strategie-produit.md`, `10-architecture-systeme.md`, `22-espaces-et-marques.md`, `30-trajectoire.md`, `90-glossaire.md`
- `knowledge/Documentation-Technique-Code/05_Database.md`, `06_Modules.md`
- `suivi-chantiers-edifice.md` (chantier 8)

### DEC-015 - Le service commun IA est multi-fournisseurs et multi-modèles — révise DEC-011

Date : 2026-11-22  
Statut : actif — orientation d'architecture. **Aucun fournisseur n'est branché, aucune clé n'est créée.**

Contexte : [DEC-011](#dec-011---lassistant-restera-un-moteur-déterministe-jusquà-nouvel-ordre--llm-prévu-pas-construit-maintenant) constate qu'aucun LLM n'est appelé dans le dépôt et reporte leur introduction. [20-catalogue-services.md](../Documentation-Strategique/Markdown/20-catalogue-services.md) fait de l'IA un service commun unique, « un cerveau, plusieurs portées », et [14-integrations.md](../Documentation-Strategique/Markdown/14-integrations.md) cite Anthropic (Claude) comme moteur principal et OpenAI comme capacité complémentaire, « pour éviter une dépendance unique ». [DEC-014](#dec-014---edifice-academy-devient-le-troisième-espace-et-la-priorité-de-développement--personnel-est-mis-en-pause) introduit un consommateur concret, le Professeur IA. Rien ne disait encore **comment** le service serait construit, ni comment éviter qu'une première intégration l'enferme dans un fournisseur.

Décision :

1. **Un seul point d'accès aux modèles pour toute la plateforme**, côté serveur. Aucun pôle, espace ou module n'importe un SDK de fournisseur, ne lit une clé de fournisseur, ni ne construit une requête propre à un fournisseur. Academy, l'Assistant et tout consommateur futur appellent le service en nommant un **usage** — par exemple « professeur », « assistant » ou « génération de quiz » —, jamais un modèle.
2. **Des adaptateurs par fournisseur, derrière un contrat neutre.** Les types propres à un fournisseur — format des messages, des outils, des erreurs, de l'usage en tokens — ne sortent pas de son adaptateur. Claude peut être le premier fournisseur branché ; il ne devient **pas une dépendance structurelle** : retirer son adaptateur ne doit casser que les usages qui lui sont routés, et ceux-ci doivent pouvoir être reroutés vers un autre fournisseur sans toucher au code consommateur.
3. **Routage par usage, centralisé.** Le choix du fournisseur et du modèle pour un usage, ses limites (plafond de coût, de tokens, de fréquence) et ses paramètres vivent au même endroit. Tant que la couche de configuration unique n'existe pas ([DEC-009](#dec-009---trois-absences-structurelles-assumées-jusquà-lachèvement-du-pôle-personnel), point 3), ce routage est un **registre statique côté serveur**, sur le modèle de `lib/personal/connectors/registry.ts` — et **pas** un écran de réglages : un réglage propre au service IA serait un mécanisme de configuration parallèle, que la troisième règle d'or interdit. Le registre a vocation à être repris par la couche de configuration le jour où elle existera.
4. **Coûts, limites et traçabilité centralisés.** Chaque appel est enregistré dans `cost_events` via `recordCostEvent` (`lib/server/cost-tracking.ts`), donc visible dans l'Observatoire, et journalisé avec son usage, son fournisseur et son modèle. Un usage qui dépasse son plafond est refusé par le service, pas par le consommateur. Les clés vivent exclusivement dans des variables d'environnement, une par fournisseur ([13-securite-gouvernance.md](../Documentation-Strategique/Markdown/13-securite-gouvernance.md)).
5. **Point de validation humaine défini par usage, avant livraison** ([01-principes.md](../Documentation-Strategique/Markdown/01-principes.md), « L'IA augmente, elle ne remplace pas »). Pour le Professeur IA : il explique, propose une fiche, un quiz ou une planification ; **rien de ce qu'il propose n'est enregistré dans Academy sans confirmation explicite**.

Ce que DEC-015 change à DEC-011 :

- DEC-011 reste valable pour l'Assistant : il **reste déterministe** tant que son propre chantier n'est pas ouvert, et la consigne de **ne pas étendre la cascade de mots-clés** est maintenue ;
- le jour où l'Assistant passera à un LLM, il utilisera ce service commun, pas un moteur propre ;
- le premier consommateur envisagé devient le Professeur IA d'Academy, et non plus les modules Personnel, en pause ([DEC-014](#dec-014---edifice-academy-devient-le-troisième-espace-et-la-priorité-de-développement--personnel-est-mis-en-pause)) ;
- les points que DEC-011 posait comme préalables restent entiers : coût à mesurer et plafonner, gestion d'erreur et de latence, **historique de conversation à construire de zéro**.

Ce que cette décision ne fait pas : aucun SDK ajouté à `package.json`, aucune variable d'environnement créée, aucun fichier sous `lib/server/` ; le chemin du service n'est pas fixé. Le premier branchement réel est une étape distincte du chantier Academy. Il demandera une action manuelle — création de la clé et de la variable d'environnement dans Vercel —, et une revue de sécurité, puisqu'il manipule un secret.

**Question ouverte** : l'historique des conversations — table du service commun, portée par usage, ou table propre à Academy. À trancher avant l'étape du Professeur IA.

Note (2026-11-22) — **usage « création d'un cours à partir d'un sujet demandé »**, inscrit à l'étape 7 du chantier Academy (`suivi-chantiers-edifice.md`, chantier 8). Arbitrages du porteur du projet, qui appliquent directement les points 4 et 5 ci-dessus :

- **point de validation humaine** (point 5) : l'IA produit un brouillon de cours proposé ; **rien n'est enregistré en base sans validation explicite** de l'utilisateur ;
- **sources** : recherche sur le web, avec **comparaison de plusieurs sources** avant de retenir une information. Chaque affirmation du brouillon est rattachée à ses sources, consultables lors de la validation. La recherche web est une capacité du service commun, pas d'Academy : son fournisseur sera routé comme les modèles, et son choix est une intégration tierce à documenter ;
- **coûts et limites** (point 4) : reportés à la création de la fonctionnalité. Le principe de centralisation s'applique ; **aucun plafond chiffré** n'est fixé à ce stade.

Cette note ne crée pas de décision nouvelle : elle précise un usage de DEC-015. Aucun code, aucune route, aucune table.

Note (2026-11-22) — **la question ouverte sur l'historique des conversations est tranchée** par le porteur du projet :

- **l'historique du Professeur IA est stocké dans le service commun IA**, avec les appels, les coûts et les limites qu'il centralise déjà (points 3 et 4). Il n'y a pas de table d'historique propre à Academy ;
- **il est séparé de l'historique de l'Assistant** : aucun mélange entre les deux. Chaque conversation appartient à un seul usage. Le Professeur IA ne lit jamais l'historique de l'Assistant, et l'Assistant ne lit jamais celui du Professeur IA ;
- règles héritées du dépôt pour la future table : `user_id` sur chaque ligne et RLS par propriétaire ([12-modele-de-donnees.md](../Documentation-Strategique/Markdown/12-modele-de-donnees.md), [13-securite-gouvernance.md](../Documentation-Strategique/Markdown/13-securite-gouvernance.md)).

Ce que la note ne fixe pas : la forme de la séparation — une colonne d'usage filtrée systématiquement, ou des tables distinctes —, à trancher à l'étape 7 avec le schéma du service. **Le contenu d'une conversation n'est pas une donnée Academy** au sens des gestes de suppression de DEC-014 : son effacement relèvera du service commun.

Fichiers liés :

- `knowledge/Documentation-Strategique/Markdown/20-catalogue-services.md` (section IA)
- `lib/server/cost-tracking.ts` (existant, à réutiliser)
- `lib/personal/connectors/registry.ts` (patron de registre statique)

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
