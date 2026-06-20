export type ShortWorkflowStepStatus =
  | "pending"
  | "in_progress"
  | "generating"
  | "ready"
  | "ignored"
  | "validated"
  | "error";

export type ShortWorkflowState = {
  text: "pending" | "validated";
  visuals: "pending" | "in_progress" | "ready" | "validated";
  voice: "pending" | "generating" | "ready" | "validated" | "error";
  subtitles: "pending" | "generating" | "ready" | "validated" | "ignored" | "error";
  video: "pending" | "generating" | "ready" | "validated";
  readyToPublish: "pending" | "validated";
  overallStatus: string;
  nextStep: string;
  reasons: Record<"text" | "visuals" | "voice" | "subtitles" | "video" | "readyToPublish", string>;
  raw: {
    draftStatus: string | null;
    mediaPipelineStatus: string | null;
    visualStatus: string | null;
    visualsValidatedAt: string | null;
    voiceStatus: string | null;
    voiceAudioUrl: string | null;
    subtitlesStatus: string | null;
    subtitlesSegmentsCount: number;
    videoStatus: string | null;
    selectedAssetsCount: number;
    visualScenesCount: number;
    retainedVisualScenesCount: number;
    requiredVisualCount: number;
  };
};

export type ShortWorkflowDraftInput = {
  status?: string | null;
  script?: string | null;
  visualStatus?: string | null;
  visual_status?: string | null;
  visualsValidatedAt?: string | null;
  visuals_validated_at?: string | null;
};

export type ShortWorkflowVisualSceneInput = {
  generationStatus?: string | null;
  locked?: boolean | null;
  imageUrl?: string | null;
};

export type ShortWorkflowMediaInput = {
  mediaPipelineStatus?: string | null;
  selectedAssets?: unknown[] | null;
  subtitles?: ShortWorkflowSubtitlesInput | null;
  videoPreparation?: ShortWorkflowVideoInput | null;
  visualScenes?: ShortWorkflowVisualSceneInput[] | null;
  voice?: ShortWorkflowVoiceInput | null;
};

export type ShortWorkflowVoiceInput = {
  audioUrl?: string | null;
  generatedAt?: string | null;
  status?: string | null;
};

export type ShortWorkflowSubtitlesInput = {
  generatedAt?: string | null;
  segmentsCount?: number | null;
  status?: string | null;
};

export type ShortWorkflowVideoInput = {
  status?: string | null;
};

const textValidatedStatuses = new Set([
  "approved",
  "validated",
  "visual_ready",
  "visuels_prets",
  "voix_en_attente",
  "voix_en_cours",
  "voix_erreur",
  "voix_prete",
  "voix_prête",
  "voix_validée",
  "voix_validee",
  "video_en_attente",
  "sous_titres_en_attente",
  "sous_titres_en_cours",
  "sous_titres_prêts",
  "sous_titres_pr\u00eats",
  "sous_titres_prets",
  "sous_titres_ignorés",
  "sous_titres_ignor\u00e9s",
  "sous_titres_ignores",
  "sous_titres_erreur",
  "voice_ready",
  "ready_to_publish",
]);

const visualReadyStatuses = new Set([
  "media_ready",
  "visual_ready",
  "visuels_prets",
  "voix_en_attente",
  "voix_en_cours",
  "voix_erreur",
  "voix_prete",
  "voix_prête",
  "voix_validée",
  "voix_validee",
  "video_en_attente",
  "sous_titres_en_attente",
  "sous_titres_en_cours",
  "sous_titres_prêts",
  "sous_titres_pr\u00eats",
  "sous_titres_prets",
  "sous_titres_ignorés",
  "sous_titres_ignor\u00e9s",
  "sous_titres_ignores",
  "sous_titres_erreur",
  "voice_ready",
  "ready_to_publish",
]);

const voiceReadyStatuses = new Set(["voix_prete", "voix_prête", "voice_ready", "ready_to_publish"]);
const voiceValidatedStatuses = new Set([
  "voix_validée",
  "voix_validee",
  "sous_titres_en_attente",
  "sous_titres_en_cours",
  "sous_titres_prêts",
  "sous_titres_pr\u00eats",
  "sous_titres_prets",
  "sous_titres_ignorés",
  "sous_titres_ignor\u00e9s",
  "sous_titres_ignores",
  "sous_titres_erreur",
  "video_en_attente",
  "ready_to_publish",
]);
const subtitleReadyStatuses = new Set(["sous_titres_prêts", "sous_titres_prets", "video_en_attente", "ready_to_publish"]);
const subtitleIgnoredStatuses = new Set(["sous_titres_ignorés", "sous_titres_ignores"]);

subtitleReadyStatuses.add("sous_titres_pr\u00eats");
subtitleIgnoredStatuses.add("sous_titres_ignor\u00e9s");
textValidatedStatuses.add("video_ready");
visualReadyStatuses.add("video_ready");
voiceValidatedStatuses.add("video_ready");
subtitleReadyStatuses.add("video_ready");

function normalizeStatus(value: string | null | undefined) {
  return value?.trim() || null;
}

function retainedVisualCount(scenes: ShortWorkflowVisualSceneInput[]) {
  return scenes.filter((scene) =>
    Boolean(scene.locked) ||
    scene.generationStatus === "retained" ||
    scene.generationStatus === "ready" ||
    scene.generationStatus === "selected_from_library" ||
    Boolean(scene.imageUrl),
  ).length;
}

function isVisualInProgress(scenes: ShortWorkflowVisualSceneInput[]) {
  return scenes.some((scene) =>
    scene.generationStatus === "pending" ||
    scene.generationStatus === "searching_library" ||
    scene.generationStatus === "scoring" ||
    scene.generationStatus === "generating" ||
    scene.generationStatus === "uploading",
  );
}

export function getShortWorkflowState({
  draft,
  media,
  requiredVisualCount = 0,
  video,
}: {
  draft?: ShortWorkflowDraftInput | null;
  media?: ShortWorkflowMediaInput | null;
  requiredVisualCount?: number;
  video?: ShortWorkflowVideoInput | null;
}): ShortWorkflowState {
  const draftStatus = normalizeStatus(draft?.status);
  const mediaPipelineStatus = normalizeStatus(media?.mediaPipelineStatus);
  const visualStatus = normalizeStatus(draft?.visualStatus ?? draft?.visual_status);
  const visualsValidatedAt = normalizeStatus(
    draft?.visualsValidatedAt ?? draft?.visuals_validated_at,
  );
  const voiceStatus = normalizeStatus(media?.voice?.status);
  const voiceAudioUrl = normalizeStatus(media?.voice?.audioUrl);
  const subtitlesStatus = normalizeStatus(media?.subtitles?.status);
  const subtitlesSegmentsCount = media?.subtitles?.segmentsCount ?? 0;
  const videoStatus = normalizeStatus(video?.status ?? media?.videoPreparation?.status);
  const visualScenes = media?.visualScenes ?? [];
  const selectedAssetsCount = media?.selectedAssets?.length ?? 0;
  const retainedScenesCount = retainedVisualCount(visualScenes);
  const effectiveRequiredVisualCount =
    requiredVisualCount || visualScenes.length || selectedAssetsCount;

  const text = draftStatus && textValidatedStatuses.has(draftStatus)
    ? "validated"
    : "pending";
  const visualsValidated = Boolean(visualsValidatedAt) ||
    visualStatus === "visual_ready" ||
    draftStatus === "ready_to_publish";
  const visualsReady = visualsValidated ||
    Boolean(draftStatus && visualReadyStatuses.has(draftStatus)) ||
    Boolean(mediaPipelineStatus && visualReadyStatuses.has(mediaPipelineStatus)) ||
    (
      effectiveRequiredVisualCount > 0 &&
      retainedScenesCount >= effectiveRequiredVisualCount
    ) ||
    (
      effectiveRequiredVisualCount > 0 &&
      selectedAssetsCount >= effectiveRequiredVisualCount
    );
  const visuals = visualsValidated
    ? "validated"
    : visualsReady
      ? "ready"
      : isVisualInProgress(visualScenes)
        ? "in_progress"
        : "pending";

  const voiceValidated = voiceStatus === "validated" ||
    Boolean(draftStatus && voiceValidatedStatuses.has(draftStatus));
  const voiceGenerated = voiceValidated ||
    voiceStatus === "ready" ||
    Boolean(voiceAudioUrl) ||
    Boolean(draftStatus && voiceReadyStatuses.has(draftStatus));
  const voice = voiceValidated
    ? "validated"
    : voiceStatus === "error" || draftStatus === "voix_erreur"
      ? "error"
      : voiceStatus === "generating" || draftStatus === "voix_en_cours"
        ? "generating"
        : voiceGenerated
          ? "ready"
          : "pending";

  const subtitles = subtitlesStatus === "error" || draftStatus === "sous_titres_erreur"
    ? "error"
    : subtitlesStatus === "generating" || draftStatus === "sous_titres_en_cours"
      ? "generating"
      : subtitlesStatus === "ignored" || Boolean(draftStatus && subtitleIgnoredStatuses.has(draftStatus))
        ? "ignored"
        : subtitlesStatus === "validated"
          ? "validated"
          : subtitlesStatus === "ready" || Boolean(draftStatus && subtitleReadyStatuses.has(draftStatus))
          ? "ready"
          : "pending";

  const videoReady = videoStatus === "ready" ||
    draftStatus === "video_ready" ||
    mediaPipelineStatus === "video_ready";
  const videoState = videoStatus === "validated" || draftStatus === "ready_to_publish"
    ? "validated"
    : videoReady
      ? "ready"
      : videoStatus === "generating"
        ? "generating"
        : "pending";
  const readyToPublish = draftStatus === "ready_to_publish" ? "validated" : "pending";

  const nextStep = text === "pending"
    ? "Valider le texte"
    : visuals === "pending"
      ? "Preparer les visuels"
      : visuals === "in_progress"
        ? "Terminer les visuels"
        : voice === "pending"
          ? "Generer la voix"
          : voice === "generating"
            ? "Attendre la voix"
            : voice === "error"
              ? "Corriger la voix"
              : subtitles === "pending"
                ? "Generer les sous-titres"
                : subtitles === "generating"
                  ? "Attendre les sous-titres"
                  : subtitles === "error"
                    ? "Corriger les sous-titres"
                    : subtitles === "ready"
                      ? "Valider les sous-titres"
                      : videoState === "pending"
                        ? "video_en_attente"
                        : readyToPublish === "pending"
                          ? "Generer la video"
                          : "Pret a publier";

  return {
    text,
    visuals,
    voice,
    subtitles,
    video: videoState,
    readyToPublish,
    overallStatus: readyToPublish === "validated" ? "ready_to_publish" : nextStep,
    nextStep,
    reasons: {
      text: text === "validated"
        ? `content_drafts.status=${draftStatus}`
        : "Aucun statut texte valide detecte.",
      visuals: visualsReady
        ? `Visuels termines via status=${draftStatus}, visual_status=${visualStatus}, media=${mediaPipelineStatus}, scenes=${retainedScenesCount}/${effectiveRequiredVisualCount}.`
        : `Visuels incomplets: scenes=${retainedScenesCount}/${effectiveRequiredVisualCount}.`,
      voice: voiceGenerated
        ? `Voix detectee via voice.status=${voiceStatus}, audio=${Boolean(voiceAudioUrl)}, draft=${draftStatus}.`
        : `Voix non generee: voice.status=${voiceStatus ?? "null"}.`,
      subtitles: subtitles === "validated"
        ? `Sous-titres valides: status=${subtitlesStatus ?? draftStatus}, segments=${subtitlesSegmentsCount}.`
        : subtitles === "ready"
        ? `Sous-titres prets: status=${subtitlesStatus ?? draftStatus}, segments=${subtitlesSegmentsCount}.`
        : subtitles === "ignored"
          ? `Sous-titres ignores: status=${subtitlesStatus ?? draftStatus}.`
          : `Sous-titres non prets: status=${subtitlesStatus ?? draftStatus ?? "null"}.`,
      video: videoState === "pending"
        ? "Aucune video generee detectee."
        : `Video=${videoStatus ?? mediaPipelineStatus ?? draftStatus}.`,
      readyToPublish: readyToPublish === "validated"
        ? "content_drafts.status=ready_to_publish"
        : "Publication finale non validee.",
    },
    raw: {
      draftStatus,
      mediaPipelineStatus,
      visualStatus,
      visualsValidatedAt,
      voiceStatus,
      voiceAudioUrl,
      subtitlesStatus,
      subtitlesSegmentsCount,
      videoStatus,
      selectedAssetsCount,
      visualScenesCount: visualScenes.length,
      retainedVisualScenesCount: retainedScenesCount,
      requiredVisualCount: effectiveRequiredVisualCount,
    },
  };
}
