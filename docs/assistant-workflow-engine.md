# Assistant Workflow Engine

## Objectif

Le Workflow Engine transforme une demande naturelle adressee a l'assistant
Edifice en workflow operationnel. Contrairement a l'analyse simple, il retourne
des actions typees, ordonnees et potentiellement executables.

Exemples de demandes :

- "Termine tous les brouillons commences"
- "Prepare 7 jours de publications"
- "Programme les videos pretes"
- "Termine les brouillons bloques si possible"

## Architecture

- Moteur : `lib/server/assistant-workflows/shorts-workflow-engine.ts`
- Plan API : `POST /api/assistant/workflows/plan`
- Execute API : `POST /api/assistant/workflows/execute`
- UI assistant : `components/cockpit/AssistantCommandCenter.tsx`

La V1 reutilise l'orchestrateur Shorts existant pour lire les brouillons, les
statuts media, les rendus video et le scheduling. Le moteur convertit ensuite ce
plan en actions de workflow avec :

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

## Garde-fous

- Aucune publication reelle n'est incluse dans le workflow V1.
- `save_schedule` est visible mais non execute sans confirmation dediee.
- Les validations humaines restent sensibles et sont ignorees par le runner V1.
- Le runner execute les actions dans l'ordre.
- Le runner s'arrete a la premiere erreur.
- Chaque action produit un log avec `user_intent`, `workflow_id`, `action_id`,
  `action_type`, `draft_id`, `result` et `error`.
- Les secrets et tokens OAuth ne sont jamais exposes au client.

## Actions disponibles

Actions branchees en V1 :

- `generate_visuals` : appelle `requestDraftVisualGeneration`.
- `generate_voice` : appelle `generateDraftVoice`.
- `generate_subtitles` : appelle `generateDraftSubtitles`.
- `prepare_video` : appelle `prepareDraftVideo`.
- `propose_schedule` : retourne le planning deja calcule sans mutation.

Actions visibles mais sensibles ou placeholder :

- `validate_draft_text`
- `validate_visuals`
- `validate_voice`
- `validate_subtitles`
- `validate_video`
- `start_video_render`
- `save_schedule`

## Actions sensibles

Une action est sensible si elle valide un contenu, sauvegarde un planning ou
prepare une mutation externe critique. En V1, ces actions sont affichees dans le
workflow, mais marquees `skipped` lors de l'execution.

`save_schedule` reste separe de `propose_schedule` pour eviter de transformer une
suggestion de planning en programmation definitive.

## Ajouter une nouvelle action

1. Ajouter le type dans `AssistantWorkflowActionType`.
2. Ajouter le mapping dans `mapShortsActionType` si l'action vient du pipeline
   Shorts.
3. Decider si l'action est sure dans `safeExecutableActions`.
4. Ajouter l'implementation dans `executeWorkflowAction`.
5. Verifier les logs `console.info` / `console.error`.
6. Ajouter un test ou lancer au minimum `npm run build`, `npm run lint` et les
   checks Shorts.
7. Mettre cette documentation a jour.

Une action qui publie, programme definitivement, supprime, modifie OAuth ou
valide un contenu doit rester sensible jusqu'a ajout d'une confirmation dediee et
d'un journal d'audit persistant.

## Limites V1

- Pas de persistance des workflows en base.
- Pas encore de reprise apres interruption navigateur.
- Pas de confirmation par action depuis le serveur.
- Pas de journal d'audit dedie en table Supabase.
- `start_video_render` reste placeholder pour eviter un dispatch distant non
  encadre depuis l'assistant.
- L'UI affiche la progression apres retour serveur; le streaming temps reel n'est
  pas encore branche.
