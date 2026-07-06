# Architecture Pilotage IA / Atelier Shorts

## Objectif

Pilotage IA est le chef d'orchestre du pipeline Shorts. Il decide quelle etape
lancer, si le resultat peut etre auto-valide et quand l'execution doit s'arreter
pour une intervention humaine.

L'Atelier Shorts reste la boite a outils. Il execute les generations, les
validations techniques et les mises a jour Supabase via ses services existants.
Pilotage IA ne recree pas de generation parallele.

## Chemin actif

```txt
Page Pilotage IA
  -> ShortsPilotageClient
  -> POST /api/assistant/shorts-orchestrator
  -> executeShortsProductionPipeline
  -> evaluateShortsStepDecision
  -> services Atelier Shorts existants
  -> Supabase
  -> retour UI avec progression, logs et blocages restants
```

Le bouton `Examiner` ouvre une fenetre d'intervention humaine. Il n'est pas le
chemin principal de production. Si une etape est auto-validable, le runner
continue sans ouvrir cette fenetre.

## Modes

- Manuel : aucune execution groupee depuis Pilotage IA. Les validations restent
  manuelles dans les modules Atelier.
- Assiste : les generations autorisees sont lancees automatiquement. Les
  validations sont auto-validees seulement si les criteres qualite passent.
- Automatique : le pipeline avance automatiquement jusqu'a la video prete quand
  les criteres techniques passent.

## Decision centralisee

La fonction canonique est `evaluateShortsStepDecision(...)` dans
`lib/server/shorts-auto-validation.ts`.

Elle retourne :

- `canRun`
- `canAutoValidate`
- `requiresHumanValidation`
- `reason`
- `nextAction`
- `qualitySignals`
- `blockedReason`

## Criteres minimaux

- Visuels : images liees au brouillon et score superieur au seuil configurable,
  ou selection existante complete deja liee au brouillon.
- Voix : audio present et duree lisible.
- Sous-titres : segments presents et duree coherente si l'audio est disponible.
- Video : MP4 present et duree lisible.
- Planning : proposition possible, enregistrement definitif protege.
- Publication : confirmation humaine explicite obligatoire.

Le seuil visuel est configure par
`SHORTS_VISUAL_AUTO_VALIDATION_SCORE_THRESHOLD`. La valeur par defaut est `75`.

## Garde-fous

- Aucune publication reelle sans validation explicite.
- Aucune programmation definitive sans validation explicite.
- Aucune suppression automatique.
- Aucun secret modifie.
- Le mode Manuel conserve le comportement historique de l'Atelier.

## Responsabilites

- `ShortsPilotageClient` : affiche le plan, lance le runner, montre les logs et
  ouvre `Examiner` uniquement pour consultation ou intervention humaine.
- `/api/assistant/shorts-orchestrator` : route unique de Pilotage IA Shorts.
- `executeShortsProductionPipeline` : boucle d'orchestration, relecture Supabase
  apres chaque passe, arret au vrai blocage.
- `evaluateShortsStepDecision` : seule logique de decision validation/auto-
  validation pour le chemin Pilotage.
- Services Atelier : generation visuels, voix, sous-titres, video, planning et
  mises a jour Supabase.
