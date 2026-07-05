# Assistant Workflow Engine

## Objectif

Le module Assistant de L'Edifice fonctionne maintenant comme un orchestrateur du
Cockpit. Il ne produit plus un format de reponse "conseiller" separe du plan :
chaque commande naturelle est convertie en workflow canonique, affichee pour
confirmation, puis executee par le runner central.

Architecture imposee pour toutes les commandes :

1. Analyse
2. Detection des ressources disponibles
3. Construction d'un workflow
4. Estimation du cout
5. Estimation du temps
6. Verification des dependances
7. Presentation du plan
8. Attente de confirmation
9. Execution
10. Suivi
11. Rapport final

## Responsabilites des fichiers

- `lib/server/assistant-workflows/engine.ts` : moteur canonique. Il detecte
  l'intention, lit les ressources, construit les actions, estime cout/temps,
  execute les actions autorisees et produit le rapport final.
- `lib/server/assistant/global-assistant.ts` : facade de compatibilite pour
  l'API globale. Elle delegue exclusivement au Workflow Engine.
- `lib/server/assistant/build-project-context.ts` : lecture d'etat cockpit
  read-only. Aucun format de reponse utilisateur n'y est construit.
- `app/api/assistant/global/route.ts` : endpoint principal de l'assistant.
- `app/api/assistant/workflows/plan/route.ts` : endpoint plan-only.
- `app/api/assistant/workflows/execute/route.ts` : endpoint d'execution.
- `components/cockpit/AssistantCommandCenter.tsx` : interface de commande,
  plan, confirmation, progression et rapport.
- `lib/server/assistant-actions/shorts.ts` : analyse metier Shorts reutilisee
  par le moteur pour calculer les actions liees aux brouillons.
- `app/api/assistant/shorts-orchestrator/route.ts` : endpoint de compatibilite
  pour la page Pilotage IA Shorts existante.

## Intentions couvertes

- terminer les brouillons
- preparer les videos
- preparer les medias
- generer les voix
- generer les sous-titres
- preparer une semaine
- programmer les videos
- publier
- reprendre un brouillon
- analyser le cockpit
- analyser un projet
- organiser le travail
- preparer les prochaines etapes

## Objet workflow

Chaque workflow contient :

- `id`
- `user_intent`
- `normalized_intent`
- `summary`
- `status`
- `current_stage`
- `stages`
- `actions`
- `estimates`
- `dependencies`
- `resources`
- `guardrails`
- `analysis`

Chaque action contient :

- `id`
- `type`
- `label`
- `draft_id`
- `draft_title`
- `status`
- `estimated_time_seconds`
- `estimated_cost`
- `requires_confirmation`
- `is_sensitive`
- `placeholder`
- `route`
- `result`
- `error`

## Actions branchees

Actions executees en V1 :

- `detect_available_resources`
- `verify_dependencies`
- `generate_visuals`
- `generate_voice`
- `generate_subtitles`
- `prepare_video`
- `propose_schedule`
- `analyze_cockpit`
- `analyze_project`
- `organize_work`
- `prepare_next_steps`
- `final_report`

Actions visibles mais sensibles ou placeholder :

- `validate_draft_text`
- `validate_visuals`
- `validate_voice`
- `validate_subtitles`
- `validate_video`
- `start_video_render`
- `save_schedule`
- `prepare_publication`
- `publish`

## Garde-fous

- Aucune publication reelle sans confirmation explicite dediee.
- Aucune programmation definitive sans confirmation explicite dediee.
- Les validations humaines restent sensibles.
- Le runner s'arrete a la premiere erreur technique.
- Les secrets et tokens OAuth restent cote serveur.
- `publish` est detecte comme intention, mais aucune action de publication
  reelle n'est incluse dans le runner V1.

## Logs

Le runner journalise :

- `user_intent`
- `workflow_id`
- `action_id`
- `action_type`
- `draft_id`
- `result`
- `error`

## Ajouter une action

1. Ajouter le type dans `AssistantWorkflowActionType`.
2. Ajouter l'intention si besoin dans `AssistantWorkflowIntent`.
3. Ajouter la detection dans `detectAssistantWorkflowIntent`.
4. Ajouter la construction de l'action dans `createShortsActions` ou
   `createProjectActions`.
5. Ajouter l'action dans `safeExecutableActions` seulement si elle est sure.
6. Ajouter le code d'execution dans `executeWorkflowAction`.
7. Mettre a jour les garde-fous et cette documentation.

## Limites restantes

- Les workflows ne sont pas encore persistes en base.
- Le suivi est mis a jour apres retour serveur, pas encore en streaming.
- La page Pilotage IA Shorts utilise encore un endpoint de compatibilite, meme
  si le moteur canonique est disponible pour l'assistant principal.
- Les confirmations par action ne sont pas encore journalisees en table dediee.
