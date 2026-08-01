# Intégrations

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Chaque intégration est un service commun](#chaque-intégration-est-un-service-commun)
- [Santé et sport](#santé-et-sport)
- [Productivité](#productivité)
- [Développement et infrastructure](#développement-et-infrastructure)
- [Intelligence artificielle](#intelligence-artificielle)
- [Finances](#finances)
- [Notifications](#notifications)
- [Réseaux sociaux](#réseaux-sociaux)
- [Météo](#météo)
- [Autres](#autres)
- [Récapitulatif par priorité](#récapitulatif-par-priorité)
- [État réel des chantiers en cours](#état-réel-des-chantiers-en-cours)

## Rôle du document

Ce document catalogue les intégrations tierces de L'Édifice selon un format uniforme : objectif, données récupérées, données envoyées, valeur apportée, priorité. La priorité suit quatre niveaux — Critique, Élevée, Moyenne, Différée.

## Chaque intégration est un service commun

Aucune intégration listée ici n'appartient à un pôle ou à un espace en particulier — voir la définition du service commun dans [10-architecture-systeme.md](./10-architecture-systeme.md). Garmin n'appartient pas au pôle Personnel : Personnel le consomme pour construire son tableau d'énergie, au même titre que l'Assistant peut le consommer pour préparer un brief, ou que l'Observatoire peut le consommer pour signaler une anomalie de synchronisation. Une intégration se branche une fois et sert autant de surfaces que la configuration le permet.

## Santé et sport

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Garmin | Métriques de forme quotidiennes | Sommeil, Body Battery, VFC, FC repos, stress, charge | — (lecture seule) | Base du brief énergie | Critique |
| Health Auto Export | Alternative webhook à Garmin | Sommeil, FC, activité, via Apple Health | — | Débloque le brief énergie sans Garmin | Critique |
| Strava | Détail des séances cardio | Séances, distance, allure, dénivelé | — | Complète Garmin sur l'entraînement | Moyenne |
| Runna | Suivi d'un plan de course | Plan, séances prévues, progression | — | Croise objectif de course et récupération | Moyenne |
| Hevy | Suivi musculation | Séances, charges, répétitions | — | Complète le tableau d'entraînement | Différée |

## Productivité

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Google Calendar | Agenda unifié perso et pro | Événements, disponibilités | Création et modification d'événements | Base du brief quotidien | Critique |
| Gmail | Détection des actions à traiter | Messages pertinents | — | Réduit le tri manuel | Moyenne |
| Google Drive | Rattacher des documents externes | Métadonnées, liens | — | Évite un stockage dupliqué | Différée |
| Google Docs | Lire ou générer du contenu long | Contenu de document | Création, mise à jour | Utile pour Contenu et Trajectoire | Différée |
| Google Contacts | Rattacher des contacts réels | Coordonnées | — | Évite une resaisie | Différée |
| Google Tasks | Unifier des tâches externes | Tâches, échéances | Création, mise à jour | Évite un doublon d'outil | Différée |
| Outlook | Équivalent Microsoft pour un usage pro | Événements, messages | Création d'événements | Nécessaire pour un usage pro élargi | Différée |

## Développement et infrastructure

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| GitHub | Suivi du code depuis Observatoire | Commits, pull requests, issues | — | Avancement technique visible sans changer d'outil | Élevée |
| Supabase | Persistance principale de la plateforme | État de santé, métriques | Toute écriture applicative | Fondation de la donnée | Critique |
| Vercel | Hébergement du frontend et du backend | État des déploiements, logs | — | Infrastructure d'exécution | Critique |
| Cloudflare | DNS de la plateforme | État DNS | — | Fondation réseau | Élevée |
| Railway | Rendu vidéo du Contenu, exclusivement | — | Manifests vidéo, reçoit le rendu | Seul calcul lourd hors Vercel | Élevée |

## Intelligence artificielle

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Anthropic (Claude) | Moteur IA principal de l'Assistant | — | Contexte utilisateur par requête | Cœur du principe « l'IA augmente, ne remplace pas » | Critique |
| OpenAI | Capacité IA complémentaire | — | Contexte par requête | Évite une dépendance unique à un fournisseur | Moyenne |

## Finances

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Stripe | Suivi des revenus réels | Transactions, abonnements | — | Alimente Finances avec du réel, pas du déclaratif | Élevée |

## Notifications

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Discord | Alertes sur un canal déjà utilisé | — | Messages, alertes | Notification sans ouvrir L'Édifice | Moyenne |
| Telegram | Messagerie mobile rapide | — | Messages, alertes | Canal de notification alternatif | Moyenne |
| Slack | Notifications en contexte pro | — | Messages | Pertinent pour un usage pro en équipe | Différée |
| WhatsApp | Canal de notification du quotidien | — | Messages | Notification à très faible friction | Différée |

## Réseaux sociaux

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| YouTube | Publication et performance vidéo | Statistiques de chaîne | Publication de vidéos | Canal principal du module Contenu | Élevée |
| TikTok | Publication de formats courts | Statut du compte | Publication de vidéos courtes | Canal de diffusion complémentaire | Élevée |
| Instagram | Publication et performance visuelle | Statistiques via API Graph | Publication de contenus | Canal pour marques à forte image | Élevée |
| Pinterest | Publication et gestion de tableaux | Statut des pins | Publication de pins | Canal pour audience de recherche visuelle | Moyenne |
| LinkedIn | Publication professionnelle | — | Publication de contenus | Canal pour le versant pro de L'Édifice | Différée |
| Threads | Diffusion texte courte | — | Publication de contenus | Extension d'une présence Meta déjà connectée | Différée |
| Meta | Connexion porteuse d'Instagram et Threads | Comptes disponibles, statut | — | Authentification partagée des canaux Meta | Élevée |

## Météo

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Météo | Contexte environnemental du brief | Prévisions, conditions actuelles | — | Affine des recommandations dépendantes du contexte extérieur | Moyenne |

## Autres

| Intégration | Objectif | Récupère | Envoie | Valeur | Priorité |
|---|---|---|---|---|---|
| Notion | Rattacher une base de connaissances existante | Contenu de pages, bases de données | — | Évite une migration forcée d'un outil déjà utilisé | Différée |

## Récapitulatif par priorité

| Priorité | Intégrations |
|---|---|
| Critique | Garmin, Health Auto Export, Google Calendar, Supabase, Vercel, Anthropic (Claude) |
| Élevée | GitHub, Cloudflare, Railway, Stripe, YouTube, TikTok, Instagram, Meta |
| Moyenne | Strava, Runna, Gmail, OpenAI, Discord, Telegram, Pinterest, Météo |
| Différée | Hevy, Google Drive, Google Docs, Google Contacts, Google Tasks, Outlook, Slack, WhatsApp, LinkedIn, Threads, Notion |

## État réel des chantiers en cours

**Google Calendar.** Le connecteur OAuth et la synchronisation par webhook sont en cours de construction. L'objectif est un flux robuste au fuseau horaire de Paris, avec renouvellement automatique du canal webhook plutôt qu'une synchronisation par sondage répété.

**Garmin.** L'accès à l'API officielle reste bloqué : la candidature au programme développeur n'a pas abouti. Le contournement retenu est Health Auto Export, une application iOS qui pousse les données Apple Health par webhook — elle couvre les mêmes métriques utiles au brief quotidien sans dépendre d'une approbation externe. Pour l'historique complet de cette décision, voir [Documentation-Technique-Code/03_Decisions.md](../../Documentation-Technique-Code/03_Decisions.md) ; ce document n'en reprend que l'état courant.
