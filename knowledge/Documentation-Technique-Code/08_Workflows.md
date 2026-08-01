# Workflows

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Workflow assistant canonique](#workflow-assistant-canonique)
- [Workflow Shorts](#workflow-shorts)
- [Workflow publication](#workflow-publication)
- [Workflow maintenance documentaire](#workflow-maintenance-documentaire)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier décrit les enchaînements opérationnels du projet. Un workflow doit être compréhensible sans lire le code, puis rattachable au code si besoin.

## Workflow assistant canonique

Architecture imposée pour les commandes d'action :

1. Analyse.
2. Détection des ressources disponibles.
3. Construction du workflow.
4. Estimation du coût.
5. Estimation du temps.
6. Vérification des dépendances.
7. Présentation du plan.
8. Attente de confirmation.
9. Exécution.
10. Suivi.
11. Rapport final.

Référence principale : `lib/server/assistant-workflows/engine.ts`.

## Workflow Shorts

Étapes métier principales :

1. Créer ou lire un brouillon.
2. Valider le texte.
3. Générer ou sélectionner les visuels.
4. Valider les visuels.
5. Générer la voix.
6. Valider la voix.
7. Générer les sous-titres.
8. Valider les sous-titres.
9. Préparer le manifest vidéo.
10. Lancer ou suivre le rendu.
11. Valider la vidéo.
12. Proposer un planning.
13. Enregistrer le planning après confirmation.
14. Préparer la publication.
15. Publier après confirmation explicite.

Les étapes sensibles doivent rester confirmées par l'utilisateur.

## Workflow publication

```text
Vérifier OAuth
  -> sélectionner contenu prêt
  -> vérifier destination
  -> afficher résumé et risque
  -> demander validation humaine
  -> exécuter publication contrôlée
  -> enregistrer résultat et métriques
```

## Workflow maintenance documentaire

À chaque changement structurant :

1. Identifier le domaine touché.
2. Mettre à jour le fichier `/knowledge` concerné.
3. Ajouter ou modifier une décision si le choix est durable.
4. Ajouter une entrée au changelog.
5. Vérifier les liens croisés.
6. Régénérer le PDF si une version partageable est nécessaire.

## Liens utiles

- [Agents](./07_Agents.md)
- [Prompts](./09_Prompts.md)
- [Conventions](./10_Conventions.md)
- [Changelog](./11_Changelog.md)

## À mettre à jour

- Ajouter les workflows détaillés Pinterest, YouTube, TikTok et Instagram.
- Ajouter les statuts attendus pour chaque étape Shorts.
- Ajouter les conditions d'arrêt et de reprise.
- Ajouter des exemples de payloads API.
