# Décisions

Statut : registre initial  
Dernière mise à jour : 2026-07-08

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
