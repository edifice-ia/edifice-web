# Modules

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Sommeil](#sommeil)
- [Sport](#sport)
- [Santé](#santé)
- [Nutrition](#nutrition)
- [Habitudes](#habitudes)
- [Journal et Humeur](#journal-et-humeur)
- [Tâches](#tâches)
- [Objectifs](#objectifs)
- [Agenda](#agenda)
- [Notes](#notes)

## Rôle du document

Ce document donne une fiche courte pour chaque module de domaine de vie, au sens défini dans [10-architecture-systeme.md](./10-architecture-systeme.md). Il couvre au minimum les modules composés par le pôle Personnel. Il ne redécrit pas les services communs que ces modules consomment — voir [20-catalogue-services.md](./20-catalogue-services.md).

Chaque module listé ici est activable et désactivable via la couche de configuration — voir [11-modularite-configuration.md](./11-modularite-configuration.md) — et aucun autre composant ne présume de sa présence : un module désactivé n'a simplement rien à donner à lire, il ne fait planter aucune surface qui le consulterait — deuxième règle d'or, voir [01-principes.md](./01-principes.md).

## Sommeil

**Rôle.** Suivre la qualité et la durée du sommeil pour informer la priorisation par l'énergie.

**Données clés.** Durée, phases, Body Battery, fréquence cardiaque au repos.

**Source.** Intégration — Garmin ou Health Auto Export, voir [14-integrations.md](./14-integrations.md).

**Donnée dérivée notable.** Un niveau de récupération calculé à partir des métriques brutes, utilisé pour prioriser les actions du jour.

**Rattachement.** Personnel ; lu par Accueil pour le brief et par l'Assistant.

## Sport

**Rôle.** Suivre l'activité physique et l'entraînement.

**Données clés.** Séances, distance, allure, charge d'entraînement, dénivelé.

**Source.** Intégration — Garmin, Strava, Runna ou Hevy selon le type d'activité.

**Donnée dérivée notable.** Une charge d'entraînement cumulée, utilisée pour éviter de recommander un effort incompatible avec la récupération réelle.

**Rattachement.** Personnel ; peut croiser un objectif de Trajectoire, par exemple un objectif de course.

## Santé

**Rôle.** Centraliser les données de santé générales, au-delà du sport et du sommeil.

**Données clés.** Fréquence cardiaque, stress, indicateurs ponctuels.

**Source.** Intégration (Health Auto Export, Garmin) et saisie manuelle pour ce qui n'est pas capté automatiquement.

**Donnée dérivée notable.** Un signal de dérive sur une tendance — un niveau de stress prolongé — plutôt qu'une valeur ponctuelle isolée.

**Rattachement.** Personnel.

## Nutrition

**Rôle.** Suivre l'alimentation.

**Données clés.** Repas, apports, habitudes alimentaires.

**Source.** Saisie manuelle.

**Donnée dérivée notable.** La régularité des repas, pertinente à croiser avec l'énergie et le sommeil.

**Rattachement.** Personnel.

## Habitudes

**Rôle.** Suivre des routines répétées que l'on veut maintenir ou installer.

**Données clés.** Routine, fréquence visée, taux de complétion.

**Source.** Saisie manuelle.

**Donnée dérivée notable.** Une série en cours et un taux de constance sur une période donnée.

**Rattachement.** Personnel.

## Journal et Humeur

**Rôle.** Garder une trace libre de ce qui se passe et de l'état d'esprit du moment.

**Données clés.** Entrées de texte libre, humeur associée.

**Source.** Saisie manuelle.

**Donnée dérivée notable.** Une tendance d'humeur sur une période, lisible par l'Assistant sans jamais être traitée comme un diagnostic.

**Rattachement.** Personnel.

## Tâches

**Rôle.** Suivre ce qu'il reste à faire, personnel ou professionnel.

**Données clés.** Intitulé, échéance, statut, contexte.

**Source.** Saisie manuelle, ou synchronisation depuis un outil externe — voir Google Tasks dans [14-integrations.md](./14-integrations.md).

**Donnée dérivée notable.** Une charge de tâches en attente, croisée avec l'énergie disponible pour prioriser le jour.

**Rattachement.** Personnel ; peut aussi provenir d'une Action de Trajectoire.

## Objectifs

**Rôle.** Suivre un objectif personnel qui n'appartient pas nécessairement à un projet de Trajectoire.

**Données clés.** Intitulé, cible, progression.

**Source.** Saisie manuelle.

**Donnée dérivée notable.** Une progression retenue, calculée par le moteur Objectifs — voir [20-catalogue-services.md](./20-catalogue-services.md), dont ce document ne redécrit pas le fonctionnement.

**Rattachement.** Personnel ; peut aussi vivre dans Trajectoire selon le contexte.

## Agenda

**Rôle.** Donner une vue du temps disponible et engagé, personnel et professionnel.

**Données clés.** Événements, disponibilités, durée.

**Source.** Intégration — Google Calendar ou Outlook, voir [14-integrations.md](./14-integrations.md).

**Donnée dérivée notable.** Le temps réellement disponible dans une journée, utilisé par le brief pour ne jamais recommander plus que ce que le temps permet.

**Rattachement.** Personnel ; lu par Accueil pour le brief.

## Notes

**Rôle.** Garder une information ponctuelle qui ne mérite pas une entrée de journal.

**Données clés.** Texte libre, éventuellement rattaché à un contexte.

**Source.** Saisie manuelle.

**Donnée dérivée notable.** Aucune à ce stade — une note reste ce qu'elle est.

**Rattachement.** Personnel par défaut, mais peut se rattacher à une Marque ou un Projet si la note concerne ce contexte — voir le rattachement contexte dans [12-modele-de-donnees.md](./12-modele-de-donnees.md).
