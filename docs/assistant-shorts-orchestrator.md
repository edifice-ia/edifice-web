# Assistant Shorts Orchestrator

## Objectif

Le module Pilotage IA transforme une commande naturelle en plan operationnel
pour le pipeline Shorts de L'Edifice. La V1 sert a analyser, classer et proposer
les prochaines actions sans declencher automatiquement de mutation sensible.

Commandes visees :

- "Termine les brouillons commences"
- "Prepare 7 jours de publications"
- "Programme les videos pretes pour la semaine"
- "Fais-moi un rapport des brouillons bloques"

## Architecture

- UI : `app/interface/post-creation/shorts/pilotage-ia`
- API : `app/api/assistant/shorts-orchestrator/route.ts`
- Orchestrateur : `lib/server/assistant-actions/shorts.ts`
- Sources metier reutilisees :
  - `readContentDrafts`
  - `readMediaPipelineState`
  - `readVideoRenderJobState`
  - `readShortsSchedulingState`
  - `getShortWorkflowState`
  - `buildShortsScheduleCandidates`

Le global assistant reste conversationnel et lecture seule. Le Pilotage IA Shorts
est isole pour garder les regles d'orchestration proches du pipeline Shorts.

## Statuts Shorts utilises

Statuts `content_drafts.status` principaux :

- `draft`
- `approved`
- `voix_en_attente`
- `voix_en_cours`
- `voix_erreur`
- `voix_prete` / `voix_prête`
- `voix_validée` / `voix_validee`
- `sous_titres_en_cours`
- `sous_titres_prêts` / `sous_titres_prets`
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

## Actions disponibles

Actions deja exposees par les API existantes :

- lister les brouillons : `GET /api/content-workshop/drafts`
- lire le media pipeline : `GET /api/content-workshop/drafts/[id]/media`
- generer ou completer les visuels : `POST /api/content-workshop/drafts/[id]/media`
- generer la voix : action `generate_voice`
- generer les sous-titres : action `generate_subtitles`
- preparer la video : action `prepare_video`
- lire/declencher le rendu : `/api/content-workshop/drafts/[id]/video-render`
- proposer des creneaux : `buildShortsScheduleCandidates`
- sauvegarder un planning : `/api/content-workshop/shorts-schedules`
- preparer une publication plateforme : `/api/content-workshop/shorts-publications`

La V1 ne branche pas encore l'execution groupee. Elle produit un plan et marque
chaque action comme placeholder.

## Garde-fous

- Aucune publication reelle sans validation explicite.
- Aucune programmation definitive sans validation explicite.
- Aucune modification OAuth.
- Aucun secret expose.
- Les validations humaines restent humaines : texte, visuels, voix, sous-titres,
  video, planning et publication.
- Les generations sont listables, mais pas executees en lot dans cette V1.

## Limites V1

- Pas d'execution reelle du plan.
- Pas de reprise automatique apres erreur.
- Pas de journal d'audit dedie par action.
- Pas de verrou de concurrence par plan.
- Pas de selection fine par brouillon depuis l'UI.
- Le planning propose des creneaux par defaut, sans analytics de plateforme.
- Les actions sensibles sont bloquees meme si techniquement disponibles ailleurs.

## Prochaines evolutions

1. Ajouter une table de journal `assistant_short_runs`.
2. Ajouter une confirmation par action ou par lot.
3. Brancher uniquement les actions non sensibles en premier :
   generation voix, generation sous-titres, preparation manifest.
4. Ajouter un mode simulation detaille avec cout estime.
5. Ajouter un verrou par brouillon pour eviter les doubles generations.
6. Brancher la programmation apres validation explicite du planning.
7. Garder publication reelle comme etape separee avec confirmation stricte.
