# Assistant Shorts Orchestrator

## Objectif

Le module Shorts reste l'analyseur metier du pipeline Shorts. Il lit les
brouillons, les medias, les rendus et le scheduling pour produire les signaux
necessaires au Workflow Engine canonique.

Le comportement utilisateur principal est maintenant porte par :

- `lib/server/assistant-workflows/engine.ts`
- `POST /api/assistant/global`
- `POST /api/assistant/workflows/plan`
- `POST /api/assistant/workflows/execute`

## Responsabilites

- `lib/server/assistant-actions/shorts.ts` : analyse des statuts Shorts,
  detection de la prochaine action par brouillon, estimations et propositions de
  planning.
- `app/api/assistant/shorts-orchestrator/route.ts` : compatibilite avec la page
  Pilotage IA Shorts existante.
- `app/interface/post-creation/shorts/pilotage-ia` : cockpit Shorts specialise.

## Statuts Shorts utilises

- `draft`
- `approved`
- `voix_en_attente`
- `voix_en_cours`
- `voix_erreur`
- `voix_prete` et variante accentuee
- `voix_validee` et variante accentuee
- `sous_titres_en_cours`
- `sous_titres_prets` et variante accentuee
- `sous_titres_erreur`
- `video_en_attente`
- `video_ready`
- `video_validated`
- `ready_to_publish`

Signaux dedies :

- `visual_status=visual_ready`
- `visuals_validated_at`
- `voice_status=ready|validated|error|generating`
- assets sous-titres avec `subtitle_validation_status=validated`
- manifest video avec `video_preparation_status=ready`
- `video_render_jobs.metadata.video_validation_status=validated`
- `short_video_schedules.status`
- `short_video_publications.status`

## Utilisation par le Workflow Engine

Le moteur canonique appelle `buildShortsAssistantPlan`, puis convertit les
actions Shorts vers les actions standard :

- `validate_text` -> `validate_draft_text`
- `generate_visuals` -> `generate_visuals`
- `validate_visuals` -> `validate_visuals`
- `generate_voice` -> `generate_voice`
- `validate_voice` -> `validate_voice`
- `generate_subtitles` -> `generate_subtitles`
- `validate_subtitles` -> `validate_subtitles`
- `prepare_video` -> `prepare_video`
- `start_video_render` -> `start_video_render`
- `validate_video` -> `validate_video`
- `propose_schedule` -> `propose_schedule`
- `save_schedule` -> `save_schedule`

## Garde-fous

- Les validations restent sensibles.
- `save_schedule` est sensible.
- `publish` est exclu de l'execution V1.
- Les generations branchees sont executees uniquement par le runner central.

## Limites

- Le endpoint `shorts-orchestrator` est conserve pour compatibilite UI.
- Le runner canonique ne persiste pas encore les workflows.
- `start_video_render` reste placeholder jusqu'a ajout d'une confirmation et
  d'un audit dedie.
