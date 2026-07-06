import "server-only";

import type { SavedContentDraft } from "@/lib/server/content-workshop";
import type { MediaPipelineState } from "@/lib/server/media-pipeline";
import type { VideoRenderJobState } from "@/lib/server/video-renderer";

export type ShortsAutoValidationMode = "assisted" | "automatic" | "manual";

export type ShortsAutoValidationStep =
  | "visuals"
  | "voice"
  | "subtitles"
  | "video"
  | "planning";

export type ShortsQualitySignals = Record<string, string | number | boolean | null>;

export type ShortsAutoValidationDecision = {
  autoValidated: boolean;
  blockedReason: string | null;
  qualitySignals: ShortsQualitySignals;
  reason: string;
};

export const DEFAULT_VISUAL_AUTO_VALIDATION_SCORE_THRESHOLD = 75;

export function getVisualAutoValidationScoreThreshold() {
  const rawValue = process.env.SHORTS_VISUAL_AUTO_VALIDATION_SCORE_THRESHOLD?.trim();
  const threshold = Number(rawValue);

  return Number.isFinite(threshold) && threshold > 0
    ? threshold
    : DEFAULT_VISUAL_AUTO_VALIDATION_SCORE_THRESHOLD;
}

function requiredVisualCount(draft: SavedContentDraft, media: MediaPipelineState | null) {
  const explicitCount = draft.score.requiredVisualSceneCount;

  if (typeof explicitCount === "number" && Number.isFinite(explicitCount) && explicitCount > 0) {
    return explicitCount;
  }

  return Math.max(media?.visualScenes.length ?? 0, media?.selectedAssets.length ?? 0);
}

function isReadyVisualScene(status: string) {
  return status === "ready" ||
    status === "retained" ||
    status === "selected_from_library";
}

function coherentDuration(first: number | null | undefined, second: number | null | undefined) {
  if (!first || !second) {
    return false;
  }

  const tolerance = Math.max(5, Math.max(first, second) * 0.2);

  return Math.abs(first - second) <= tolerance;
}

// Central rule used by Pilotage IA to decide whether a generated result can be
// validated automatically. It never authorizes scheduling or publication.
export function shouldAutoValidateStep({
  draft,
  media,
  mode,
  step,
  video,
  visualScoreThreshold = getVisualAutoValidationScoreThreshold(),
}: {
  draft: SavedContentDraft;
  media: MediaPipelineState | null;
  mode: ShortsAutoValidationMode;
  step: ShortsAutoValidationStep;
  video: VideoRenderJobState | null;
  visualScoreThreshold?: number;
}): ShortsAutoValidationDecision {
  if (mode === "manual") {
    return {
      autoValidated: false,
      blockedReason: "Mode Manuel actif.",
      qualitySignals: { mode },
      reason: "Validation humaine requise : mode Manuel.",
    };
  }

  if (step === "planning") {
    return {
      autoValidated: false,
      blockedReason: "Programmation definitive protegee.",
      qualitySignals: { mode },
      reason: "Validation humaine requise : la programmation definitive reste sensible.",
    };
  }

  if (step === "visuals") {
    const requiredCount = requiredVisualCount(draft, media);
    const readyScenes = (media?.visualScenes ?? []).filter((scene) =>
      Boolean(scene.imageUrl) && isReadyVisualScene(scene.generationStatus),
    );
    const scores = readyScenes.map((scene) => scene.scoreTotal);
    const scoredScenes = scores.filter((score): score is number =>
      typeof score === "number" && Number.isFinite(score),
    );
    const minimumScore = scoredScenes.length ? Math.min(...scoredScenes) : null;
    const enoughScenes = requiredCount > 0 && readyScenes.length >= requiredCount;
    const allScoresAvailable = readyScenes.length > 0 && scoredScenes.length === readyScenes.length;
    const scoresAccepted = allScoresAvailable && minimumScore !== null && minimumScore >= visualScoreThreshold;
    const retainedSceneIndexes = readyScenes
      .slice(0, requiredCount)
      .map((scene) => scene.visualPromptIndex);
    const qualitySignals: ShortsQualitySignals = {
      ready_scenes: readyScenes.length,
      required_scenes: requiredCount,
      minimum_score: minimumScore,
      score_threshold: visualScoreThreshold,
      scores_available: allScoresAvailable,
    };

    if (enoughScenes && scoresAccepted) {
      return {
        autoValidated: true,
        blockedReason: null,
        qualitySignals: {
          ...qualitySignals,
          retained_scene_indexes: retainedSceneIndexes.join(","),
        },
        reason: "Auto-valide selon criteres qualite : visuels complets et score suffisant.",
      };
    }

    return {
      autoValidated: false,
      blockedReason: !enoughScenes
        ? "visuels manquants"
        : !allScoresAvailable
          ? "score IA absent"
          : "score trop faible",
      qualitySignals,
      reason: !enoughScenes
        ? "Validation humaine requise : visuels manquants."
        : !allScoresAvailable
          ? "Validation humaine requise : score IA absent."
          : "Validation humaine requise : score trop faible.",
    };
  }

  if (step === "voice") {
    const hasAudio = Boolean(media?.voice.audioUrl);
    const durationSeconds = media?.voice.durationEstimateSeconds ?? 0;
    const qualitySignals = {
      audio_present: hasAudio,
      duration_seconds: durationSeconds,
      voice_status: media?.voice.status ?? null,
    };

    if (hasAudio && durationSeconds > 0) {
      return {
        autoValidated: true,
        blockedReason: null,
        qualitySignals,
        reason: "Auto-valide selon criteres qualite : audio present et duree lisible.",
      };
    }

    return {
      autoValidated: false,
      blockedReason: hasAudio ? "duree absente" : "fichier audio manquant",
      qualitySignals,
      reason: hasAudio
        ? "Validation humaine requise : duree audio absente."
        : "Validation humaine requise : fichier audio manquant.",
    };
  }

  if (step === "subtitles") {
    const segmentsCount = media?.subtitles.segmentsCount ?? 0;
    const durationSeconds = media?.subtitles.durationSeconds ?? 0;
    const audioDurationSeconds = media?.subtitles.audioDurationSeconds ?? null;
    const durationIsCoherent = audioDurationSeconds
      ? coherentDuration(durationSeconds, audioDurationSeconds)
      : durationSeconds > 0;
    const qualitySignals = {
      audio_duration_seconds: audioDurationSeconds,
      duration_coherent: durationIsCoherent,
      duration_seconds: durationSeconds,
      segments_count: segmentsCount,
      subtitle_status: media?.subtitles.status ?? null,
    };

    if (segmentsCount > 0 && durationIsCoherent) {
      return {
        autoValidated: true,
        blockedReason: null,
        qualitySignals,
        reason: "Auto-valide selon criteres qualite : segments presents et duree coherente.",
      };
    }

    return {
      autoValidated: false,
      blockedReason: segmentsCount <= 0 ? "segments absents" : "duree incoherente",
      qualitySignals,
      reason: segmentsCount <= 0
        ? "Validation humaine requise : aucun segment de sous-titres."
        : "Validation humaine requise : duree des sous-titres incoherente.",
    };
  }

  const qualitySignals = {
    duration_seconds: video?.durationSeconds ?? null,
    output_present: Boolean(video?.outputUrl),
    video_status: video?.status ?? null,
  };

  if (video?.status === "completed" && Boolean(video.outputUrl) && (video.durationSeconds ?? 0) > 0) {
    return {
      autoValidated: true,
      blockedReason: null,
      qualitySignals,
      reason: "Auto-valide selon criteres qualite : MP4 present et duree coherente.",
    };
  }

  return {
    autoValidated: false,
    blockedReason: !video?.outputUrl ? "fichier MP4 manquant" : "duree video absente",
    qualitySignals,
    reason: !video?.outputUrl
      ? "Validation humaine requise : fichier MP4 manquant."
      : "Validation humaine requise : duree video absente.",
  };
}
